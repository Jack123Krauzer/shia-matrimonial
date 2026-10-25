import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, API routes, and the auth page itself
  if (
    ['/', '/how-it-works', '/privacy', '/robots.txt', '/sitemap.xml', '/opengraph-image', '/twitter-image'].includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname === "/admin/login" ||
    pathname === "/favicon.svg" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get("sukoon_session")?.value;
  if (!sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === '/admin' || pathname.startsWith('/admin/') ? '/admin/login' : '/auth';
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.svg|favicon\\.ico).*)"],
};
