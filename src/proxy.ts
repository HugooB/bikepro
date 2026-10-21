import { NextResponse, type NextRequest } from "next/server";

// First line of defence only: sends visitors without a session cookie to the sign-in page.
// Whether the session is real (and who it belongs to) is checked by every page and server
// action through requireUser().

const SESSION_COOKIE = "bikepro_session";
const PUBLIC_PATHS = ["/login", "/register", "/api/health"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's own assets and static files.
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|ico|webmanifest)$).*)"],
};
