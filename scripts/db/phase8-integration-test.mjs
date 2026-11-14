import "./env.mjs";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyLocalPostgresConnection } from "../../app/lib/db/postgres-target.mjs";
import { parseProductsUiTestDatabaseUrl, parseProductsUiE2EDatabaseUrl } from "../../app/lib/db/products-ui-test.mjs";
import { createExportDAL } from "../../app/international/export/server/export-dal.mjs";
import { createSettingsDAL } from "../../app/settings/server/settings-dal.mjs";
import { createSettlementDAL } from "../../app/transactions/server/settlement-dal.mjs";
import { createTradeDAL } from "../../app/transactions/server/trade-dal.mjs";
import { createStockDAL } from "../../app/transactions/server/stock-dal.mjs";
import { createTaxConfigurationDAL } from "../../app/tax/server/tax-configuration-dal.mjs";
import { readMigrations, checksumMigration } from "./migrate-lib.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MANIFEST_PATH = path.join(ROOT, ".local-test", "e2e-disposable.json");
const DATABASE_NAME = /^uk_exim_erp_e2e_disposable_\d{14}_[a-f0-9]{8}$/;

if (process.env.NODE_ENV !== "development" || process.env.UKEXIM_PRODUCTS_UI_TEST_MODE !== "1"
  || process.env.UKEXIM_E2E_DISPOSABLE_MODE !== undefined) {
  throw new Error("Phase 8 integration checks require explicit development TEST mode outside the app process.");
}
const sourceUrl = parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL);
const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
if (manifest.version !== 1 || manifest.sourceDatabase !== "uk_exim_erp_test" || manifest.status !== "seeded"
  || !DATABASE_NAME.test(manifest.databaseName || "") || manifest.databaseName !== `uk_exim_erp_e2e_disposable_${manifest.runId}`
  || !manifest.fixtureIds?.companyId || !manifest.fixtureIds?.ownerId) {
  throw new Error("A valid seeded, run-owned disposable TEST manifest is required.");
}
const targetUrl = new URL(sourceUrl.toString());
targetUrl.pathname = `/${manifest.databaseName}`;
const verifiedTargetUrl = parseProductsUiE2EDatabaseUrl(targetUrl.toString(), manifest.databaseName);
const client = new pg.Client({ connectionString: verifiedTargetUrl.toString() });
const checks = [];
const runTag = `p8-${manifest.runId}`;
function assert(condition, name) {
  if (!condition) throw new Error(`Phase 8 synthetic integration check failed: ${name}`);
  checks.push(name);
}
async function expectReject(operation, code, name) {
  let failure;
  try {
    await operation();
  } catch (error) { failure = error; }
  assert(failure?.code === code, name);
}

await client.connect();
let outerTransaction = false;
let baselineBefore;
const syntheticIds = { exportCustomers: [], exportDocuments: [], receiptKeys: [], paymentKeys: [], settingKey: `phase8_${manifest.runId}` };
const identity = await verifyLocalPostgresConnection(client, manifest.databaseName);
if (identity.version !== "18.6") throw new Error("Disposable test integration requires PostgreSQL 18.6.");
const marker = await client.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
if (marker.rows[0]?.marker !== manifest.marker) throw new Error("Disposable database marker does not match the run manifest.");
const migrationRows = await client.query("SELECT name FROM public._schema_migrations ORDER BY name");
const expectedMigrations = await readMigrations();
assert(JSON.stringify(migrationRows.rows.map((row) => row.name)) === JSON.stringify(expectedMigrations.map((migration) => migration.name)), "all repository migrations are active on the disposable clone");
const migrationChecksums = await client.query("SELECT name,checksum FROM public._schema_migrations ORDER BY name");
assert(migrationChecksums.rows.every((row) => expectedMigrations.some((migration) => migration.name === row.name && checksumMigration(migration.sql) === row.checksum)), "all disposable clone migration checksums match source");

