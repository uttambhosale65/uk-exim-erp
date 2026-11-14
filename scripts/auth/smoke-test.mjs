import "../db/env.mjs";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import pg, { Pool } from "pg";
import { verifyPassword } from "better-auth/crypto";
import { createAuthInstance } from "../../app/lib/auth/factory.mjs";
import { resolveOwnerContext } from "../../app/lib/auth/authorization.mjs";
import { parseLocalDatabaseUrl, verifyLocalDatabaseConnection } from "../db/migrate-lib.mjs";
import { getProvisioningCompany } from "./provisioning-guard.mjs";

if (process.env.NODE_ENV === "production") {
  throw new Error("Synthetic authentication tests are disabled in production.");
}
if (!process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_SECRET and BETTER_AUTH_URL must be configured locally.");
}

const connectionUrl = parseLocalDatabaseUrl(process.env.TEST_DATABASE_URL, "uk_exim_erp_test");
const identityClient = new pg.Client({ connectionString: connectionUrl.toString() });
await identityClient.connect();
let identity;
try {
  identity = await verifyLocalDatabaseConnection(identityClient, "uk_exim_erp_test");
  if (identity.address !== "127.0.0.1" || identity.name !== "uk_exim_erp_test") {
    throw new Error("Synthetic authentication test target failed its localhost identity guard.");
  }
} finally {
  await identityClient.end();
}

const database = new Pool({
  connectionString: connectionUrl.toString(),
  options: "-c search_path=auth,public",
  max: 4,
});
const provisioningAuth = createAuthInstance({
  database,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  allowSignUp: true,
});
const publicAuth = createAuthInstance({
  database,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});

