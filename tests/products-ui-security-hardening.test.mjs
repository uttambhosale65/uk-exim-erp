import assert from "node:assert/strict";
import test from "node:test";
import {
  createSharedDatabaseTargetResolver,
  parseProductsUiTestDatabaseUrl,
  resolveProductsUiDatabaseTarget,
  verifyProductsUiTestDatabase,
} from "../app/lib/db/products-ui-test.mjs";

const flag = "UKEXIM_PRODUCTS_UI_TEST_MODE";
const validUrl = "postgresql://synthetic:placeholder@127.0.0.1:5432/uk_exim_erp_test";

test("the exact local test URL is accepted and its effective pg target is validated", () => {
  const parsed = parseProductsUiTestDatabaseUrl(validUrl);
  assert.equal(parsed.hostname, "127.0.0.1");
  assert.equal(parsed.port, "5432");
  assert.equal(parsed.pathname, "/uk_exim_erp_test");
});

test("test URL parser rejects overrides, multi-host/port values, fragments and invalid targets", () => {
  for (const invalid of [
    "postgres://u:p@127.0.0.1:5432/uk_exim_erp_test?host=192.0.2.77",
    "postgres://u:p@127.0.0.1:5432/uk_exim_erp_test?port=6432",
    "postgres://u:p@127.0.0.1:5432/uk_exim_erp_test?host=192.0.2.77&port=6432",
    "postgres://u:p@127.0.0.1:5432/uk_exim_erp_test?host=127.0.0.1,192.0.2.77",
    "postgres://u:p@127.0.0.1:5432/uk_exim_erp_test?port=5432,6432",
    "postgres://u:p@127.0.0.1:5432/uk_exim_erp_test#alternate",
    "postgres://u:p@127.0.0.1:5432/uk_exim_erp_%74est",
    "not a postgres URL",
    "postgres://u:p@127.0.0.1:5432/uk_exim_erp_dev",
    "postgres://u:p@localhost:5432/uk_exim_erp_test",
    "postgres://u:p@192.0.2.77:5432/uk_exim_erp_test",
    "postgres://u:p@127.0.0.1:6432/uk_exim_erp_test",
    "postgres://u:p@127.0.0.1,192.0.2.77:5432/uk_exim_erp_test",
  ]) {
    assert.throws(() => parseProductsUiTestDatabaseUrl(invalid));
  }
});

test("test mode requires explicit development and leaves ordinary development selection intact", () => {
  const target = { [flag]: "1", TEST_DATABASE_URL: validUrl };
  assert.equal(resolveProductsUiDatabaseTarget({ ...target, NODE_ENV: "development" }).mode, "products-ui-test");
  for (const nodeEnv of [undefined, "test", "production"]) {
    assert.throws(() => resolveProductsUiDatabaseTarget({ ...target, NODE_ENV: nodeEnv }), /explicit development/);
  }
  assert.deepEqual(resolveProductsUiDatabaseTarget({ NODE_ENV: "development" }), { mode: "development" });
  assert.deepEqual(resolveProductsUiDatabaseTarget({ NODE_ENV: "test" }), { mode: "development" });
});

test("database target is resolved once and shared immutably by both pools", () => {
  let resolutionCount = 0;
  let activeConnectionString = validUrl;
  const getTarget = createSharedDatabaseTargetResolver(() => {
    resolutionCount += 1;
    return { mode: "products-ui-test", connectionString: activeConnectionString };
  }, () => "postgres://127.0.0.1/uk_exim_erp_dev");
  const firstPoolTarget = getTarget();
  activeConnectionString = "postgres://127.0.0.1:5432/uk_exim_erp_dev";
  const secondPoolTarget = getTarget();
  assert.equal(firstPoolTarget, secondPoolTarget);
  assert.equal(firstPoolTarget.connectionString, validUrl);
  assert.equal(resolutionCount, 1);
  assert.equal(Object.isFrozen(firstPoolTarget), true);
});

test("connected database identity guard rejects mismatches", async () => {
  await verifyProductsUiTestDatabase({
    query: async () => ({ rows: [{ address: "127.0.0.1", port: 5432, database: "uk_exim_erp_test" }] }),
  });
  for (const row of [
    { address: "192.0.2.77", port: 5432, database: "uk_exim_erp_test" },
    { address: "127.0.0.1", port: 6432, database: "uk_exim_erp_test" },
    { address: "127.0.0.1", port: 5432, database: "uk_exim_erp_dev" },
  ]) {
    await assert.rejects(verifyProductsUiTestDatabase({ query: async () => ({ rows: [row] }) }));
  }
});
