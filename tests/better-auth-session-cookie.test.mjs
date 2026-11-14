import assert from "node:assert/strict";
import test from "node:test";
import { readBetterAuthSessionCookie } from "../scripts/auth/better-auth-session-cookie.mjs";

test("reads Better Auth's default session cookie without logging its value", () => {
  const response = new Response(null, {
    headers: { "set-cookie": "better-auth.session_token=synthetic-token; Path=/; HttpOnly; SameSite=Lax" },
  });
  assert.equal(
    readBetterAuthSessionCookie(response, "http://127.0.0.1:3001"),
    "better-auth.session_token=synthetic-token",
  );
});

test("reads the secure-prefixed session cookie for HTTPS Better Auth origins", () => {
  const response = new Response(null, {
    headers: { "set-cookie": "__Secure-better-auth.session_token=synthetic-token; Path=/; Secure; HttpOnly" },
  });
  assert.equal(
    readBetterAuthSessionCookie(response, "https://erp.example.invalid"),
    "__Secure-better-auth.session_token=synthetic-token",
  );
});

test("rejects missing or unrelated cookies with names only in diagnostics", () => {
  const response = new Response(null, {
    headers: { "set-cookie": "better-auth.session_data=private-value; Path=/" },
  });
  assert.throws(
    () => readBetterAuthSessionCookie(response, "http://127.0.0.1:3001"),
    (error) => {
      assert.equal(error.code, "SESSION_COOKIE_MISSING");
      assert.equal(error.expectedCookieName, "better-auth.session_token");
      assert.deepEqual(error.receivedCookieNames, ["better-auth.session_data"]);
      assert.doesNotMatch(error.message, /private-value/);
      return true;
    },
  );
});
