import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { shouldRedirectToLogin } from "./app/lib/auth/proxy-policy.mjs";
import { hasSensitiveLoginQuery } from "./app/lib/auth/request-policy.mjs";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, private, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (hasSensitiveLoginQuery(request.method, pathname, request.nextUrl.searchParams)) {
    return noStore(NextResponse.redirect(new URL("/login", request.url), 303));
  }
  if (!shouldRedirectToLogin(pathname)) {
    return NextResponse.next();
  }

  if (!getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    return noStore(NextResponse.redirect(loginUrl));
  }

  return noStore(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
