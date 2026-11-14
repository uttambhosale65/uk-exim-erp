import test from "node:test";
import assert from "node:assert/strict";
import { createSettlementDAL, validateSettlementInput } from "../app/transactions/server/settlement-dal.mjs";
import { createSettlementRouteHandlers } from "../app/transactions/server/settlement-routes.mjs";

const validReceipt = (extra = {}) => ({
  requestKey: "test-request-key-0001",
  customerCode: "C-SYN-1",
  receivedOn: "2026-11-10",
  paymentMode: "UPI",
  amount: "125.50",
  referenceNo: "SYN-REF-1",
  allocations: [{ salesId: "SALE-SYN-1", amount: "100.00" }, { salesId: "SALE-SYN-2", amount: "25.50" }],
  ...extra,
});

test("settlement validates date, modes, decimal precision and allocation total", () => {
  assert.equal(validateSettlementInput("receipt", validReceipt()).amount, "125.50");
  assert.throws(() => validateSettlementInput("receipt", validReceipt({ receivedOn: "2026-02-31" })), { code: "INVALID_SETTLEMENT" });
  assert.throws(() => validateSettlementInput("receipt", validReceipt({ paymentMode: "Card" })), { code: "INVALID_SETTLEMENT" });
  assert.throws(() => validateSettlementInput("receipt", validReceipt({ amount: "1.001" })), { code: "INVALID_SETTLEMENT" });
  assert.throws(() => validateSettlementInput("receipt", validReceipt({ amount: "10", allocations: [{ salesId: "SALE-SYN-1", amount: "10.01" }] })), { code: "INVALID_SETTLEMENT" });
  assert.throws(() => validateSettlementInput("receipt", validReceipt({ companyId: "untrusted" })), { code: "INVALID_SETTLEMENT" });
});

test("supplier payments accept Cash, UPI and Bank with one or more allocations", () => {
  for (const paymentMode of ["Cash", "UPI", "Bank"]) {
    const payment = { requestKey: "supplier-request-0001", supplierCode: "SUP-SYN-1", paidOn: "2026-11-10", paymentMode, amount: "12", allocations: [{ purchaseId: "PUR-SYN-1", amount: "12.00" }] };
    assert.equal(validateSettlementInput("supplierPayment", payment).paymentMode, paymentMode);
  }
});

function mockDatabase({ failAllocation = false, partnerExists = true, duplicateRequest = false } = {}) {
  const log = [];
  const db = {
    async query(sql, params) { return run(sql, params); },
    async connect() { return { query: run, release() {} }; },
  };
  async function run(sql, params = []) {
    log.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK" || sql.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [] };
    if (sql.includes("SELECT code,status FROM public.customers")) return { rowCount: partnerExists ? 1 : 0, rows: partnerExists ? [{ code: params[1], status: "Active" }] : [] };
    if (sql.includes("coalesce(max((regexp_match")) return { rowCount: 1, rows: [{ n: 1 }] };
    if (sql.includes("INSERT INTO public.customer_receipts")) {
      if (duplicateRequest) throw Object.assign(new Error("unique constraint detail"), { code: "23505" });
      return { rowCount: 1, rows: [{ id: params[0], company_id: params[1], request_key: params[2], receipt_no: params[3], received_on: params[4], customer_code: params[5], payment_mode: params[6], reference_no: params[7], amount: params[8], notes: params[9], voided_at: null }] };
    }
    if (sql.includes("INSERT INTO public.customer_receipt_allocations")) {
      if (failAllocation) throw Object.assign(new Error("database detail must not escape"), { code: "P0001" });
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes("SELECT a.sales_id AS invoice_id")) return { rowCount: 2, rows: [{ invoice_id: "SALE-SYN-1", invoice_no: "INV-SYN-1", amount: "100.00" }, { invoice_id: "SALE-SYN-2", invoice_no: "INV-SYN-2", amount: "25.50" }] };
    if (sql.includes("SELECT i.id,i.invoice_no")) return { rowCount: 0, rows: [] };
    throw new Error(`Unexpected mocked SQL: ${sql}`);
  }
  return { db, log };
}

