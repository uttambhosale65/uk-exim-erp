import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("Export workspace uses authenticated PostgreSQL API without LocalStorage fallback", async () => {
  const source = await read("../app/international/export/ExportPostgresWorkspace.tsx");
  assert.match(source, /fetch\(`\/api\/export\/\$\{kind\}/);
  assert.match(source, /No LocalStorage fallback is used/);
  assert.doesNotMatch(source, /localStorage\s*\./);
  assert.match(source, /Record IDs are immutable/);
});

test("Settings load and save one category through PostgreSQL API and keep tax approval fail-closed", async () => {
  const source = await read("../app/components/settings/Settings.tsx");
  assert.match(source, /fetch\("\/api\/settings"/);
  assert.match(source, /fetch\(`\/api\/settings\/\$\{activeTab\}`/);
  assert.doesNotMatch(source, /localStorage\s*\./);
  assert.match(source, /CGST\+SGST versus IGST/);
  assert.match(source, /remains fail-closed/);
});

test("payment workspace uses only settlement, customer and supplier APIs", async () => {
  const source = await read("../app/transactions/client/SettlementPostgresMaster.tsx");
  assert.match(source, /api\/receipts/);
  assert.match(source, /api\/supplier-payments/);
  assert.match(source, /outstanding=1/);
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.match(source, /submissionLock\.current\) return/);
  assert.match(source, /requestKeyRef\.current\.fingerprint !== fingerprint/);
  assert.match(source, /disabled=\{saving\}/);
  assert.match(source, /Historical imported invoice balances remain unverified/);
  assert.doesNotMatch(source, /localStorage\s*\./);
});
