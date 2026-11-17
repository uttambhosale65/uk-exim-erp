import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createCustomerDAL } from "../app/customer/server/customer-dal.mjs";
import { createSupplierDAL } from "../app/supplier/server/supplier-dal.mjs";
import { createProductDAL } from "../app/product/server/product-dal.mjs";
import { createTradeDAL } from "../app/transactions/server/trade-dal.mjs";
import { createSettlementDAL } from "../app/transactions/server/settlement-dal.mjs";
import { createExportDAL } from "../app/international/export/server/export-dal.mjs";

const owner = async () => ({ company: { company_id: "synthetic-company" } });

function fakeDatabase() {
  const statements = [];
  return {
    statements,
    async query(sql, params) {
      statements.push({ sql, params });
      if (sql.includes("AS next_code")) return { rows: [{ next_code: "C0001" }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    async connect() {
      return { query: async () => ({ rows: [], rowCount: 0 }), release() {} };
    },
  };
}

test("master and register lists sort newly entered records first", async () => {
  const cases = [
    ["products", createProductDAL, (dal) => dal.listProducts(), /ORDER BY NULLIF\(to_jsonb\(products\)->>'created_at'/],
    ["customers", createCustomerDAL, (dal) => dal.listCustomers(), /ORDER BY NULLIF\(to_jsonb\(customers\)->>'created_at'/],
    ["suppliers", createSupplierDAL, (dal) => dal.listSuppliers(), /ORDER BY NULLIF\(to_jsonb\(suppliers\)->>'created_at'/],
    ["purchases", (args) => createTradeDAL(args), (dal) => dal.list("purchase"), /ORDER BY created_at DESC NULLS LAST/],
    ["sales", (args) => createTradeDAL(args), (dal) => dal.list("sale"), /ORDER BY created_on DESC NULLS LAST/],
    ["receipts", createSettlementDAL, (dal) => dal.list("receipt"), /ORDER BY created_at DESC/],
    ["export documents", createExportDAL, (dal) => dal.listDocuments("quotation"), /ORDER BY created_at DESC/],
    ["export customers", createExportDAL, (dal) => dal.listCustomers(), /ORDER BY created_at DESC/],
  ];

  for (const [label, factory, list, expectedOrder] of cases) {
    const database = fakeDatabase();
    const dal = factory({ getOwnerContext: owner, database });
    await list(dal);
    assert.match(database.statements[0].sql, expectedOrder, `${label} query should sort by entry time`);
  }
});

test("entry-order migration keeps legacy master timestamps unknown and sortable last", async () => {
  const migration = await readFile(new URL("../db/migrations/015_newest_first_entry_order.sql", import.meta.url), "utf8");
  assert.equal((migration.match(/ADD COLUMN created_at timestamptz;/g) ?? []).length, 3);
  assert.equal((migration.match(/ALTER COLUMN created_at SET DEFAULT now\(\);/g) ?? []).length, 3);
  assert.doesNotMatch(migration, /UPDATE\s+public\.(products|customers|suppliers)/i);
  assert.match(migration, /products_company_created_idx/);
  assert.match(migration, /customers_company_created_idx/);
  assert.match(migration, /suppliers_company_created_idx/);
});

test("purchase and sales tables trust API newest-first order without reversing it", async () => {
  const purchase = await readFile(new URL("../app/components/customer/purchase/PurchaseTable.tsx", import.meta.url), "utf8");
  const sales = await readFile(new URL("../app/components/customer/sales/SalesTable.tsx", import.meta.url), "utf8");
  const ordering = await readFile(new URL("../app/transactions/client/entry-order.ts", import.meta.url), "utf8");
  assert.match(purchase, /sortEntriesNewestFirst\(purchases, "purchaseDate", "purchaseNo"\)/);
  assert.match(sales, /sortEntriesNewestFirst\(sales, "salesDate", "salesNo"\)/);
  assert.match(ordering, /rightTimestamp - leftTimestamp/);
  assert.match(ordering, /rightDate\.localeCompare\(leftDate\)/);
  assert.doesNotMatch(purchase, /purchases\]\.reverse\(\)/);
  assert.doesNotMatch(sales, /sales\]\.reverse\(\)/);
});
