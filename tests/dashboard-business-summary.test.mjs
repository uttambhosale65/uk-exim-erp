import test from "node:test";
import assert from "node:assert/strict";
import { createDashboardBusinessSummaryDAL } from "../app/dashboard/business-summary-dal.mjs";

test("business summary returns company-scoped export and settlement totals", async () => {
  const calls = [];
  const dal = createDashboardBusinessSummaryDAL({
    getOwnerContext: async () => ({ company: { company_id: "company-test" } }),
    database: { query: async (sql, params) => {
      calls.push({ sql, params });
      if (calls.length === 1) return { rows: [{ export_customers: true, export_documents: true, customer_receipts: true, supplier_payments: true }] };
      if (calls.length === 2) return { rows: [{ customers: 0, customer_review_required: 66, enquiries: 0, quotations: 0, proformas: 0, orders: 0, purchases: 0, reservations: 0, packings: 0, shipments: 0, invoices: 0, reviewRequired: 14 }] };
      if (calls.length === 3) return { rows: [{ count: 0, review_required: 2 }] };
      return { rows: [{ receipts_total: "20.00", receipt_count: 1, supplier_payments_total: "30.00", supplier_payment_count: 2, verified_receivables: "0", verified_payables: "4.00" }] };
    } },
  });
  const result = await dal.getSummary();
  assert.equal(result.exports.customers, 0);
  assert.equal(result.exports.customer_review_required, 66);
  assert.equal(result.exports.reviewRequired, 14);
  assert.equal(result.exports.stock, 0);
  assert.equal(result.exports.stockReviewRequired, 2);
  assert.equal(result.payments.receipts_total, "20.00");
  assert.equal(result.payments.verified_receivables, "0");
  assert.deepEqual(calls.slice(1).map(call => call.params), [["company-test"], ["company-test"], ["company-test"]]);
  assert.match(calls[1].sql, /review_status='owner_verified'/);
  assert.match(calls[2].sql, /review_status='review_required'/);
  assert.match(calls[3].sql, /NOT i\.historical_imported/);
  assert.match(calls[3].sql, /voided_at IS NULL/);
});

test("business summary marks pending migration groups unavailable instead of zero", async () => {
  const dal = createDashboardBusinessSummaryDAL({
    getOwnerContext: async () => ({ company: { company_id: "company-test" } }),
    database: { query: async () => ({ rows: [{ export_customers: false, export_documents: false, customer_receipts: false, supplier_payments: false }] }) },
  });
  assert.deepEqual(await dal.getSummary(), { exports: { status: "schema_pending" }, payments: { status: "schema_pending" } });
});

test("business summary requires authenticated company context before database access", async () => {
  let queried = false;
  const dal = createDashboardBusinessSummaryDAL({ getOwnerContext: async () => null, database: { query: async () => { queried = true; return { rows: [] }; } } });
  await assert.rejects(dal.getSummary(), { code: "UNAUTHENTICATED" });
  assert.equal(queried, false);
});
