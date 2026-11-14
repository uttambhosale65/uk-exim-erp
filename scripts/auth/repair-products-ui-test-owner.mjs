import "../db/env.mjs";
import pg, { Pool } from "pg";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { readBetterAuthSessionCookie } from "./better-auth-session-cookie.mjs";
import { createAuthInstance } from "../../app/lib/auth/factory.mjs";
import { resolveOwnerContext } from "../../app/lib/auth/authorization.mjs";
import { parseProductsUiTestDatabaseUrl, PRODUCTS_UI_TEST_COMPANY_NAME, verifyProductsUiTestDatabase } from "../../app/lib/db/products-ui-test.mjs";
import { readProductsUiFixtureManifest } from "../../app/product/server/products-ui-test-manifest.mjs";

if (process.env.NODE_ENV !== "development" || process.env.UKEXIM_PRODUCTS_UI_TEST_MODE !== "1") {
  throw new Error("Synthetic owner repair requires explicit development TEST mode.");
}
if (!process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) throw new Error("Local Better Auth settings are required.");
const password = process.env.UKEXIM_TEST_OWNER_PASSWORD;
if (typeof password !== "string" || password.length < 12 || password.length > 128) {
  throw new Error("A 12–128 character synthetic-only password must be entered through the masked local prompt.");
}
const target = parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL).toString();
const manifest = await readProductsUiFixtureManifest();
if (manifest.database !== "uk_exim_erp_test" || manifest.status !== "ready"
  || manifest.companyName !== PRODUCTS_UI_TEST_COMPANY_NAME
  || !manifest.username?.startsWith("synthetic_") || !manifest.userEmail?.endsWith("@example.invalid")) {
  throw new Error("The exact ready synthetic TEST owner manifest was not verified.");
}
const client = new pg.Client({ connectionString: target });
let invalidatedSessions = 0;
try {
  await client.connect();
  await verifyProductsUiTestDatabase(client);
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(571015520, 271833)");
  const company = await client.query("SELECT id FROM public.companies WHERE id=$1 AND name=$2", [manifest.companyId, PRODUCTS_UI_TEST_COMPANY_NAME]);
  if (company.rowCount !== 1) throw new Error("Synthetic TEST company identity did not match the manifest.");
  const user = await client.query('SELECT id FROM auth."user" WHERE id=$1 AND username=$2 AND email=$3 FOR UPDATE', [manifest.userId, manifest.username, manifest.userEmail]);
  if (user.rowCount !== 1) throw new Error("Synthetic TEST owner identity did not match the manifest.");
  const membership = await client.query("SELECT role FROM auth.company_memberships WHERE user_id=$1 AND company_id=$2 FOR UPDATE", [manifest.userId, manifest.companyId]);
  if (membership.rowCount !== 1 || membership.rows[0].role !== "owner") throw new Error("Synthetic TEST owner membership is missing or has the wrong role.");
  const account = await client.query(`SELECT id,password FROM auth."account"
    WHERE "userId"=$1 AND "providerId"='credential' FOR UPDATE`, [manifest.userId]);
  if (account.rowCount !== 1 || typeof account.rows[0].password !== "string" || !account.rows[0].password) {
    throw new Error("Exactly one credential account with an existing hash is required for the synthetic TEST owner.");
  }
  const newHash = await hashPassword(password);
  if (!await verifyPassword({ hash: newHash, password })) throw new Error("Better Auth password hash self-verification failed.");
  const updated = await client.query('UPDATE auth."account" SET password=$1 WHERE id=$2 AND "userId"=$3 AND "providerId"=\'credential\' RETURNING id', [newHash, account.rows[0].id, manifest.userId]);
  if (updated.rowCount !== 1) throw new Error("Synthetic credential update did not affect exactly one account.");
  const sessions = await client.query('DELETE FROM auth."session" WHERE "userId"=$1 RETURNING id', [manifest.userId]);
  invalidatedSessions = sessions.rowCount;
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}

