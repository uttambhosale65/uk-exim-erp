import assert from "node:assert/strict";
import test from "node:test";
import { shouldRedirectToLogin } from "../app/lib/auth/proxy-policy.mjs";
import { hasSensitiveLoginQuery } from "../app/lib/auth/request-policy.mjs";

test("Proxy leaves API authentication to route handlers so API callers receive JSON", () => {
  assert.equal(shouldRedirectToLogin("/api/customers"), false);
  assert.equal(shouldRedirectToLogin("/api/customers/count"), false);
  assert.equal(shouldRedirectToLogin("/api/auth/sign-in/username"), false);
  assert.equal(shouldRedirectToLogin("/login"), false);
  assert.equal(shouldRedirectToLogin("/customer"), true);
  assert.equal(shouldRedirectToLogin("/erp"), true);
});

test("sensitive values on the login URL are stripped instead of being retained", () => {
  assert.equal(hasSensitiveLoginQuery("GET", "/login", new URLSearchParams("password=secret")), true);
  assert.equal(hasSensitiveLoginQuery("GET", "/login", new URLSearchParams("next=%2Fdashboard")), false);
});
