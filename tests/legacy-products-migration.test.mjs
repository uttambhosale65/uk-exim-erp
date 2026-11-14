import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildInsertValues,
  EXPECTED_CODES,
  inspectSource,
  parseStrictDevelopmentUrl,
  PRODUCT_COLUMNS,
} from "../scripts/products/legacy-products-migration.mjs";

function product(code, overrides = {}) {
  return {
    id: "699bc82f-58bc-4cbb-98bb-083fee9c9577",
    code,
    name: "  Turmeric ",
    category: "Spices",
    hsn: "09103030",
    gst: "5%",
    unit: "Pkt",
    netWeight: 50,
    stockBaseCode: "P0006",
    purchase: 10,
    sale: 25,
    mrp: 35,
    baseCost: 10,
    packingCost: 6,
    otherCharges: 5,
    totalCost: 21,
    stock: 0,
    minimumStock: 10,
    active: true,
    ...overrides,
  };
}

function sevenProducts() {
  return EXPECTED_CODES.map((code, index) => product(code, {
    id: `699bc82f-58bc-4cbb-98bb-${String(index).padStart(12, "0")}`,
    stockBaseCode: code === "P0007" ? "P0007" : code === "P0006" ? "P0006" : "P0006",
  }));
}

function validate(products) {
  const raw = JSON.stringify(products);
  return inspectSource(raw, createHash("sha256").update(raw).digest("hex").toUpperCase());
}

test("strict development URL accepts only the exact local DEV target", () => {
  assert.equal(parseStrictDevelopmentUrl("postgres://user:pass@127.0.0.1:5432/uk_exim_erp_dev").hostname, "127.0.0.1");
  for (const value of [
    "postgres://u:p@localhost:5432/uk_exim_erp_dev",
    "postgres://u:p@[::1]:5432/uk_exim_erp_dev",
    "postgres://u:p@192.168.1.5:5432/uk_exim_erp_dev",
    "postgres://u:p@127.0.0.1:5433/uk_exim_erp_dev",
    "postgres://u:p@127.0.0.1:5432/uk_exim_erp_test",
  ]) assert.throws(() => parseStrictDevelopmentUrl(value));
});

test("seven exact product rows validate without trimming or rewriting names", () => {
  const result = validate(sevenProducts());
  assert.equal(result.products.length, 7);
  assert.deepEqual(result.errors, []);
  assert.equal(result.products[0].name, "  Turmeric ");
});

test("source count, duplicate codes, unknown stock references, and unsupported fields are rejected", () => {
  assert.throws(() => validate(sevenProducts().slice(0, 6)), /exactly 7/);
  const duplicate = sevenProducts();
  duplicate[1].code = duplicate[0].code;
  assert.match(validate(duplicate).errors.join(" "), /duplicate source code/);
  const unknownReference = sevenProducts();
  unknownReference[0].stockBaseCode = "P9999";
  assert.match(validate(unknownReference).errors.join(" "), /has no source product/);
  const extraField = sevenProducts();
  extraField[0].unverified = true;
  assert.match(validate(extraField).errors.join(" "), /do not exactly match/);
});

test("insert mapping preserves all contract fields and exact text/numeric values", () => {
  const source = product("P0006", { name: "Turmeric Powder ", baseCost: 200, purchase: 300, stock: 70 });
  const values = buildInsertValues(source, "00000000-0000-4000-8000-000000000001");
  assert.deepEqual(PRODUCT_COLUMNS.map(([name]) => name), [
    "id", "company_id", "code", "name", "category", "hsn", "gst", "unit", "net_weight",
    "stock_base_code", "purchase", "sale", "mrp", "base_cost", "packing_cost", "other_charges",
    "total_cost", "stock", "minimum_stock", "active",
  ]);
  assert.equal(values[3], "Turmeric Powder ");
  assert.equal(values[12], "35");
  assert.equal(values[13], "200");
  assert.equal(values[17], "70");
});

test("migration SQL is insert-only and excludes stock ledger and transaction tables", async () => {
  const source = await readFile(new URL("../scripts/products/legacy-products-migration.mjs", import.meta.url), "utf8");
  assert.match(source, /INSERT INTO public\.products/);
  assert.doesNotMatch(source, /\b(?:UPDATE|DELETE FROM|TRUNCATE)\s+(?:public\.)?(?:products|stock_baselines|stock_movements|stock_movement_journal|purchases|sales)\b/i);
  assert.match(source, /SELECT id::text AS id, name FROM public\.companies WHERE name = \$1/);
  assert.match(source, /company: \{ id: company\.id, name: company\.name, companyRows: companyResult\.rowCount \}/);
  assert.doesNotMatch(source, /\ballCompanies\b/);
  assert.match(source, /if \(apply\) await client\.query\("BEGIN"\)/);
  assert.match(source, /else await client\.query\("BEGIN READ ONLY"\)/);
});