test("receipt create is company scoped, atomic, and returns allocations", async () => {
  const { db, log } = mockDatabase();
  const dal = createSettlementDAL({ getOwnerContext: async () => ({ company: { company_id: "company-synthetic" } }), database: db, idFactory: (() => { let n = 0; return () => `synthetic-${++n}`; })() });
  const created = await dal.create("receipt", validReceipt());
  assert.equal(created.number, "RCT-0001");
  assert.equal(created.allocations.length, 2);
  const partnerQuery = log.find((x) => x.sql.includes("FROM public.customers"));
  assert.deepEqual(partnerQuery.params, ["company-synthetic", "C-SYN-1"]);
  assert.ok(log.some((x) => x.sql === "BEGIN"));
  assert.ok(log.some((x) => x.sql === "COMMIT"));
});

test("receipt creation rolls back and sanitizes historical/unverified allocation failure", async () => {
  const { db, log } = mockDatabase({ failAllocation: true });
  const dal = createSettlementDAL({ getOwnerContext: async () => ({ company: { company_id: "company-synthetic" } }), database: db });
  await assert.rejects(dal.create("receipt", validReceipt()), { code: "SETTLEMENT_CONFLICT", message: /available invoice balance/ });
  assert.ok(log.some((x) => x.sql === "ROLLBACK"));
  assert.ok(!log.some((x) => x.sql === "COMMIT"));
});

test("non-member partner is rejected before any insert", async () => {
  const { db, log } = mockDatabase({ partnerExists: false });
  const dal = createSettlementDAL({ getOwnerContext: async () => ({ company: { company_id: "company-synthetic" } }), database: db });
  await assert.rejects(dal.create("receipt", validReceipt()), { code: "REFERENCE_NOT_FOUND" });
  assert.ok(!log.some((x) => x.sql.startsWith("INSERT INTO")));
  assert.ok(log.some((x) => x.sql === "ROLLBACK"));
});

test("replayed idempotency request is rejected and transaction rolled back", async () => {
  const { db, log } = mockDatabase({ duplicateRequest: true });
  const dal = createSettlementDAL({ getOwnerContext: async () => ({ company: { company_id: "company-synthetic" } }), database: db });
  await assert.rejects(dal.create("receipt", validReceipt()), { code: "DUPLICATE_SETTLEMENT" });
  assert.ok(log.some((x) => x.sql === "ROLLBACK"));
  assert.ok(!log.some((x) => x.sql === "COMMIT"));
});

test("unauthenticated settlement access returns JSON 401 and no-store", async () => {
  const handlers = createSettlementRouteHandlers({ list: async () => { throw Object.assign(new Error("Sign in required."), { code: "UNAUTHENTICATED" }); } }, "receipt");
  const response = await handlers.list(new Request("http://localhost/api/receipts"));
  assert.equal(response.status, 401);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
});

test("settlement writes reject cross-origin requests", async () => {
  let created = false;
  const handlers = createSettlementRouteHandlers({ create: async () => { created = true; } }, "receipt");
  const response = await handlers.create(new Request("http://localhost/api/receipts", { method: "POST", headers: { origin: "https://attacker.invalid", "content-type": "application/json" }, body: JSON.stringify(validReceipt()) }));
  assert.equal(response.status, 403);
  assert.equal(created, false);
});

test("outstanding query excludes legacy imported invoices", async () => {
  const { db, log } = mockDatabase();
  const dal = createSettlementDAL({ getOwnerContext: async () => ({ company: { company_id: "company-synthetic" } }), database: db });
  assert.deepEqual(await dal.outstanding("receipt"), []);
  assert.ok(log.length === 1);
  assert.match(log[0].sql, /NOT i\.historical_imported/);
  assert.match(log[0].sql, /i\.sales_date AS invoice_date/);
  assert.match(log[0].sql, /ORDER BY i\.sales_date,i\.invoice_no/);
  assert.deepEqual(log[0].params, ["company-synthetic", 200, 0]);
});

test("supplier outstanding uses purchase date rather than payment date", async () => {
  const { db, log } = mockDatabase();
  const dal = createSettlementDAL({ getOwnerContext: async () => ({ company: { company_id: "company-synthetic" } }), database: db });
  assert.deepEqual(await dal.outstanding("supplierPayment"), []);
  assert.match(log[0].sql, /i\.purchase_date AS invoice_date/);
  assert.match(log[0].sql, /ORDER BY i\.purchase_date,i\.invoice_no/);
});
