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
      if (calls.length === 2) return { rows: [{ customers: 0, customer_review_required: 66, heuristicCustomerCount: 4, enquiries: 0, enquiriesReviewRequired: 1, quotations: 0, quotationsReviewRequired: 2, proformas: 0, proformasReviewRequired: 2, orders: 0, ordersReviewRequired: 2, purchases: 0, purchasesReviewRequired: 2, reservations: 0, reservationsReviewRequired: 2, packings: 0, packingsReviewRequired: 1, shipments: 0, shipmentsReviewRequired: 1, invoices: 0, invoicesReviewRequired: 1, heuristicDocumentCount: 5, reviewRequired: 14 }] };
      if (calls.length === 3) return { rows: [{ count: 0, review_required: 2, heuristic_review_required: 0 }] };
      if (calls.length === 4) return { rows: [{ document_kind: "quotation", available_count: 2, draft_count: 1, issued_count: 0, review_pending_count: 2 }] };
      return { rows: [{ receipts_total: "20.00", receipt_count: 1, supplier_payments_total: "30.00", supplier_payment_count: 2, verified_receivables: "0", verified_payables: "4.00" }] };
    } },
  });
  const result = await dal.getSummary();
  assert.equal(result.exports.customers, 0);
  assert.equal(result.exports.customer_review_required, 66);
  assert.equal(result.exports.reviewRequired, 14);
  assert.equal(result.exports.stock, 0);
  assert.equal(result.exports.stockReviewRequired, 2);
  assert.equal(result.exports.heuristicCustomerCount, 4);
  assert.equal(result.exports.heuristicDocumentCount, 5);
  assert.equal(result.exports.heuristicStockCount, 0);
  assert.equal(result.exports.enquiriesReviewRequired, 1);
  assert.deepEqual(result.exports.documentRegister, [{ kind: "quotation", availableCount: 2, draftCount: 1, issuedCount: 0, reviewPendingCount: 2, evidenceStatus: "not_tracked" }]);
  assert.equal(result.payments.receipts_total, "20.00");
  assert.equal(result.payments.verified_receivables, "0");
  assert.deepEqual(calls.slice(1).map(call => call.params), [["company-test", ["EXP-CUST-0002", "EXP-CUST-0003", "EXP-CUST-0004", "EXP-CUST-0005"], ["57003b1c-4ca5-4a7f-ba3b-106666973df6", "d1a2c139-d728-4fc1-bdde-144f65ab98b4", "0a232d05-a65f-4cc5-8682-e3317807d493", "shipment-1791371565322-va5llf", "8d66ccf8-1b78-4805-903c-9aa77823aeef"]], ["company-test", []], ["company-test"], ["company-test"]]);
  assert.match(calls[1].sql, /review_status='owner_verified'/);
  assert.match(calls[1].sql, /heuristicDocumentCount/);
  assert.match(calls[1].sql, /AS "heuristicCustomerCount"/);
  assert.match(calls[1].sql, /AS "enquiriesReviewRequired"/);
  assert.match(calls[1].sql, /document_kind='enquiry' AND review_status='review_required'/);
  assert.match(calls[2].sql, /review_status='review_required'/);
  assert.match(calls[3].sql, /GROUP BY document_kind/);
  assert.match(calls[3].sql, /WHERE company_id=\$1/);
  assert.match(calls[4].sql, /NOT i\.historical_imported/);
  assert.match(calls[4].sql, /voided_at IS NULL/);
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
