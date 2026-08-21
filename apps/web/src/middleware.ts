import { type NextRequest, NextResponse } from "next/server";

const protectedRoots = ["/account", "/trade", "/agent", "/admin"];

export function middleware(request: NextRequest) {
  const isProtected = protectedRoots.some(
    (root) => request.nextUrl.pathname === root || request.nextUrl.pathname.startsWith(`${root}/`),
  );

  if (!isProtected || request.cookies.has("gj_access")) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/account/:path*", "/trade/:path*", "/agent/:path*", "/admin/:path*"],
};
