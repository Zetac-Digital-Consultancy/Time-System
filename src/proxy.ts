import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse, type NextRequest, type NextFetchEvent, type NextMiddleware } from "next/server";
const forward: NextMiddleware = () => NextResponse.next();
const authenticate = NextAuth(authConfig).auth(forward);
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Auth.js protects its own credential endpoints with CSRF tokens.
    if (!request.nextUrl.pathname.startsWith("/api/auth/") &&
      !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const expected = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).origin : request.nextUrl.origin;
      if (request.headers.get("origin") !== expected) return NextResponse.json({ error: "Ungültiger Ursprung" }, { status: 403 });
    }
    return NextResponse.next();
  }
  return authenticate(request, event);
}
export const config = {
  matcher: ["/", "/admin/:path*", "/employee/:path*", "/platform/:path*", "/account/:path*", "/api/:path*"],
};
