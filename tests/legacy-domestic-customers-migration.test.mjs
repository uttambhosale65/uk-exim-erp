import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  EXPECTED_SHA256,
  SOURCE_FILE,
  inspectBackup,
  parseStrictDevelopmentUrl,
} from "../scripts/customers/legacy-domestic-customers-migration.mjs";

test("legacy Domestic Customer source checksum and 39-record contract verify without database access", async () => {
  const raw = await readFile(SOURCE_FILE, "utf8");
  const result = inspectBackup(raw);
  assert.equal(result.backupSha256, EXPECTED_SHA256);
  assert.equal(result.sourceCount, 39);
  assert.equal(result.customers.length, 39);
  assert.equal(result.customers.some((customer) => Object.hasOwn(customer, "exportCustomer")), false);
});

test("customer importer URL accepts only explicit local DEV host, port and database", () => {
  const valid = parseStrictDevelopmentUrl("postgresql://user:password@127.0.0.1:5432/uk_exim_erp_dev");
  assert.equal(valid.hostname, "127.0.0.1");
  assert.equal(valid.port, "5432");
  assert.throws(() => parseStrictDevelopmentUrl("postgresql://user:password@localhost:5432/uk_exim_erp_dev"));
  assert.throws(() => parseStrictDevelopmentUrl("postgresql://user:password@127.0.0.1:5433/uk_exim_erp_dev"));
  assert.throws(() => parseStrictDevelopmentUrl("postgresql://user:password@127.0.0.1:5432/uk_exim_erp_test"));
  assert.throws(() => parseStrictDevelopmentUrl("postgresql://user:password@203.0.113.2:5432/uk_exim_erp_dev"));
});
