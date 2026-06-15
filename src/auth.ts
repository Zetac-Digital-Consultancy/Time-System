import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { logAuthError, logAuthEvent } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            logAuthEvent("login.failed", { reason: "invalid_input" });
            return null;
          }

          const email = parsed.data.email.toLowerCase();
          const user = await prisma.user.findUnique({ where: { email } });

          if (!user) {
            logAuthEvent("login.failed", { reason: "user_not_found", email });
            return null;
          }

          if (user.status !== "ACTIVE") {
            logAuthEvent("login.failed", { reason: "inactive_account", email, userId: user.id });
            return null;
          }

          const isValid = await bcrypt.compare(parsed.data.password, user.password);
          if (!isValid) {
            logAuthEvent("login.failed", { reason: "invalid_password", email, userId: user.id });
            return null;
          }

          logAuthEvent("login.success", { email, userId: user.id, role: user.role });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          logAuthError("login.error", error);
          return null;
        }
      },
    }),
  ],
});
