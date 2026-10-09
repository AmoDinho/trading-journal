import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const publicPaths = new Set(["/login", "/signup"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  const isPublic = publicPaths.has(pathname);

  if (!sessionCookie && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (sessionCookie && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
