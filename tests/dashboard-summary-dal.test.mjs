import test from "node:test";
import assert from "node:assert/strict";
import { createDashboardSummaryDAL } from "../app/dashboard/dashboard-summary-dal.mjs";

test("dashboard summary uses the authenticated company and returns scoped totals", async () => {
  const calls = [];
  const dal = createDashboardSummaryDAL({
    getOwnerContext: async () => ({ company: { company_id: "company-a" } }),
    database: { query: async (sql, params) => { calls.push({ sql, params }); return calls.length === 1 ? { rows: [{ table_name: "purchases" }, { table_name: "sales" }] } : calls.length === 2 ? { rows: [{ supplierCount: 2, purchaseTotal: "100.00", salesTotal: "50.00", pendingSalesCount: 1, monthlyPurchaseTotal: "80.00", monthlySalesTotal: "40.00", monthlyGstSalesTotal: "25.00", monthlyNonGstSalesTotal: "15.00", pendingSales: [{ invoiceTotal: "20.00" }] }] } : { rows: [{ month: "2026-11", openingTotal: "79", purchaseTotal: "0", salesTotal: "0", closingTotal: "79" }] }; } },
  });
  const summary = await dal.getSummary({ year: 2026, month: 11 });
  assert.equal(summary.supplierCount, 2);
  assert.equal(summary.purchaseTotal, "100.00");
  assert.equal(summary.pendingSalesCount, 1);
  assert.equal(summary.monthlyGstSalesTotal, "25.00");
  assert.equal(summary.monthlyNonGstSalesTotal, "15.00");
  assert.equal("pendingPaymentTotal" in summary, false);
  assert.equal(summary.monthlyStock[0].closingTotal, "79");
  assert.deepEqual(calls[1].params, ["company-a", 2026, 11]);
  assert.equal((calls[1].sql.match(/company_id=\$1/g) || []).length, 9);
  assert.match(calls[1].sql,/deleted_at IS NULL/);
  assert.deepEqual(calls[2].params, ["company-a"]);
  assert.match(calls[2].sql,/effective_at/);
  assert.match(calls[2].sql,/e\.company_id=\$1/);
  assert.match(calls[2].sql,/stock_movement_events/);
});

test("dashboard supports the pre-soft-delete transaction schema without assuming migration 005", async () => {
  const calls = [];
  const dal = createDashboardSummaryDAL({
    getOwnerContext: async () => ({ company: { company_id: "company-a" } }),
    database: { query: async (sql, params) => { calls.push({ sql, params }); return calls.length === 1 ? { rows: [] } : calls.length === 2 ? { rows: [{ supplierCount: 0, purchaseTotal: "0", salesTotal: "0", pendingSalesCount: 0, monthlyPurchaseTotal: "0", monthlySalesTotal: "0", monthlyGstSalesTotal: "0", monthlyNonGstSalesTotal: "0", pendingSales: [] }] } : { rows: [] }; } },
  });
  await dal.getSummary({ year: 2026, month: 11 });
  assert.doesNotMatch(calls[1].sql,/deleted_at/);
  assert.deepEqual(calls[2].params,["company-a"]);
});

test("dashboard summary refuses missing owner context before database query", async () => {
  let queried = false;
  const dal = createDashboardSummaryDAL({ getOwnerContext: async () => null, database: { query: async () => { queried = true; return { rows: [] }; } } });
  await assert.rejects(dal.getSummary({ year: 2026, month: 11 }), { code: "UNAUTHENTICATED" });
  assert.equal(queried, false);
});

test("dashboard summary rejects invalid reporting periods", async () => {
  let queried = false;
  const dal = createDashboardSummaryDAL({ getOwnerContext: async () => ({ company: { company_id: "a" } }), database: { query: async () => { queried = true; return { rows: [] }; } } });
  await assert.rejects(dal.getSummary({ year: 2026, month: 13 }), { code: "INVALID_QUERY" });
  assert.equal(queried, false);
});
