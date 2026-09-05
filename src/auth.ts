import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { logAuthError, logAuthEvent } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { accountIsActive, sessionIsCurrent } from "@/lib/access-policy";
import { consumeAttempt } from "@/lib/login-limiter";
import { decryptMfa, validMfaStep } from "@/lib/mfa";
import { randomBytes } from "node:crypto";

const dummyPasswordHash = bcrypt.hashSync(randomBytes(32).toString("hex"), 12);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt(args) {
      const token = authConfig.callbacks.jwt(args);
      const current = await prisma.user.findUnique({ where: { id: token.id }, include: { company: true } });
      if (!current || !sessionIsCurrent(token, current)) return null;
      token.mustChangePassword = current.mustChangePassword;
      return token;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
        otp: { label: "Authenticator-Code", type: "text" },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            logAuthEvent("login.failed", { reason: "invalid_input" });
            return null;
          }

          const email = parsed.data.email.toLowerCase();
          if (!(await consumeAttempt("login:global", 300, 60)) || !(await consumeAttempt(`login:${email}`))) return null;
          const user = await prisma.user.findUnique({ where: { email }, include: { company: true } });

          const isValid = await bcrypt.compare(parsed.data.password, user?.password ?? dummyPasswordHash);
          if (!user) {
            logAuthEvent("login.failed", { reason: "user_not_found", email });
            return null;
          }

          if (!accountIsActive(user)) {
            logAuthEvent("login.failed", { reason: "inactive_account", email, userId: user.id });
            return null;
          }

          if (!isValid) {
            logAuthEvent("login.failed", { reason: "invalid_password", email, userId: user.id });
            return null;
          }

          if (user.role === "PLATFORM_ADMIN") {
            if (!user.mfaSecret) return null;
            const step = validMfaStep(decryptMfa(user.mfaSecret), parsed.data.otp ?? "");
            if (step === null) return null;
            const used = await prisma.user.updateMany({
              where: { id: user.id, mfaLastStep: { lt: step } }, data: { mfaLastStep: step },
            });
            if (used.count !== 1) return null;
          }

          logAuthEvent("login.success", { email, userId: user.id, role: user.role });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
            sessionVersion: user.sessionVersion,
            mustChangePassword: user.mustChangePassword,
          };
        } catch (error) {
          logAuthError("login.error", error);
          return null;
        }
      },
    }),
  ],
});
