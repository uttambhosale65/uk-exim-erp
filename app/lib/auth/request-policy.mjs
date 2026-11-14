const SENSITIVE_LOGIN_QUERY_KEY = /^(?:password|passwd|pass|pwd|token|access_token|refresh_token|secret|credential|authorization|api[-_]?key)$/i;

export function isOwnerPasswordChangeRequest(request) {
  if (request?.method?.toUpperCase() !== "POST") return false;
  try {
    return new URL(request.url).pathname.endsWith("/api/auth/change-password");
  } catch {
    return false;
  }
}

export function isSameOriginRequest(request) {
  try {
    const origin = request.headers.get("origin");
    return Boolean(origin) && new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function hasSensitiveLoginQuery(method, pathname, searchParams) {
  if (method?.toUpperCase() !== "GET" || pathname !== "/login") return false;
  for (const key of searchParams.keys()) {
    if (SENSITIVE_LOGIN_QUERY_KEY.test(key)) return true;
  }
  return false;
}

export async function rejectUnownedPasswordChange(request, getOwnerContext) {
  if (!isOwnerPasswordChangeRequest(request)) return null;
  const headers = { "Cache-Control": "no-store, private", Pragma: "no-cache" };
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Cross-origin password changes are not allowed." }, { status: 403, headers });
  }
  if (!await getOwnerContext()) {
    return Response.json({ error: "An authenticated company owner is required." }, { status: 401, headers });
  }
  return null;
}
