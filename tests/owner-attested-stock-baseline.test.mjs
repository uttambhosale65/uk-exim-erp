import test from "node:test";
import assert from "node:assert/strict";
import { createBaselineEvidence, EFFECTIVE_AT, parseStrictDevUrl, APPROVED_BASELINE } from "../scripts/stock/owner-attested-stock-baseline.mjs";

test("owner-approved cutover instant and independent stock pools are explicit", () => {
  assert.equal(EFFECTIVE_AT, "2026-11-06T00:00:00+05:30");
  assert.deepEqual(APPROVED_BASELINE.map(({ productCode, expectedStockBaseCode, currentStock }) => [productCode, expectedStockBaseCode, currentStock]), [
    ["P0006", "P0006", "79"], ["P0007", "P0007", "0"],
  ]);
});

test("only the exact local DEV URL is accepted", () => {
  assert.equal(parseStrictDevUrl("postgresql://user:secret@127.0.0.1:5432/uk_exim_erp_dev").pathname, "/uk_exim_erp_dev");
  for (const url of [
    "postgresql://user:secret@localhost:5432/uk_exim_erp_dev",
    "postgresql://user:secret@[::1]:5432/uk_exim_erp_dev",
    "postgresql://user:secret@127.0.0.2:5432/uk_exim_erp_dev",
    "postgresql://user:secret@127.0.0.1:5433/uk_exim_erp_dev",
    "postgresql://user:secret@127.0.0.1:5432/uk_exim_erp_test",
    "postgresql://user:secret@127.0.0.1:5432/uk_exim_erp_dev?host=remote.example",
  ]) assert.throws(() => parseStrictDevUrl(url));
});

test("baseline evidence marks quantities owner-attested and not a physical count", () => {
  const products = new Map([
    ["P0006", { name: "Loose Haldi" }],
    ["P0007", { name: "Dummy Product" }],
  ]);
  const evidence = createBaselineEvidence(products);
  assert.equal(evidence.evidence.provenance, "owner_attested_historical_stock");
  assert.equal(evidence.evidence.effectiveAt, EFFECTIVE_AT);
  assert.equal(evidence.evidence.products[0].productName, "Loose Haldi");
  assert.ok(evidence.evidence.notes.some((note) => note.includes("not represented as a physical count")));
  assert.match(evidence.sha256, /^[A-F0-9]{64}$/);
});
