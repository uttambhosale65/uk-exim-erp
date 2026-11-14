import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  hasSensitiveLoginQuery,
  isOwnerPasswordChangeRequest,
  rejectUnownedPasswordChange,
} from "../app/lib/auth/request-policy.mjs";

const origin = "http://localhost:3000";

test("only the Better Auth change-password POST is owner-gated", () => {
  assert.equal(isOwnerPasswordChangeRequest(new Request(`${origin}/api/auth/change-password`, { method: "POST" })), true);
  assert.equal(isOwnerPasswordChangeRequest(new Request(`${origin}/api/auth/change-password`, { method: "GET" })), false);
  assert.equal(isOwnerPasswordChangeRequest(new Request(`${origin}/api/auth/sign-in/username`, { method: "POST" })), false);
});

test("cross-origin password change is rejected before owner lookup", async () => {
  let ownerLookups = 0;
  const request = new Request(`${origin}/api/auth/change-password`, {
    method: "POST",
    headers: { origin: "http://127.0.0.1:3000" },
  });
  const response = await rejectUnownedPasswordChange(request, async () => { ownerLookups += 1; return {}; });
  assert.equal(response.status, 403);
  assert.equal(ownerLookups, 0);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
});

test("password change requires an owner session and allows an authorized owner", async () => {
  const request = new Request(`${origin}/api/auth/change-password`, { method: "POST", headers: { origin } });
  const denied = await rejectUnownedPasswordChange(request, async () => null);
  assert.equal(denied.status, 401);
  assert.deepEqual(await denied.json(), { error: "An authenticated company owner is required." });
  assert.equal(await rejectUnownedPasswordChange(request, async () => ({ company: { company_id: "synthetic" } })), null);
});

test("login redirects away from sensitive query keys without reflecting their values", () => {
  const query = new URLSearchParams("next=%2Fdashboard&password=not-for-logs&credential=not-for-logs");
  assert.equal(hasSensitiveLoginQuery("GET", "/login", query), true);
  assert.equal(hasSensitiveLoginQuery("POST", "/login", query), false);
  assert.equal(hasSensitiveLoginQuery("GET", "/api/auth/change-password", query), false);
});

test("password form uses Better Auth current-password flow, confirms input, and never logs secrets", async () => {
  const source = await readFile(new URL("../app/components/auth/PasswordChangeForm.tsx", import.meta.url), "utf8");
  assert.match(source, /authClient\.changePassword\(/);
  assert.match(source, /currentPassword,\s*newPassword,\s*revokeOtherSessions:\s*true/);
  assert.match(source, /newPassword !== confirmation/);
  assert.match(source, /minLength=\{12\}/);
  assert.doesNotMatch(source, /console\.(?:log|error|warn)|URLSearchParams|window\.location/);
});

test("logout only navigates after Better Auth confirms server sign-out", async () => {
  const source = await readFile(new URL("../app/components/auth/LogoutButton.tsx", import.meta.url), "utf8");
  assert.match(source, /const result = await authClient\.signOut\(\)/);
  assert.match(source, /if \(result\.error\)[\s\S]*?return;/);
  assert.match(source, /window\.location\.replace\("\/login"\)/);
});

test("auth session policy preserves bounded expiry, refresh, fresh-auth, and secure cookies", async () => {
  const source = await readFile(new URL("../app/lib/auth/factory.mjs", import.meta.url), "utf8");
  assert.match(source, /expiresIn:\s*60\s*\*\s*60\s*\*\s*12/);
  assert.match(source, /updateAge:\s*60\s*\*\s*60/);
  assert.match(source, /freshAge:\s*60\s*\*\s*5/);
  assert.match(source, /httpOnly:\s*true/);
  assert.match(source, /sameSite:\s*"lax"/);
  assert.match(source, /secure:\s*secureCookies/);
});
