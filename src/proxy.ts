import { NextResponse, type NextRequest } from "next/server";

// Runs before every page and API route:
// - Sends visitors without a session cookie to the sign-in page. That's a first line of
//   defence only: whether the session is real (and who it belongs to) is checked by every page
//   and server action through requireUser().
// - Sets the Content Security Policy, with a fresh nonce that Next.js adds to its own scripts,
//   and HSTS when BikePro runs on HTTPS. The other security headers are in next.config.ts.

const SESSION_COOKIE = "bikepro_session";
const PUBLIC_PATHS = ["/login", "/register", "/api/health"];

function contentSecurityPolicy(nonce: string, https: boolean) {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // Development needs eval for React's debugging tools.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Style attributes (Radix positioning, bike colors) can't carry a nonce.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // Development also needs the hot-reload websocket.
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const https = process.env.APP_URL?.startsWith("https://") ?? false;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, https);

  let response: NextResponse;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic || request.cookies.has(SESSION_COOKIE)) {
    // Next.js reads the nonce from the request's CSP header when it renders the page.
    const headers = new Headers(request.headers);
    headers.set("Content-Security-Policy", csp);
    response = NextResponse.next({ request: { headers } });
  } else {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(login);
  }

  response.headers.set("Content-Security-Policy", csp);
  if (https) response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}

export const config = {
  // Everything except Next's own assets and static files.
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|ico|webmanifest)$).*)"],
};