await client.query("BEGIN");
outerTransaction = true;
baselineBefore = (await client.query(`SELECT product_code,current_stock::text FROM public.stock_baselines
  WHERE company_id=$1 ORDER BY product_code`, [manifest.fixtureIds.companyId])).rows;
const domesticEventsBefore = Number((await client.query("SELECT count(*)::int AS n FROM public.stock_movement_events WHERE company_id=$1", [manifest.fixtureIds.companyId])).rows[0].n);

let savepoint = 0;
const adapter = {
  async query(sql, values) {
    if (sql === "BEGIN") return client.query(`SAVEPOINT phase8_${++savepoint}`);
    if (sql === "COMMIT") return client.query(`RELEASE SAVEPOINT phase8_${savepoint}`);
    if (sql === "ROLLBACK") return client.query(`ROLLBACK TO SAVEPOINT phase8_${savepoint}`);
    return client.query(sql, values);
  },
  release() {},
};
const database = { query: (sql, values) => client.query(sql, values), connect: async () => adapter };
const owner = { company: { company_id: manifest.fixtureIds.companyId }, session: { user: { id: manifest.fixtureIds.ownerId } } };
const getOwnerContext = async () => owner;
const exportDAL = createExportDAL({ getOwnerContext, database });
const settingsDAL = createSettingsDAL({ getOwnerContext, database });
const settlementDAL = createSettlementDAL({ getOwnerContext, database });
const taxDAL = createTaxConfigurationDAL({ getOwnerContext, database });
const syntheticTaxConfiguration = {
  version: 1,
  seller: { registrationType: "regular", gstin: "27ABCDE1234F1Z5", stateCode: "27",
    verification: { status: "verified", source: "official_gst_search", reference: "synthetic-e2e-registration", verifiedOn: "2026-11-14" } },
  productClassifications: [
    { productCode: "P0001", hsn: "0000", classification: "taxable", ratePercent: 5, effectiveFrom: "2026-11-14", effectiveTo: "", evidenceReference: "synthetic-e2e-rate" },
    { productCode: "P0007", hsn: "0000", classification: "non_gst", ratePercent: 0, effectiveFrom: "2026-11-14", effectiveTo: "", evidenceReference: "synthetic-e2e-classification" },
  ],
  export: { status: "unverified", mode: "unconfigured", reference: "", lutReference: "", lutValidFrom: "", lutValidTo: "", igstPaymentPermitted: false, igstPermissionReference: "" },
  approval: { status: "approved", ownerAttested: true, accountantReviewed: true, accountantReference: "synthetic-e2e-accountant-review" },
};
const tradeDAL = createTradeDAL({
  getOwnerContext, database,
  getSalesTaxPolicy: async (companyId) => companyId === manifest.fixtureIds.companyId
    ? (await taxDAL.get())?.configuration ?? null
    : null,
});
const stockDAL = createStockDAL({ getOwnerContext, database });

