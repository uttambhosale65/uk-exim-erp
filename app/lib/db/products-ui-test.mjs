import { parseLocalPostgresUrl, verifyLocalPostgresConnection } from "./postgres-target.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";

export const PRODUCTS_UI_TEST_FLAG = "UKEXIM_PRODUCTS_UI_TEST_MODE";
export const PRODUCTS_UI_TEST_COMPANY_NAME = "SYNTHETIC PRODUCTS UI TEST COMPANY";
export const PRODUCTS_UI_E2E_FLAG = "UKEXIM_E2E_DISPOSABLE_MODE";
export const PRODUCTS_UI_E2E_DATABASE_PREFIX = "uk_exim_erp_e2e_disposable_";

const E2E_DATABASE_NAME = /^uk_exim_erp_e2e_disposable_\d{14}_[a-f0-9]{8}$/;
const E2E_RUN_ID = /^\d{14}_[a-f0-9]{8}$/;
const E2E_MANIFEST_PATH = path.resolve(process.cwd(), ".local-test", "e2e-disposable.json");

export function isProductsUiTestMode(env = process.env) {
  return env[PRODUCTS_UI_TEST_FLAG] === "1";
}

export function resolveProductsUiDatabaseTarget(env = process.env) {
  const flag = env[PRODUCTS_UI_TEST_FLAG];
  if (flag === undefined || flag === "0") {
    const e2eFlag = env[PRODUCTS_UI_E2E_FLAG];
    if (e2eFlag !== undefined && e2eFlag !== "0") {
      throw new Error("Disposable E2E mode also requires explicit Products UI TEST mode.");
    }
    return { mode: "development" };
  }
  if (flag !== "1") throw new Error("Products UI test mode flag must be exactly '1' or unset.");
  if (env.NODE_ENV !== "development") {
    throw new Error("Products UI test mode is available only in an explicit development environment.");
  }
  if (env[PRODUCTS_UI_E2E_FLAG] !== undefined && env[PRODUCTS_UI_E2E_FLAG] !== "1") {
    throw new Error("Disposable E2E mode flag must be exactly '1' or unset.");
  }
  if (env[PRODUCTS_UI_E2E_FLAG] === "1") {
    const manifest = readE2EManifest();
    const target = parseProductsUiE2EDatabaseUrl(env.UKEXIM_E2E_DATABASE_URL, env.UKEXIM_E2E_DATABASE_NAME);
    const runId = env.UKEXIM_E2E_RUN_ID;
    if (manifest.status !== "seeded" || manifest.databaseName !== env.UKEXIM_E2E_DATABASE_NAME
      || manifest.runId !== runId || !E2E_RUN_ID.test(runId || "")
      || manifest.sourceDatabase !== "uk_exim_erp_test") {
      throw new Error("Disposable E2E target does not match an active seeded TEST run manifest.");
    }
    return {
      mode: "products-ui-e2e-disposable",
      databaseName: manifest.databaseName,
      connectionString: target.toString(),
    };
  }
  return { mode: "products-ui-test", connectionString: parseProductsUiTestDatabaseUrl(env.TEST_DATABASE_URL).toString() };
}

export function createSharedDatabaseTargetResolver(resolveTarget, getDevelopmentUrl) {
  let target;
  return () => {
    if (!target) {
      const resolved = resolveTarget();
      target = Object.freeze({
        mode: resolved.mode,
        databaseName: resolved.databaseName,
        connectionString: resolved.mode === "products-ui-test"
          ? resolved.connectionString
          : resolved.mode === "products-ui-e2e-disposable"
            ? resolved.connectionString
            : getDevelopmentUrl(),
      });
    }
    return target;
  };
}

