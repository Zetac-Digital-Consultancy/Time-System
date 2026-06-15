import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";
import { logAuthEvent } from "@/lib/auth-logger";

declare module "next-auth" {
  interface User {
    role: Role;
    id: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

function getDashboardPath(role: Role | undefined) {
  return role === "ADMIN" ? "/admin/dashboard" : "/employee/dashboard";
}

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;

      const isAuthPage = pathname === "/login";
      const isAdminRoute = pathname.startsWith("/admin");
      const isEmployeeRoute = pathname.startsWith("/employee");
      const isProtectedRoute = isAdminRoute || isEmployeeRoute;

      if (isAuthPage && isLoggedIn) {
        const url = getDashboardPath(role);
        logAuthEvent("middleware.redirect.authenticated_from_login", { role, url });
        return Response.redirect(new URL(url, request.nextUrl));
      }

      if (!isLoggedIn && (isProtectedRoute || pathname === "/")) {
        logAuthEvent("middleware.redirect.unauthenticated", { pathname });
        return Response.redirect(new URL("/login", request.nextUrl));
      }

      if (isLoggedIn && isAdminRoute && role && role !== "ADMIN") {
        logAuthEvent("middleware.redirect.wrong_role", { pathname, role, target: "/employee/dashboard" });
        return Response.redirect(new URL("/employee/dashboard", request.nextUrl));
      }

      if (isLoggedIn && isEmployeeRoute && role && role !== "EMPLOYEE") {
        logAuthEvent("middleware.redirect.wrong_role", { pathname, role, target: "/admin/dashboard" });
        return Response.redirect(new URL("/admin/dashboard", request.nextUrl));
      }

      if (pathname === "/" && isLoggedIn) {
        const url = getDashboardPath(role);
        logAuthEvent("middleware.redirect.root", { role, url });
        return Response.redirect(new URL(url, request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        logAuthEvent("jwt.created", { userId: user.id, role: user.role });
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
