import test from "node:test";
import assert from "node:assert/strict";
import {
  DOCUMENT_DEFINITIONS, OWNER_REVIEW_IDS, SETTINGS_DEFINITIONS,
  buildPhase9Plan, rawObjectField, splitJsonArrayRaw, verifySourceHash,
} from "../scripts/migration/phase9-import-plan.mjs";

function makeBackup() {
  const keys = {};
  const put = (key, value) => { keys[key] = { exists: true, parseSucceeded: true, raw: JSON.stringify(value) }; };
  const customers = Array.from({ length: 66 }, (_, i) => ({ id: `cust-${i}`, code: `C-${i}`, name: `Export ${i}`, status: "Active", custom: { keep: true } }));
  const docs = new Map();
  for (const [key, kind, number, date] of DOCUMENT_DEFINITIONS) {
    const count = kind === "enquiry" || kind === "shipment" || kind === "commercial_invoice" ? 1 : kind === "quotation" || kind === "proforma_invoice" || kind === "order" || kind === "purchase" || kind === "reservation" ? 2 : 1;
    docs.set(kind, Array.from({ length: count }, (_, i) => ({ id: `${kind}-${i}`, [number]: `${kind.toUpperCase()}-${i}`, [date]: "2026-10-01", currency: "USD", status: "Draft", customerCode: "C-0", ...(kind === "quotation" ? { enquiryNo: "ENQUIRY-0" } : {}), sourceOnly: { exact: true } })));
    put(key, docs.get(kind));
  }
  for (const id of OWNER_REVIEW_IDS) {
    const [key, kind] = DOCUMENT_DEFINITIONS.find(([, k]) => docs.get(k)?.some(row => row.id === id)) ?? [];
    if (key && kind) docs.get(kind)[0].id = id;
  }
  for (const [key, kind] of DOCUMENT_DEFINITIONS) put(key, docs.get(kind));
  for (const [key, kind] of SETTINGS_DEFINITIONS) put(key, { settingKey: kind, original: "keep" });
  put("uk-exim-export-customers", customers);
  put("uk-exim-international-export-stock", [
    { id: "stock-1", productCode: "EX-P1", lotBatchNo: "L1", availableQty: 0.050, reservedQty: 0, packedQty: 0, loadedQty: 0, shippedQty: 0, unit: "KG", source: "Opening Stock" },
    { id: "stock-2", productCode: "EX-P2", lotBatchNo: "L2", availableQty: 1, reservedQty: 0, packedQty: 0, loadedQty: 0, shippedQty: 0, unit: "KG", source: "Purchase", purchaseReference: "PURCHASE-0" },
  ]);
  return { format: "UK-EXIM-ERP-FULL-RAW-BACKUP", formatVersion: 1, keyCount: 24, keys };
}

test("raw JSON helpers preserve numeric lexemes and nested objects", () => {
  const raw = '[{"qty":0.0500,"memo":"a,\\\"b","nested":{"n":2}},"text"]';
  const slices = splitJsonArrayRaw(raw);
  assert.equal(slices[0], '{"qty":0.0500,"memo":"a,\\\"b","nested":{"n":2}}');
  assert.equal(rawObjectField(slices[0], "qty"), "0.0500");
  assert.equal(rawObjectField(slices[0], "nested"), '{"n":2}');
  assert.equal(slices[1], '"text"');
});

test("phase 9 plan counts all export source records and settings", () => {
  const plan = buildPhase9Plan(makeBackup());
  assert.deepEqual(plan.sourceCounts, { customers: 66, documents: 14, stock: 2, settings: 4 });
  assert.equal(plan.directReviewCount, 0); // Synthetic fixture deliberately has no owner-review IDs.
  assert.equal(plan.reviewCount, 82);
  assert.equal(plan.unresolvedReferences, 0);
});

test("source-only authenticity is kept in review state and customer/doc references resolve", () => {
  const plan = buildPhase9Plan(makeBackup());
  assert.ok(plan.customers.every(item => item.reviewStatus === "review_required"));
  assert.ok(plan.documents.every(item => item.reviewStatus === "review_required"));
  const quotation = plan.docs.get("quotation")[0];
  assert.ok(quotation.references.some(ref => ref.field === "enquiryNo" && ref.target.record.id === "enquiry-0"));
  assert.ok(quotation.references.some(ref => ref.field === "customerCode" && ref.target.record.id === "cust-0"));
});

test("invalid source count, duplicate source IDs, and invalid numeric values fail closed", () => {
  const backup = makeBackup();
  backup.keys["uk-exim-export-customers"].raw = JSON.stringify([]);
  assert.throws(() => buildPhase9Plan(backup), /Unexpected source count/);
  const duplicate = makeBackup();
  const rows = JSON.parse(duplicate.keys["uk-exim-export-customers"].raw); rows[1].id = rows[0].id; duplicate.keys["uk-exim-export-customers"].raw = JSON.stringify(rows);
  assert.throws(() => buildPhase9Plan(duplicate), /Duplicate source identifier/);
  const badNumber = makeBackup(); const stock = JSON.parse(badNumber.keys["uk-exim-international-export-stock"].raw); stock[0].availableQty = -1; badNumber.keys["uk-exim-international-export-stock"].raw = JSON.stringify(stock);
  assert.throws(() => buildPhase9Plan(badNumber), /quantity is invalid/);
});

test("backup checksum helper returns deterministic uppercase SHA-256", () => {
  assert.equal(verifySourceHash("fixture"), verifySourceHash("fixture"));
  assert.match(verifySourceHash("fixture"), /^[A-F0-9]{64}$/);
});
