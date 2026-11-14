import "./env.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";
import { verifyLocalPostgresConnection } from "../../app/lib/db/postgres-target.mjs";
import { parseProductsUiTestDatabaseUrl, parseProductsUiE2EDatabaseUrl } from "../../app/lib/db/products-ui-test.mjs";
import { createTradeDAL } from "../../app/transactions/server/trade-dal.mjs";

if (process.env.NODE_ENV !== "development" || process.env.UKEXIM_PRODUCTS_UI_TEST_MODE !== "1" || process.env.UKEXIM_E2E_DISPOSABLE_MODE !== undefined) {
  throw new Error("Synthetic browser invoices require development TEST mode outside the application process.");
}
const root = fileURLToPath(new URL("../../", import.meta.url));
const manifestPath = path.join(root, ".local-test", "e2e-disposable.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
if (manifest.status !== "seeded" || manifest.sourceDatabase !== "uk_exim_erp_test"
  || !/^uk_exim_erp_e2e_disposable_\d{14}_[a-f0-9]{8}$/.test(manifest.databaseName)
  || manifest.databaseName !== `uk_exim_erp_e2e_disposable_${manifest.runId}`) {
  throw new Error("A seeded, run-owned disposable TEST database is required.");
}
const source = parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL);
const targetUrl = new URL(source.toString());
targetUrl.pathname = `/${manifest.databaseName}`;
const target = parseProductsUiE2EDatabaseUrl(targetUrl.toString(), manifest.databaseName);
const client = new pg.Client({ connectionString: target.toString() });
await client.connect();
try {
  const identity = await verifyLocalPostgresConnection(client, manifest.databaseName);
  if (identity.version !== "18.6") throw new Error("Synthetic browser fixture requires local PostgreSQL 18.6.");
  const marker = await client.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
  if (marker.rows[0]?.marker !== manifest.marker) throw new Error("Disposable database marker does not match the manifest.");
  const runId = manifest.runId;
  const purchaseId = `p8-browser-purchase-${runId}`;
  const saleId = `p8-browser-sale-${runId}`;
  const existing = await client.query("SELECT (SELECT count(*) FROM public.purchases WHERE company_id=$1 AND id=$2) purchases,(SELECT count(*) FROM public.sales WHERE company_id=$1 AND id=$3) sales", [manifest.fixtureIds.companyId, purchaseId, saleId]);
  if (Number(existing.rows[0].purchases) || Number(existing.rows[0].sales)) throw new Error("Phase 8 browser transaction fixtures already exist; refusing duplicate setup.");
  let savepoint = 0;
  const adapter = {
    query: async (sql, values) => {
      if (sql === "BEGIN") return client.query(`SAVEPOINT phase8_fixture_${++savepoint}`);
      if (sql === "COMMIT") return client.query(`RELEASE SAVEPOINT phase8_fixture_${savepoint}`);
      if (sql === "ROLLBACK") return client.query(`ROLLBACK TO SAVEPOINT phase8_fixture_${savepoint}`);
      return client.query(sql, values);
    },
    release() {},
  };
  const database = { query: (sql, values) => client.query(sql, values), connect: async () => adapter };
  const dal = createTradeDAL({
    getOwnerContext: async () => ({ company: { company_id: manifest.fixtureIds.companyId } }), database,
    getSalesTaxPolicy: async () => ({ approved: true, source: "synthetic-disposable-browser-test-only" }),
  });
  const suffix = runId.slice(-8);
  await client.query("BEGIN");
  let purchase, sale;
  try {
  purchase = await dal.create("purchase", { id: purchaseId, purchaseDate: "2026-11-14", invoiceNo: `P8-SUP-${suffix}`,
    supplierCode: "SUP0001", contactPerson: "", remarks: `synthetic phase8 browser fixture ${runId}`,
    items: [{ lineId: `p8-browser-purchase-line-${suffix}`, productCode: "P0006", productName: "Synthetic Loose Haldi", hsn: "0000", unit: "KG", qty: 1, rate: 10, gst: 5 }] });
  sale = await dal.create("sale", { id: saleId, salesDate: "2026-11-14", invoiceType: "GST", customerCode: "C0001", contactPerson: "",
    paymentMode: "Credit", status: "Pending", remarks: `synthetic phase8 browser fixture ${runId}`,
    items: [{ lineId: `p8-browser-sale-line-${suffix}`, productCode: "P0001", productName: "Synthetic 50g packet", hsn: "0000", unit: "Pkt", qty: 1, rate: 100, gst: 5 }] });
  await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  manifest.browserFixtureIds = { purchaseId, saleId, purchaseNo: purchase.purchaseNo, salesNo: sale.salesNo, invoiceNo: sale.invoiceNo };
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ operation: "synthetic browser invoices created in disposable TEST only", database: identity.database,
    address: identity.address, port: identity.port, version: identity.version,
    fixtures: { purchase: 1, sale: 1, purchaseNo: purchase.purchaseNo, salesNo: sale.salesNo, invoiceType: sale.invoiceType },
    salesTaxPolicy: "synthetic-test-only", persistentTestWrites: false, developmentDatabaseConnected: false }));
} finally { await client.end(); }
