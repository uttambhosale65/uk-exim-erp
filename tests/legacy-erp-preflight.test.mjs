import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createFullErpBackup, FULL_BACKUP_KEYS } from "../tools/legacy-product-exporter/export-core.mjs";
import { ENTITY_MIGRATION_MAP, reconcileFullBackup } from "../scripts/migration/legacy-erp-preflight.mjs";

async function syntheticBackup(values = new Map()) {
  return createFullErpBackup({ getItem: (key) => values.get(key) ?? null }, {
    origin: "http://localhost:3000",
    timestamp: "2026-11-13T00:00:00.000Z",
    cryptoProvider: webcrypto,
  });
}

test("preflight enumerates all backup keys and never claims a full migration is ready", async () => {
  const backup = await syntheticBackup(new Map([
    ["uk-exim-products", JSON.stringify([{ id: "synthetic-id", code: "SYN-1" }])],
    ["uk-exim-customers", "[]"],
  ]));
  const report = reconcileFullBackup(backup);
  assert.equal(report.mode, "read-only-source-preflight");
  assert.equal(report.databaseConnection, "not-performed");
  assert.equal(report.writesPerformed, false);
  assert.equal(report.keys.length, 24);
  assert.equal(report.ready, false);
  assert.ok(report.blockers.includes("products:reported-seven-dev-products-must-be-read-only-reconciled-and-never-reinserted"));
  assert.ok(report.blockers.includes("target-dev-database-not-connected-or-queried-by-this-db-free-preflight"));
});

test("missing and invalid keys are surfaced rather than silently dropped", async () => {
  const backup = await syntheticBackup(new Map([
    ["uk-exim-products", "[{broken"],
  ]));
  const report = reconcileFullBackup(backup);
  const product = report.keys.find((entry) => entry.key === "uk-exim-products");
  const customer = report.keys.find((entry) => entry.key === "uk-exim-customers");
  assert.equal(product.present, true);
  assert.equal(product.parsed, false);
  assert.ok(report.blockers.includes("uk-exim-products:invalid-json-preserved-but-not-importable"));
  assert.equal(customer.present, false);
  assert.ok(report.blockers.includes("uk-exim-customers:source-key-missing"));
});

test("preflight verifies raw checksums and catches duplicate source IDs and codes", async () => {
  const backup = await syntheticBackup(new Map([
    ["uk-exim-customers", JSON.stringify([
      { id: "same", code: "C-1" },
      { id: "same", code: "C-1" },
    ])],
  ]));
  backup.keys["uk-exim-customers"].sha256 = createHash("sha256").update("tampered").digest("hex");
  const report = reconcileFullBackup(backup);
  assert.ok(report.blockers.includes("uk-exim-customers:raw-value-checksum-mismatch"));
  assert.ok(report.blockers.includes("uk-exim-customers:duplicate-source-id-at-row-2"));
  assert.ok(report.blockers.includes("uk-exim-customers:duplicate-source-code-at-row-2"));
});

test("mapping explicitly reports missing schemas and known product no-reinsert guard", () => {
  assert.equal(ENTITY_MIGRATION_MAP["uk-exim-products"].status, "already-migrated-read-only-verification-required");
  assert.equal(ENTITY_MIGRATION_MAP["uk-exim-export-orders"].targets.length, 0);
  assert.equal(ENTITY_MIGRATION_MAP["uk-exim-stock-movement-journal-v1"].targets.length, 0);
  assert.deepEqual(Object.keys(ENTITY_MIGRATION_MAP).sort(), [...FULL_BACKUP_KEYS].sort());
});

test("CLI refuses --apply without importing database or opening a connection", () => {
  const result = spawnSync(process.execPath, ["scripts/migration/legacy-erp-preflight.mjs", "--apply"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--apply is not implemented/);
  assert.doesNotMatch(result.stdout + result.stderr, /DATABASE_URL|Client\(|INSERT INTO|UPDATE .* SET|DELETE FROM/);
});