export function parseProductsUiTestDatabaseUrl(connectionString) {
  if (!connectionString) {
    throw new Error("TEST_DATABASE_URL is required in Products UI test mode.");
  }

  let url;
  try { url = parseLocalPostgresUrl(connectionString, "uk_exim_erp_test", "TEST_DATABASE_URL"); }
  catch { throw new Error("Products UI tests require exactly 127.0.0.1:5432/uk_exim_erp_test without URL overrides."); }
  return url;

  /*

  if (url.search || url.hash || connectionString.includes("?") || connectionString.includes("#")) {
    throw new Error("TEST_DATABASE_URL must not contain query parameters or a fragment.");
  }
  const databasePath = url.pathname;
  if (!(["postgres:", "postgresql:"].includes(url.protocol)
    && url.hostname === "127.0.0.1"
    && url.port === "5432"
    && databasePath === "/uk_exim_erp_test")) {
    throw new Error("Products UI tests require exactly 127.0.0.1:5432/uk_exim_erp_test.");
  }
  let effective;
  try {
    effective = pgConnectionString.parseIntoClientConfig(url.toString());
  } catch {
    throw new Error("TEST_DATABASE_URL contains unsupported PostgreSQL connection settings.");
  }
  if (effective.host !== "127.0.0.1"
    || Number(effective.port) !== 5432
    || effective.database !== "uk_exim_erp_test") {
    throw new Error("TEST_DATABASE_URL PostgreSQL connection target is not 127.0.0.1:5432/uk_exim_erp_test.");
  }
  return url;
  */
}

export function parseProductsUiE2EDatabaseUrl(connectionString, expectedDatabase) {
  if (typeof expectedDatabase !== "string" || !E2E_DATABASE_NAME.test(expectedDatabase)) {
    throw new Error("Disposable E2E database name is outside the unique TEST-only prefix and run-ID format.");
  }
  if (!connectionString) throw new Error("UKEXIM_E2E_DATABASE_URL is required in disposable E2E mode.");
  try { return parseLocalPostgresUrl(connectionString, expectedDatabase, "UKEXIM_E2E_DATABASE_URL"); }
  catch { throw new Error("Disposable E2E access requires exactly 127.0.0.1:5432 and the manifest-matched disposable database."); }
}

function readE2EManifest() {
  let manifest;
  try { manifest = JSON.parse(readFileSync(E2E_MANIFEST_PATH, "utf8")); }
  catch { throw new Error("A valid active disposable E2E run manifest is required."); }
  if (!manifest || typeof manifest !== "object" || manifest.version !== 1
    || manifest.status !== "seeded" || manifest.sourceDatabase !== "uk_exim_erp_test"
    || !E2E_DATABASE_NAME.test(manifest.databaseName || "") || !E2E_RUN_ID.test(manifest.runId || "")
    || manifest.databaseName !== `${PRODUCTS_UI_E2E_DATABASE_PREFIX}${manifest.runId}`) {
    throw new Error("Disposable E2E run manifest is invalid or inactive.");
  }
  return manifest;
}

export async function verifyProductsUiTestDatabase(client) {
  try { await verifyLocalPostgresConnection(client, "uk_exim_erp_test"); }
  catch { throw new Error("Connected database is not 127.0.0.1:5432/uk_exim_erp_test."); }
}

export async function verifyProductsUiTestPool(pool) {
  const client = await pool.connect();
  try {
    await verifyProductsUiTestDatabase(client);
  } finally {
    client.release();
  }
}

export async function verifyConfiguredProductsUiPool(pool, target) {
  const expected = target?.mode === "products-ui-e2e-disposable"
    ? target.databaseName
    : target?.mode === "products-ui-test" ? "uk_exim_erp_test" : "uk_exim_erp_dev";
  const client = await pool.connect();
  try {
    const identity = await verifyLocalPostgresConnection(client, expected);
    if (target?.mode === "products-ui-e2e-disposable" && identity.version !== "18.6") {
      throw new Error("Disposable E2E PostgreSQL must match the verified local 18.6 server.");
    }
  } finally { client.release(); }
}