try {
  const savedTaxConfiguration = await taxDAL.save(syntheticTaxConfiguration);
  assert(savedTaxConfiguration.approvalStatus === "approved", "synthetic company tax configuration persists as domestic-approved while export remains unverified");
  assert((await taxDAL.get())?.configuration?.seller?.registrationType === "regular", "tax configuration reload is company-scoped and preserves the synthetic seller profile");
  const otherTaxDAL = createTaxConfigurationDAL({ getOwnerContext: async () => ({ company: { company_id: randomUUID() }, session: { user: { id: manifest.fixtureIds.ownerId } } }), database });
  assert((await otherTaxDAL.get()) === null, "tax configuration is isolated from another company");
  const customerId = `p8-export-customer-${manifest.runId}`;
  const customerCode = `P8-CUST-${manifest.runId.slice(-8)}`;
  syntheticIds.exportCustomers.push(customerId);
  const exportCustomer = await exportDAL.createCustomer({ id: customerId, code: customerCode, name: "Synthetic Phase 8 Buyer", status: "Active", extraSourceField: runTag });
  assert(exportCustomer.id === customerId && exportCustomer.extraSourceField === runTag, "Export Customer CRUD preserves ID and unknown source fields");
  assert((await exportDAL.getCustomer(customerId))?.code === customerCode, "Export Customer read is company-scoped");
  const customerPayload = { id: exportCustomer.id, code: exportCustomer.code, name: exportCustomer.name,
    status: exportCustomer.status, extraSourceField: exportCustomer.extraSourceField };
  await exportDAL.updateCustomer(customerId, { ...customerPayload, status: "Inactive" });
  assert((await exportDAL.getCustomer(customerId))?.status === "Inactive", "Export Customer status update persists");
  await exportDAL.updateCustomer(customerId, { ...customerPayload, status: "Active" });
  assert((await exportDAL.listCustomers({ q: customerCode })).length === 1, "Export Customer search returns the synthetic record");
  await client.query("SAVEPOINT duplicate_export_customer");
  await expectReject(() => exportDAL.createCustomer({ id: `${customerId}-duplicate`, code: customerCode, name: "Synthetic Duplicate", status: "Active" }), "EXPORT_CUSTOMER_CONFLICT", "duplicate Export Customer code is rejected");
  await client.query("ROLLBACK TO SAVEPOINT duplicate_export_customer");
  await client.query("RELEASE SAVEPOINT duplicate_export_customer");
  assert((await client.query("SELECT count(*)::int AS n FROM public.export_customers WHERE company_id=$1 AND code=$2", [manifest.fixtureIds.companyId, customerCode])).rows[0].n === 1, "duplicate Export Customer code is rejected");

  const documentSpecs = [
    ["enquiry", `p8-enq-${manifest.runId}`, { enquiryNo: `P8-ENQ-${manifest.runId.slice(-8)}`, enquiryDate: "2026-11-14", customerCode }],
    ["quotation", `p8-qtn-${manifest.runId}`, { quotationNo: `P8-QTN-${manifest.runId.slice(-8)}`, quotationDate: "2026-11-14", enquiryNo: `P8-ENQ-${manifest.runId.slice(-8)}`, customerCode }],
    ["proforma_invoice", `p8-pi-${manifest.runId}`, { proformaInvoiceNo: `P8-PI-${manifest.runId.slice(-8)}`, proformaInvoiceDate: "2026-11-14", quotationNo: `P8-QTN-${manifest.runId.slice(-8)}`, enquiryNo: `P8-ENQ-${manifest.runId.slice(-8)}`, customerCode }],
    ["order", `p8-order-${manifest.runId}`, { exportOrderNo: `P8-ORD-${manifest.runId.slice(-8)}`, exportOrderDate: "2026-11-14", proformaInvoiceNo: `P8-PI-${manifest.runId.slice(-8)}`, quotationNo: `P8-QTN-${manifest.runId.slice(-8)}`, enquiryNo: `P8-ENQ-${manifest.runId.slice(-8)}`, customerCode }],
  ];
  for (const [kind, id, data] of documentSpecs) {
    syntheticIds.exportDocuments.push(id);
    const document = await exportDAL.createDocument(kind, { id, ...data, currency: "USD", status: "Synthetic test", items: [{ sku: "SYN-PRODUCT", qty: 1 }] });
    assert(document.id === id && document.reviewStatus === "owner_verified", `${kind} create and company-scoped document references`);
  }
  assert((await exportDAL.listDocuments("order", { q: `P8-ORD-${manifest.runId.slice(-8)}` })).length === 1, "Export document search returns the linked synthetic order");
  const missingReferenceId = `p8-invalid-ref-${manifest.runId}`;
  await expectReject(() => exportDAL.createDocument("quotation", { id: missingReferenceId, quotationNo: `P8-BAD-${manifest.runId.slice(-8)}`, quotationDate: "2026-11-14", enquiryNo: `MISSING-${manifest.runId}` }), "EXPORT_REFERENCE_NOT_FOUND", "missing Export reference is rejected and rolled back");
  assert((await client.query("SELECT count(*)::int AS n FROM public.export_documents WHERE company_id=$1 AND id=$2", [manifest.fixtureIds.companyId, missingReferenceId])).rows[0].n === 0, "invalid export document reference rolls back atomically");

  const exportStockId = `p8-export-stock-${manifest.runId}`;
  await client.query(`INSERT INTO public.export_stock(id,company_id,product_code,lot_batch_no,available_qty,reserved_qty,packed_qty,loaded_qty,shipped_qty,unit,stock_source,review_status,source_record)
    VALUES($1,$2,'SYN-EXPORT-PRODUCT','LOT-SYN-1',20,0,0,0,0,'KG','opening','owner_verified',$3::jsonb)`,
  [exportStockId, manifest.fixtureIds.companyId, JSON.stringify({ synthetic: true, testRun: runTag })]);
  const exportStock = await exportDAL.listStock();
  assert(exportStock.some(row => row.id === exportStockId) && exportStock.every(row => row.productCode !== "P0006"), "Export stock remains separate from domestic P0006 stock");

  const savedSetting = await settingsDAL.save("company", { companyName: "Synthetic Phase 8 Company", brandMarker: runTag, nested: { preserve: true } });
  assert(savedSetting.value.brandMarker === runTag && savedSetting.revision === 1, "synthetic settings create preserves unknown values");
  assert((await settingsDAL.get("company")).value.nested.preserve === true, "settings reload returns persisted company-scoped value");

  const stockBeforeTrade = await stockDAL.listCurrentStock();
  const purchase = await tradeDAL.create("purchase", {
    id: `p8-purchase-${manifest.runId}`, purchaseDate: "2026-11-14", invoiceNo: `P8-SUP-${manifest.runId.slice(-8)}`,
    supplierCode: "SUP0001", contactPerson: "", remarks: "synthetic phase8", items: [{ lineId: "p8-purchase-line", productCode: "P0006", productName: "Synthetic Loose Haldi", hsn: "0000", unit: "KG", qty: 1, rate: 10, gst: 5 }],
  });
  assert(purchase.totalNetAmount === 10.5, "synthetic Purchase calculates and posts stock addition");
  const gstSale = await tradeDAL.create("sale", {
    id: `p8-gst-sale-${manifest.runId}`, salesDate: "2026-11-14", invoiceType: "GST", customerCode: "C0001", contactPerson: "",
    placeOfSupplyStateCode: "27", placeOfSupplyBasis: "movement_destination", placeOfSupplyAddress: "Synthetic Maharashtra delivery",
    paymentMode: "Credit", status: "Pending", remarks: "synthetic phase8", items: [{ lineId: "p8-gst-line", productCode: "P0001", productName: "Synthetic 50g packet", hsn: "0000", unit: "Pkt", qty: 1, rate: 100, gst: 5 }],
  });
  const nonGstSale = await tradeDAL.create("sale", {
    id: `p8-nongst-sale-${manifest.runId}`, salesDate: "2026-11-14", invoiceType: "NON_GST", customerCode: "C0001", contactPerson: "",
    placeOfSupplyStateCode: "27", placeOfSupplyBasis: "movement_destination", placeOfSupplyAddress: "Synthetic Maharashtra delivery",
    paymentMode: "Cash", status: "Completed", remarks: "synthetic phase8", items: [{ lineId: "p8-nongst-line", productCode: "P0007", productName: "Synthetic P0007", hsn: "0000", unit: "Pkt", qty: 1, rate: 40, gst: 0 }],
  });
  assert(gstSale.invoiceType === "GST" && gstSale.taxSnapshot?.documentType === "GST_TAX_INVOICE"
    && gstSale.cgst === 2.5 && gstSale.sgst === 2.5 && gstSale.igst === 0
    && nonGstSale.invoiceType === "NON_GST" && nonGstSale.taxSnapshot?.documentType === "COMMERCIAL_INVOICE",
  "GST Tax Invoice and Without GST Commercial Invoice remain separate and preserve their own tax snapshot");
  const stock = await stockDAL.listCurrentStock();
  const stockQuantity = (rows, code) => Number(rows.find(row => row.productCode === code)?.currentStock);
  assert(Math.abs(stockQuantity(stock, "P0006") - stockQuantity(stockBeforeTrade, "P0006") - 0.95) < 0.000001, "purchase and P0001 packet sale net exactly against P0006 baseline");
  assert(Math.abs(stockQuantity(stock, "P0007") - stockQuantity(stockBeforeTrade, "P0007") + 0.05) < 0.000001, "P0007 sale affects only independent P0007 stock");

  const firstReceiptKey = `p8-receipt-${manifest.runId}`;
  const firstReceipt = await settlementDAL.create("receipt", { requestKey: firstReceiptKey, customerCode: "C0001", receivedOn: "2026-11-14", paymentMode: "UPI", amount: "30.00", allocations: [{ salesId: gstSale.id, amount: "30.00" }] });
  const secondReceipt = await settlementDAL.create("receipt", { requestKey: `p8-receipt-2-${manifest.runId}`, customerCode: "C0001", receivedOn: "2026-11-14", paymentMode: "Bank", amount: "75.00", allocations: [{ salesId: gstSale.id, amount: "75.00" }] });
  const receiptOutstanding = await settlementDAL.outstanding("receipt");
  assert(firstReceipt.allocations.length === 1 && secondReceipt.allocations.length === 1
    && receiptOutstanding.every(row => row.id !== gstSale.id), "multiple partial receipts fully allocate a verified synthetic invoice");
  await expectReject(() => settlementDAL.create("receipt", { requestKey: firstReceiptKey, customerCode: "C0001", receivedOn: "2026-11-14", paymentMode: "UPI", amount: "30.00", allocations: [{ salesId: gstSale.id, amount: "30.00" }] }), "DUPLICATE_SETTLEMENT", "receipt replay request key prevents duplicate posting");
  const voided = await settlementDAL.voidPayment("receipt", secondReceipt.id);
  assert(Boolean(voided.voidedAt) && Number((await settlementDAL.outstanding("receipt")).find(row => row.id === gstSale.id)?.outstanding) === 75, "voided receipt is audited and excluded from paid allocation totals");

  const paymentOne = await settlementDAL.create("supplierPayment", { requestKey: `p8-supplier-pay-1-${manifest.runId}`, supplierCode: "SUP0001", paidOn: "2026-11-14", paymentMode: "Cash", amount: "3.50", allocations: [{ purchaseId: purchase.id, amount: "3.50" }] });
  const paymentTwo = await settlementDAL.create("supplierPayment", { requestKey: `p8-supplier-pay-2-${manifest.runId}`, supplierCode: "SUP0001", paidOn: "2026-11-14", paymentMode: "Bank", amount: "7.00", allocations: [{ purchaseId: purchase.id, amount: "7.00" }] });
  const supplierOutstanding = await settlementDAL.outstanding("supplierPayment");
  assert(paymentOne.allocations.length === 1 && paymentTwo.allocations.length === 1
    && supplierOutstanding.every(row => row.id !== purchase.id), "partial supplier payments reconcile to the synthetic purchase total");

  const otherCompanyDAL = createExportDAL({ getOwnerContext: async () => ({ company: { company_id: randomUUID() } }), database });
  assert((await otherCompanyDAL.listCustomers()).length === 0, "Export data is isolated from another company");
  const otherSettingsDAL = createSettingsDAL({ getOwnerContext: async () => ({ company: { company_id: randomUUID() } }), database });
  assert((await otherSettingsDAL.list()).length === 0, "Settings are isolated from another company");
  const otherSettlementDAL = createSettlementDAL({ getOwnerContext: async () => ({ company: { company_id: randomUUID() } }), database });
  assert((await otherSettlementDAL.list("receipt")).length === 0, "Receipts are isolated from another company");
  const historicSale = await client.query("INSERT INTO public.sales(id,company_id,sales_no,sales_date,invoice_no,invoice_type,customer_code,customer_name,contact_person,taxable_amount,gst_amount,cgst,sgst,igst,grand_total,payment_mode,status,remarks,created_at,updated_at,historical_imported,source_record) VALUES($1,$2,'P8-HIST-SYN','2026-11-14','P8-HIST-SYN','NON_GST','C0001','Synthetic','',1,0,0,0,0,1,'Credit','Pending','',now()::text,now()::text,true,'{}'::jsonb) RETURNING id", [`p8-historical-${manifest.runId}`, manifest.fixtureIds.companyId]);
  assert((await settlementDAL.outstanding("receipt")).every(row => row.id !== historicSale.rows[0].id), "historical imported invoice balances remain unverified and excluded");
  const historicRead = await tradeDAL.get("sale", historicSale.rows[0].id);
  const historicalTaxFields = (await client.query("SELECT historical_imported,tax_snapshot FROM public.sales WHERE id=$1", [historicSale.rows[0].id])).rows[0];
  assert(historicRead?.taxSnapshot === null && historicalTaxFields?.historical_imported === true && historicalTaxFields.tax_snapshot === null, "historical Sales read without tax recalculation or a generated tax snapshot");

  await client.query("ROLLBACK");
  outerTransaction = false;
  await client.query("BEGIN READ ONLY");
  const remainingExport = await client.query("SELECT count(*)::int AS n FROM public.export_customers WHERE id=ANY($1::text[])", [syntheticIds.exportCustomers]);
  const remainingSettings = await client.query("SELECT count(*)::int AS n FROM public.company_settings WHERE company_id=$1 AND setting_key=$2", [manifest.fixtureIds.companyId, "company"]);
  const remainingTax = await client.query("SELECT count(*)::int AS n FROM public.company_tax_configurations WHERE company_id=$1", [manifest.fixtureIds.companyId]);
  const remainingEvents = Number((await client.query("SELECT count(*)::int AS n FROM public.stock_movement_events WHERE company_id=$1", [manifest.fixtureIds.companyId])).rows[0].n);
  const baselineAfter = (await client.query("SELECT product_code,current_stock::text FROM public.stock_baselines WHERE company_id=$1 ORDER BY product_code", [manifest.fixtureIds.companyId])).rows;
  assert(remainingExport.rows[0].n === 0 && remainingSettings.rows[0].n === 0 && remainingTax.rows[0].n === 0, "all synthetic Export, Settings and tax configuration rows rolled back");
  assert(remainingEvents === domesticEventsBefore && JSON.stringify(baselineAfter) === JSON.stringify(baselineBefore), "domestic stock movement and immutable baselines match their before-test state");
  await client.query("ROLLBACK");
  outerTransaction = false;
  console.log(JSON.stringify({ result: "PASS", identity: { database: identity.database, address: identity.address, port: identity.port, version: identity.version },
    migrationCount: migrationRows.rowCount, checksPassed: checks.length, checks, syntheticDataRolledBack: true,
    domesticStockBaselineUnchanged: true, taxConfigurationRolledBack: true, persistentTestTouched: false, developmentDatabaseConnected: false }));
} catch (error) {
  if (outerTransaction) await client.query("ROLLBACK").catch(() => {});
  outerTransaction = false;
  throw error;
} finally {
  if (outerTransaction) await client.query("ROLLBACK").catch(() => {});
  await client.end();
}