const database = new Pool({ connectionString: target, options: "-c search_path=auth,public", max: 2 });
const auth = createAuthInstance({ database, secret: process.env.BETTER_AUTH_SECRET, baseURL: process.env.BETTER_AUTH_URL });
async function authRequest(path, method = "GET", body, cookie) {
  const headers = new Headers({ origin: process.env.BETTER_AUTH_URL });
  if (body !== undefined) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  return auth.handler(new Request(new URL(`/api/auth${path}`, process.env.BETTER_AUTH_URL), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
}
let currentStage = "login";
let responseStatus;
let responseContentType;
let cookieNames = [];
let currentSessionCookie = null;
async function clearSyntheticOwnerSessionsAfterFailure() {
  const cleanupClient = new pg.Client({ connectionString: target });
  try {
    await cleanupClient.connect();
    await verifyProductsUiTestDatabase(cleanupClient);
    await cleanupClient.query("BEGIN");
    await cleanupClient.query("SELECT pg_advisory_xact_lock(571015520, 271833)");
    const owner = await cleanupClient.query(`SELECT count(*)::int AS matches
      FROM auth."user" u
      JOIN auth.company_memberships m ON m.user_id=u.id AND m.company_id=$2 AND m.role='owner'
      JOIN public.companies c ON c.id=m.company_id AND c.name=$5
      WHERE u.id=$1 AND u.username=$3 AND u.email=$4`,
    [manifest.userId, manifest.companyId, manifest.username, manifest.userEmail, PRODUCTS_UI_TEST_COMPANY_NAME]);
    if (owner.rows[0]?.matches !== 1) throw new Error("Synthetic TEST owner identity changed before session recovery.");
    const deleted = await cleanupClient.query('DELETE FROM auth."session" WHERE "userId"=$1 RETURNING id', [manifest.userId]);
    await cleanupClient.query("COMMIT");
    return deleted.rowCount;
  } catch (error) {
    await cleanupClient.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await cleanupClient.end();
  }
}
try {
  const login = await authRequest("/sign-in/username", "POST", { username: manifest.username, password });
  responseStatus = login.status;
  responseContentType = login.headers.get("content-type") || null;
  cookieNames = (typeof login.headers.getSetCookie === "function" ? login.headers.getSetCookie() : [login.headers.get("set-cookie") || ""])
    .map((line) => line.split(";", 1)[0].split("=", 1)[0].trim())
    .filter(Boolean);
  if (login.status !== 200) {
    const error = new Error("Better Auth rejected the synthetic TEST owner login.");
    error.code = "LOGIN_REJECTED";
    throw error;
  }
  currentStage = "session_cookie";
  currentSessionCookie = readBetterAuthSessionCookie(login, process.env.BETTER_AUTH_URL);
  currentStage = "session_retrieval";
  const sessionResponse = await authRequest("/get-session", "GET", undefined, currentSessionCookie);
  responseStatus = sessionResponse.status;
  responseContentType = sessionResponse.headers.get("content-type") || null;
  const session = await sessionResponse.json();
  if (!sessionResponse.ok || session?.user?.id !== manifest.userId || !session?.session?.id) {
    const error = new Error("Authenticated session did not resolve to the manifest TEST owner.");
    error.code = "SESSION_RETRIEVAL_FAILED";
    throw error;
  }
  currentStage = "owner_authorization";
  const ownerContext = await resolveOwnerContext(database, session, PRODUCTS_UI_TEST_COMPANY_NAME);
  if (ownerContext?.company?.company_id !== manifest.companyId || ownerContext?.company?.role !== "owner") {
    const error = new Error("Authenticated owner was not authorized for the manifest TEST company.");
    error.code = "OWNER_AUTHORIZATION_FAILED";
    throw error;
  }
  currentStage = "logout";
  const logout = await authRequest("/sign-out", "POST", {}, currentSessionCookie);
  responseStatus = logout.status;
  responseContentType = logout.headers.get("content-type") || null;
  if (!logout.ok) {
    const error = new Error("Better Auth logout did not succeed.");
    error.code = "LOGOUT_FAILED";
    throw error;
  }
  currentStage = "session_invalidation";
  const afterLogout = await authRequest("/get-session", "GET", undefined, currentSessionCookie);
  responseStatus = afterLogout.status;
  responseContentType = afterLogout.headers.get("content-type") || null;
  const invalidated = await afterLogout.json();
  if (!afterLogout.ok || invalidated?.user?.id) {
    const error = new Error("The session remained valid after logout.");
    error.code = "SESSION_INVALIDATION_FAILED";
    throw error;
  }
  console.log(JSON.stringify({ database: "uk_exim_erp_test", ownerMatchesManifest: true, ownerRoleAuthorized: true, passwordStoredAsHash: true, previousSessionsInvalidated: invalidatedSessions, syntheticLogin: "PASS", sessionRetrieval: "PASS", logout: "PASS", sessionInvalidation: "PASS", credentialsPersisted: false }, null, 2));
} catch (error) {
  let recoveredSessionCount;
  try {
    recoveredSessionCount = await clearSyntheticOwnerSessionsAfterFailure();
  } catch {
    recoveredSessionCount = null;
  }
  const report = {
    database: "uk_exim_erp_test",
    stage: currentStage,
    failureCode: typeof error?.code === "string" ? error.code : "UNEXPECTED_AUTH_VERIFICATION_ERROR",
    errorName: error?.name === "Error" ? "Error" : "UnexpectedError",
    ...(Number.isInteger(responseStatus) ? { httpStatus: responseStatus } : {}),
    ...(responseContentType ? { contentType: responseContentType } : {}),
    ...(cookieNames.length ? { setCookieNames: cookieNames } : {}),
    ...(error?.expectedCookieName ? { expectedCookieName: error.expectedCookieName } : {}),
    ...(error?.receivedCookieNames ? { receivedCookieNames: error.receivedCookieNames } : {}),
    ...(recoveredSessionCount === null ? { syntheticOwnerSessionRecovery: "FAILED" } : { syntheticOwnerSessionsCleared: recoveredSessionCount }),
    passwordOrTokenValuesLogged: false,
  };
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  await database.end();
}
