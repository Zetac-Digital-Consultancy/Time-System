import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";
import { dashboardPath } from "@/lib/access-policy";

declare module "next-auth" {
  interface User {
    role: Role; companyId: string | null; sessionVersion: number; mustChangePassword: boolean;
  }
  interface Session {
    user: {
      id: string; email: string; name: string; role: Role;
      companyId: string | null; sessionVersion: number; mustChangePassword: boolean;
    };
  }
}
declare module "@auth/core/jwt" {
  interface JWT {
    id: string; role: Role; companyId: string | null;
    sessionVersion: number; mustChangePassword: boolean;
  }
}
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  useSecureCookies: (process.env.AUTH_URL ?? "").startsWith("https://"),
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (!auth?.user) return Response.redirect(new URL("/login", request.nextUrl));
      const home = dashboardPath(auth.user.role);
      if (auth.user.mustChangePassword && path !== "/account/password") {
        return Response.redirect(new URL("/account/password", request.nextUrl));
      }
      if (path === "/" ||
        (path.startsWith("/platform") && auth.user.role !== "PLATFORM_ADMIN") ||
        (path.startsWith("/admin") && auth.user.role !== "ADMIN") ||
        (path.startsWith("/employee") && auth.user.role !== "EMPLOYEE")) {
        return Response.redirect(new URL(home, request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.companyId = user.companyId;
        token.sessionVersion = user.sessionVersion;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.companyId = token.companyId;
      session.user.sessionVersion = token.sessionVersion;
      session.user.mustChangePassword = token.mustChangePassword;
      return session;
    },
  },
} satisfies NextAuthConfig;
