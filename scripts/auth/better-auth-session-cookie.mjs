export function readBetterAuthSessionCookie(response, baseURL) {
  const securePrefix = baseURL.startsWith("https://") ? "__Secure-" : "";
  const expectedName = `${securePrefix}better-auth.session_token`;
  const setCookieLines = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie") || ""];
  const entries = setCookieLines.map((line) => {
    const pair = line.split(";", 1)[0].trim();
    const separator = pair.indexOf("=");
    return separator > 0
      ? { name: pair.slice(0, separator).trim(), value: pair.slice(separator + 1).trim() }
      : null;
  }).filter(Boolean);
  const session = entries.find((entry) => entry.name === expectedName && entry.value.length > 0);
  if (!session) {
    const error = new Error("Better Auth session cookie was not present in the login response.");
    error.code = "SESSION_COOKIE_MISSING";
    error.expectedCookieName = expectedName;
    error.receivedCookieNames = entries.map(({ name }) => name);
    throw error;
  }
  return `${session.name}=${session.value}`;
}
