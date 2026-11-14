import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function migration(name) { return readFile(path.join(root, "db", "migrations", name), "utf8"); }

test("settlement migration prerequisites enforce company-unique partner codes", async () => {
  const customers = await migration("003_customer_master.sql");
  const suppliers = await migration("004_supplier_master.sql");
  assert.match(customers, /CREATE UNIQUE INDEX customers_company_code_uidx\s+ON public\.customers\(company_id, code\)/i);
  assert.match(suppliers, /CREATE UNIQUE INDEX suppliers_company_code_uidx\s+ON public\.suppliers\(company_id, code\)/i);
});

test("settlement migration has company-scoped invoice references and allocation guards", async () => {
  const sql = await migration("013_settlement_ledger.sql");
  assert.match(sql, /FOREIGN KEY \(company_id, customer_code\)\s+REFERENCES public\.customers\(company_id, code\)/i);
  assert.match(sql, /FOREIGN KEY \(company_id, supplier_code\)\s+REFERENCES public\.suppliers\(company_id, code\)/i);
  assert.match(sql, /FOREIGN KEY \(company_id, sales_id\)\s+REFERENCES public\.sales\(company_id, id\)/i);
  assert.match(sql, /FOREIGN KEY \(company_id, purchase_id\)\s+REFERENCES public\.purchases\(company_id, id\)/i);
  assert.match(sql, /historical_imported THEN\s+RAISE EXCEPTION 'Historical invoice balance is unverified; allocation is blocked'/i);
  assert.match(sql, /FOR UPDATE/);
});

test("settlement ledger retains immutable headers and allocations with void-only changes", async () => {
  const sql = await migration("013_settlement_ledger.sql");
  assert.match(sql, /SETTLEMENT ENTRIES ARE IMMUTABLE; ONLY A ONE-WAY VOID IS ALLOWED/i);
  assert.match(sql, /Settlement allocations are immutable/i);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON public\.customer_receipts/i);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON public\.supplier_payments/i);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON public\.customer_receipt_allocations/i);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON public\.supplier_payment_allocations/i);
});

test("migration is additive and does not rewrite historical settlement data", async () => {
  const sql = await migration("013_settlement_ledger.sql");
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE)\s+(TABLE|INDEX|COLUMN)\b/i);
  assert.doesNotMatch(sql, /\bUPDATE\s+public\.(sales|purchases|customers|suppliers)\b/i);
  assert.match(sql, /Historical imports stay balance-unverified/);
});
