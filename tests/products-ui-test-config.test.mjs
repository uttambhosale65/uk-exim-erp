import "../scripts/db/env.mjs";
import assert from "node:assert/strict";
import pg from "pg";
import test from "node:test";
import {
  parseProductsUiE2EDatabaseUrl,
  parseProductsUiTestDatabaseUrl,
  resolveProductsUiDatabaseTarget,
  verifyProductsUiTestDatabase,
} from "../app/lib/db/products-ui-test.mjs";

const validTestUrl = "postgresql://synthetic:placeholder@127.0.0.1:5432/uk_exim_erp_test";
const flag = "UKEXIM_PRODUCTS_UI_TEST_MODE";
const e2eFlag = "UKEXIM_E2E_DISPOSABLE_MODE";
const e2eName = "uk_exim_erp_e2e_disposable_20261114091530_a1b2c3d4";

test("normal mode keeps the existing development database selection", () => {
  assert.deepEqual(resolveProductsUiDatabaseTarget({
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://user:pw@127.0.0.1:5432/uk_exim_erp_dev",
  }), { mode: "development" });
});

test("test mode selects TEST_DATABASE_URL and never falls back to DATABASE_URL", () => {
  assert.deepEqual(resolveProductsUiDatabaseTarget({
    [flag]: "1",
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://user:pw@127.0.0.1:5432/uk_exim_erp_dev",
    TEST_DATABASE_URL: validTestUrl,
  }), { mode: "products-ui-test", connectionString: validTestUrl });
  assert.throws(() => resolveProductsUiDatabaseTarget({
    [flag]: "1",
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://user:pw@127.0.0.1:5432/uk_exim_erp_dev",
  }), /TEST_DATABASE_URL is required/);
});

test("test mode rejects production and malformed flag values", () => {
  assert.throws(() => resolveProductsUiDatabaseTarget({
    [flag]: "1", NODE_ENV: "production", TEST_DATABASE_URL: validTestUrl,
  }), /explicit development/);
  assert.throws(() => resolveProductsUiDatabaseTarget({
    [flag]: "true", NODE_ENV: "development", TEST_DATABASE_URL: validTestUrl,
  }), /flag must be exactly/);
});

test("disposable E2E mode requires both explicit TEST flags and an active run manifest", () => {
  assert.throws(() => resolveProductsUiDatabaseTarget({
    NODE_ENV: "development", [e2eFlag]: "1", UKEXIM_E2E_DATABASE_NAME: e2eName,
    UKEXIM_E2E_RUN_ID: "20261114091530_a1b2c3d4",
    UKEXIM_E2E_DATABASE_URL: `postgresql://user:pw@127.0.0.1:5432/${e2eName}`,
  }), /also requires explicit Products UI TEST mode/);
  assert.throws(() => resolveProductsUiDatabaseTarget({
    NODE_ENV: "development", [flag]: "1", [e2eFlag]: "1",
    UKEXIM_E2E_DATABASE_NAME: e2eName, UKEXIM_E2E_RUN_ID: "20261114091530_a1b2c3d4",
    UKEXIM_E2E_DATABASE_URL: `postgresql://user:pw@127.0.0.1:5432/${e2eName}`,
  }), /active disposable E2E run manifest/);
  assert.throws(() => resolveProductsUiDatabaseTarget({
    NODE_ENV: "production", [flag]: "1", [e2eFlag]: "1",
  }), /explicit development/);
  assert.throws(() => resolveProductsUiDatabaseTarget({
    NODE_ENV: "development", [flag]: "1", [e2eFlag]: "true",
  }), /must be exactly/);
});

test("disposable E2E URL parser accepts only exact unique-prefix loopback targets", () => {
  const exact = `postgresql://user:pw@127.0.0.1:5432/${e2eName}`;
  assert.equal(parseProductsUiE2EDatabaseUrl(exact, e2eName).pathname, `/${e2eName}`);
  for (const [url, name] of [
    [`postgresql://user:pw@localhost:5432/${e2eName}`, e2eName],
    [`postgresql://user:pw@127.0.0.1:5433/${e2eName}`, e2eName],
    ["postgresql://user:pw@127.0.0.1:5432/uk_exim_erp_dev", "uk_exim_erp_dev"],
    [`postgresql://user:pw@127.0.0.1:5432/${e2eName}?host=192.0.2.1`, e2eName],
  ]) assert.throws(() => parseProductsUiE2EDatabaseUrl(url, name), /Disposable E2E/);
});

test("only the exact IPv4 loopback test database URL is accepted", () => {
  assert.equal(parseProductsUiTestDatabaseUrl(validTestUrl).pathname, "/uk_exim_erp_test");
  for (const invalid of [
    "postgresql://user:pw@localhost:5432/uk_exim_erp_test",
    "postgresql://user:pw@[::1]:5432/uk_exim_erp_test",
    "postgresql://user:pw@192.0.2.10:5432/uk_exim_erp_test",
    "postgresql://user:pw@127.0.0.1:5433/uk_exim_erp_test",
    "postgresql://user:pw@127.0.0.1:5432/uk_exim_erp_dev",
  ]) {
    assert.throws(() => parseProductsUiTestDatabaseUrl(invalid), /require exactly/);
  }
  assert.throws(() => parseProductsUiTestDatabaseUrl(undefined), /TEST_DATABASE_URL is required/);
});

test("connected database identity must match address, port and database", async () => {
  const accepted = {
    query: async () => ({ rows: [{ address: "127.0.0.1", port: 5432, database: "uk_exim_erp_test" }] }),
  };
  await verifyProductsUiTestDatabase(accepted);
  for (const row of [
    { address: "192.0.2.10", port: 5432, database: "uk_exim_erp_test" },
    { address: "127.0.0.1", port: 5433, database: "uk_exim_erp_test" },
    { address: "127.0.0.1", port: 5432, database: "uk_exim_erp_dev" },
  ]) {
    await assert.rejects(
      verifyProductsUiTestDatabase({ query: async () => ({ rows: [row] }) }),
      /not 127.0.0.1:5432\/uk_exim_erp_test/,
    );
  }
});

test("actual TEST_DATABASE_URL server identity is read-only and exact", async () => {
  const url = parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  const pool = new pg.Pool({ connectionString: url.toString(), max: 1 });
  const client = await pool.connect();
  try {
    await verifyProductsUiTestDatabase(client);
    const result = await client.query("SELECT version() AS version");
    assert.match(result.rows[0].version, /^PostgreSQL 18\./);
  } finally {
    client.release();
    await pool.end();
  }
});
