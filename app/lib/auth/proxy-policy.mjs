export function shouldRedirectToLogin(pathname) {
  return pathname !== "/login" && pathname !== "/api" && !pathname.startsWith("/api/");
}
