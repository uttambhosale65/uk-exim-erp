import test from "node:test";
import assert from "node:assert/strict";
import { validateDomesticTransactionRecords } from "../scripts/migration/legacy-domestic-transactions.mjs";

const purchase = (overrides = {}) => ({
  id: "synthetic-purchase-id", purchaseNo: "GRN-SYN-0001", purchaseDate: "2026-10-01", invoiceNo: "SUP-SYN-0001",
  supplierCode: "SUP-SYN", supplierName: "Synthetic Supplier", totalQty: 1, totalAmount: 100, totalGstAmount: 5,
  totalNetAmount: 105, remarks: "", items: [{ productCode: "P0006", productName: "Synthetic Product", hsn: "0000", unit: "KG", qty: 1, rate: 100, amount: 100, gst: 5, gstAmount: 5, netAmount: 105 }],
  ...overrides,
});
const sale = (overrides = {}) => ({
  id: "synthetic-sale-id", salesNo: "SAL-SYN-0001", salesDate: "2026-10-02", invoiceNo: "UK26SYN0001", invoiceType: "GST",
  customerCode: "CUS-SYN", customerName: "Synthetic Customer", taxableAmount: 100, gstAmount: 5, cgst: 2.5, sgst: 2.5,
  igst: 0, grandTotal: 105, paymentMode: "Cash", status: "Pending", remarks: "", createdAt: "2026-10-02T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z", items: [{ productCode: "P0006", productName: "Synthetic Product", hsn: "0000", unit: "KG", qty: 1, rate: 100, amount: 100, gst: 5, gstAmount: 5, taxableAmount: 100, cgst: 2.5, sgst: 2.5, igst: 0, grandTotal: 105 }],
  ...overrides,
});

test("valid synthetic transaction source preserves GST type and optional missing contact without inventing it", () => {
  const result = validateDomesticTransactionRecords({ purchases: [purchase()], sales: [sale()] });
  assert.equal(result.valid, true);
  assert.equal(result.purchaseLineCount, 1);
  assert.equal(result.salesLineCount, 1);
  assert.equal(result.salesContactPersonMissingCount, 1);
});

test("duplicate source IDs, document numbers, unsupported invoice types, and post-cutoff dates are rejected", () => {
  const result = validateDomesticTransactionRecords({
    purchases: [purchase(), purchase()],
    sales: [sale({ invoiceType: "GST_MERGED", salesDate: "2026-11-06" })],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes("purchase-row-2-duplicate-id"));
  assert.ok(result.issues.includes("purchase-row-2-duplicate-purchaseNo"));
  assert.ok(result.issues.includes("purchase-row-2-duplicate-invoiceNo"));
  assert.ok(result.issues.includes("sales-row-1-invalid-invoice-type"));
  assert.ok(result.issues.includes("sales-row-1-invalid-or-after-cutoff-date"));
});

test("invalid line numeric values are rejected without recalculating original amounts", () => {
  const result = validateDomesticTransactionRecords({ purchases: [purchase({ items: [ { ...purchase().items[0], amount: Number.NaN } ] })], sales: [sale()] });
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes("purchase-row-1-line-1-invalid-amount"));
});