const companyId = randomUUID();
const username = `synthetic_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const email = `${username}@example.invalid`;
const password = randomBytes(32).toString("base64url");
const testIp = `198.51.100.${1 + (randomBytes(1)[0] % 253)}`;
let userId;
let companyCreated = false;

async function authRequest(instance, method, pathName, body, cookie, requestIp = testIp) {
  const headers = new Headers({
    origin: process.env.BETTER_AUTH_URL,
    "x-forwarded-for": requestIp,
  });
  if (body !== undefined) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  return instance.handler(new Request(new URL(`/api/auth${pathName}`, process.env.BETTER_AUTH_URL), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
}

function sessionCookie(response) {
  const cookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie") ?? ""];
  const cookie = cookies.find((value) => /(?:^|,\s*)[^=]*session_token=/.test(value));
  if (!cookie) throw new Error("Synthetic login did not return a session cookie.");
  const pair = cookie.split(";")[0];
  return pair.slice(pair.indexOf("=") + 1) ? pair : null;
}

async function assertNoExistingTestRows() {
  const counts = await database.query(
    `SELECT
       (SELECT count(*)::int FROM public.companies) AS companies,
       (SELECT count(*)::int FROM auth."user") AS users,
       (SELECT count(*)::int FROM auth."session") AS sessions,
       (SELECT count(*)::int FROM auth."account") AS accounts,
       (SELECT count(*)::int FROM auth.company_memberships) AS memberships,
       (SELECT count(*)::int FROM auth."rateLimit") AS rate_limits`,
  );
  assert.deepEqual(counts.rows[0], {
    companies: 0,
    users: 0,
    sessions: 0,
    accounts: 0,
    memberships: 0,
    rate_limits: 0,
  }, "Test database must be empty before adding synthetic authentication records.");
}

await assertNoExistingTestRows();

try {
  await database.query("INSERT INTO public.companies (id, name) VALUES ($1, $2)", [companyId, "UK EXIM ENTERPRISES"]);
  companyCreated = true;

  const publicSignup = await authRequest(publicAuth, "POST", "/sign-up/email", {
    name: "Blocked Synthetic Signup",
    email: `blocked-${username}@example.invalid`,
    username: `blocked_${username}`,
    password,
  });
  assert.equal(publicSignup.ok, false, "Public signup must be rejected.");

  const created = await provisioningAuth.api.signUpEmail({
    body: { name: "Synthetic Owner", email, username, password },
  });
  userId = created.user.id;

  const storedCredential = await database.query(
    `SELECT password FROM auth."account"
     WHERE "userId" = $1 AND "providerId" = 'credential'`,
    [userId],
  );
  assert.equal(storedCredential.rowCount, 1);
  assert.notEqual(storedCredential.rows[0].password, password);
  assert.equal(await verifyPassword({ hash: storedCredential.rows[0].password, password }), true);

  await assert.rejects(getProvisioningCompany(database), /already exists/);

  const unauthenticatedSession = await authRequest(publicAuth, "GET", "/get-session", undefined, undefined);
  assert.equal(unauthenticatedSession.ok, true);
  const unauthenticatedBody = await unauthenticatedSession.json();
  assert.ok(!unauthenticatedBody?.user && !unauthenticatedBody?.session, "Unauthenticated session must not authorize a dashboard.");
  assert.equal(await resolveOwnerContext(database, null), null);
  assert.equal(await resolveOwnerContext(database, { user: { id: userId } }), null, "A user without company membership must be denied.");

  await database.query(
    `INSERT INTO auth.company_memberships (company_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [companyId, userId],
  );
  const membershipContext = await resolveOwnerContext(database, { user: { id: userId, name: "Synthetic Owner" } });
  assert.equal(membershipContext?.company.company_name, "UK EXIM ENTERPRISES");
  assert.equal(membershipContext?.company.role, "owner");

  const validLogin = await authRequest(publicAuth, "POST", "/sign-in/username", { username, password });
  assert.equal(validLogin.status, 200, "Correct username/password should sign in.");
  const cookie = sessionCookie(validLogin);
  const setCookieLines = typeof validLogin.headers.getSetCookie === "function"
    ? validLogin.headers.getSetCookie()
    : [validLogin.headers.get("set-cookie") ?? ""];
  const mainCookie = setCookieLines.find((value) => value.includes("session_token=")) ?? "";
  assert.match(mainCookie, /httponly/i, "Session cookie must be HttpOnly.");
  assert.match(mainCookie, /samesite=lax/i, "Session cookie must use SameSite=Lax.");

  const firstSessionResponse = await authRequest(publicAuth, "GET", "/get-session", undefined, cookie);
  const firstSession = await firstSessionResponse.json();
  assert.equal(firstSession?.user?.id, userId, "Authenticated dashboard session should persist.");
  const ownerContext = await resolveOwnerContext(database, firstSession);
  assert.equal(ownerContext?.company.company_name, "UK EXIM ENTERPRISES", "Membership-authorized dashboard should be available.");
  const secondSessionResponse = await authRequest(publicAuth, "GET", "/get-session", undefined, cookie);
  assert.equal((await secondSessionResponse.json())?.user?.id, userId, "Session should persist across requests.");

  const invalidPassword = await authRequest(
    publicAuth,
    "POST",
    "/sign-in/username",
    { username, password: randomBytes(24).toString("base64url") },
    undefined,
    "198.51.100.20",
  );
  const unknownUsername = await authRequest(
    publicAuth,
    "POST",
    "/sign-in/username",
    { username: `unknown_${username}`, password },
    undefined,
    "198.51.100.21",
  );
  assert.equal(invalidPassword.ok, false, "Invalid password must be rejected.");
  assert.equal(unknownUsername.ok, false, "Unknown username must be rejected.");

  const logout = await authRequest(publicAuth, "POST", "/sign-out", {}, cookie);
  assert.equal(logout.ok, true, "Logout should complete successfully.");
  const invalidated = await authRequest(publicAuth, "GET", "/get-session", undefined, cookie);
  assert.ok(!(await invalidated.json())?.user, "Logged-out session must no longer authenticate.");

  await database.query('DELETE FROM auth."rateLimit"');
  let rateLimited;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    rateLimited = await authRequest(
      publicAuth,
      "POST",
      "/sign-in/username",
      { username: `rate_${username}`, password },
      undefined,
      "198.51.100.99",
    );
    if (rateLimited.status === 429) break;
  }
  assert.equal(rateLimited?.status, 429, "Repeated login attempts must be rate limited.");

  const migrationCount = await database.query("SELECT count(*)::int AS count FROM public._schema_migrations");
  assert.equal(migrationCount.rows[0].count, 2, "Both versioned migrations should be recorded in the test database.");

  const authTables = await database.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = $2 ORDER BY table_name",
    ["auth", "BASE TABLE"],
  );
  assert.deepEqual(authTables.rows.map((row) => row.table_name), [
    "account",
    "company_memberships",
    "rateLimit",
    "session",
    "user",
    "verification",
  ]);

  console.log("Synthetic Better Auth login, session, logout, signup denial, rate limit, membership, and schema isolation checks passed.");
} finally {
  if (userId) {
    await database.query('DELETE FROM auth."session" WHERE "userId" = $1', [userId]);
    await database.query('DELETE FROM auth."account" WHERE "userId" = $1', [userId]);
    await database.query("DELETE FROM auth.company_memberships WHERE user_id = $1", [userId]);
    await database.query('DELETE FROM auth."user" WHERE id = $1', [userId]);
  }
  await database.query('DELETE FROM auth."rateLimit"');
  if (companyCreated) await database.query("DELETE FROM public.companies WHERE id = $1", [companyId]);
  const left = await database.query(
    `SELECT
       (SELECT count(*)::int FROM public.companies) AS companies,
       (SELECT count(*)::int FROM auth."user") AS users,
       (SELECT count(*)::int FROM auth."session") AS sessions,
       (SELECT count(*)::int FROM auth."account") AS accounts,
       (SELECT count(*)::int FROM auth.company_memberships) AS memberships,
       (SELECT count(*)::int FROM auth."rateLimit") AS rate_limits`,
  );
  assert.deepEqual(left.rows[0], {
    companies: 0,
    users: 0,
    sessions: 0,
    accounts: 0,
    memberships: 0,
    rate_limits: 0,
  }, "Synthetic auth tests must leave the test database clean.");
  await database.end();
}
