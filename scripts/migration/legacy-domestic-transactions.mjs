import "../db/env.mjs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { parseLocalPostgresUrl, verifyLocalPostgresConnection } from "../../app/lib/db/postgres-target.mjs";

export const SOURCE_FILE = "C:/Users/ADMIN/Documents/UK-EXIM-ERP-Backups/UK-EXIM-ERP-Full-Backup-2026-11-12.json";
export const EXPECTED_BACKUP_SHA256 = "A2928CD3E0BDB79CFB64AC264C4E5B0978B40B4BF9071B801A95C2320B8CB7C2";
export const TARGET_COMPANY_NAME = "UK EXIM ENTERPRISES";
export const TARGET_DATABASE = "uk_exim_erp_dev";
export const EXPECTED_PURCHASES = 3;
export const EXPECTED_SALES = 88;
const MIGRATION_NAMES = [
  "001_initial_foundation.sql", "002_auth_foundation.sql", "003_customer_master.sql",
  "004_supplier_master.sql", "005_transactional_trade_stock_ledger.sql",
  "006_immutable_stock_movement_events.sql", "007_stock_baseline_source_snapshot.sql",
  "008_verified_stock_baseline_gate.sql", "009_historical_transaction_protection.sql", "010_stock_baseline_provenance_and_effective_date.sql",
];

const PURCHASE_HEADER_FIELDS = ["id", "purchaseNo", "purchaseDate", "invoiceNo", "supplierCode", "supplierName", "totalQty", "totalAmount", "totalGstAmount", "totalNetAmount", "remarks", "items"];
const SALES_HEADER_FIELDS = ["id", "salesNo", "salesDate", "invoiceNo", "invoiceType", "customerCode", "customerName", "taxableAmount", "gstAmount", "cgst", "sgst", "igst", "grandTotal", "paymentMode", "status", "remarks", "createdAt", "updatedAt", "items"];
const PURCHASE_TEXT_FIELDS = ["id", "purchaseNo", "purchaseDate", "invoiceNo", "supplierCode", "supplierName", "contactPerson", "remarks"];
const SALES_TEXT_FIELDS = ["id", "salesNo", "salesDate", "invoiceNo", "invoiceType", "customerCode", "customerName", "contactPerson", "paymentMode", "status", "remarks", "createdAt", "updatedAt"];
const PURCHASE_LINE_FIELDS = ["productCode", "productName", "hsn", "unit", "qty", "rate", "amount", "gst", "gstAmount", "netAmount"];
const SALES_LINE_FIELDS = ["productCode", "productName", "hsn", "unit", "qty", "rate", "amount", "gst", "gstAmount", "taxableAmount", "cgst", "sgst", "igst", "grandTotal"];
const PURCHASE_NUMERIC_FIELDS = ["totalQty", "totalAmount", "totalGstAmount", "totalNetAmount"];
const SALES_NUMERIC_FIELDS = ["taxableAmount", "gstAmount", "cgst", "sgst", "igst", "grandTotal"];
const LINE_NUMERIC_FIELDS = ["qty", "rate", "amount", "gst", "gstAmount"];
const PURCHASE_REQUIRED_COLUMNS = ["id", "company_id", "purchase_no", "purchase_date", "invoice_no", "supplier_code", "supplier_name", "contact_person", "total_qty", "total_amount", "total_gst_amount", "total_net_amount", "remarks", "posted_at", "source_record", "created_at", "deleted_at", "historical_imported"];
const PURCHASE_ITEM_REQUIRED_COLUMNS = ["purchase_id", "row_number", "line_id", "product_code", "product_name", "hsn", "unit", "qty", "rate", "amount", "gst", "gst_amount", "net_amount"];
const SALES_REQUIRED_COLUMNS = ["id", "company_id", "sales_no", "sales_date", "invoice_no", "invoice_type", "customer_code", "customer_name", "contact_person", "taxable_amount", "gst_amount", "cgst", "sgst", "igst", "grand_total", "payment_mode", "status", "remarks", "created_at", "updated_at", "posted_at", "source_record", "created_on", "deleted_at", "historical_imported"];
const SALES_ITEM_REQUIRED_COLUMNS = ["sales_id", "row_number", "line_id", "product_code", "product_name", "hsn", "unit", "qty", "rate", "amount", "gst", "gst_amount", "taxable_amount", "cgst", "sgst", "igst", "grand_total"];
const NUMERIC_COLUMNS = new Set(["total_qty", "total_amount", "total_gst_amount", "total_net_amount", "taxable_amount", "gst_amount", "cgst", "sgst", "igst", "grand_total", "qty", "rate", "amount", "gst", "net_amount"]);

const text = (value) => typeof value === "string";
const finiteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const validDate = (value) => text(value) && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

function validateRows(rows, { kind, headerFields, textFields, numericFields, lineFields, lineNumericFields, numberField }) {
  const issues = [];
  if (!Array.isArray(rows)) return { issues: [`${kind}-not-array`], contactPersonMissing: 0 };
  const ids = new Set();
  const numbers = new Set();
  const invoices = new Set();
  let contactPersonMissing = 0;
  for (const [index, row] of rows.entries()) {
    const label = `${kind}-row-${index + 1}`;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      issues.push(`${label}-not-object`);
      continue;
    }
    for (const field of headerFields) {
      if (field === "contactPerson" && kind === "sales") continue;
      if (!Object.hasOwn(row, field) || row[field] === null) issues.push(`${label}-missing-${field}`);
    }
    if (kind === "sales" && (!Object.hasOwn(row, "contactPerson") || row.contactPerson === null)) contactPersonMissing += 1;
    for (const field of textFields) {
      if (field === "contactPerson" && kind === "sales" && (!Object.hasOwn(row, field) || row[field] === null)) continue;
      if (Object.hasOwn(row, field) && row[field] !== null && !text(row[field])) issues.push(`${label}-invalid-${field}-type`);
    }
    for (const field of ["id", numberField, "invoiceNo", kind === "purchase" ? "supplierCode" : "customerCode"]) {
      if (!text(row[field]) || !row[field].trim()) issues.push(`${label}-invalid-${field}`);
    }
    const dateField = kind === "purchase" ? "purchaseDate" : "salesDate";
    if (!validDate(row[dateField]) || row[dateField] > "2026-11-05") issues.push(`${label}-invalid-or-after-cutoff-date`);
    for (const field of numericFields) if (!finiteNumber(row[field])) issues.push(`${label}-invalid-${field}`);
    if (kind === "sales") {
      if (!new Set(["GST", "NON_GST"]).has(row.invoiceType)) issues.push(`${label}-invalid-invoice-type`);
      if (!new Set(["Completed", "Pending", "Cancelled"]).has(row.status)) issues.push(`${label}-invalid-status`);
      if (!new Set(["Cash", "UPI", "Card", "Bank", "Credit"]).has(row.paymentMode)) issues.push(`${label}-invalid-payment-mode`);
      if (!text(row.createdAt) || !text(row.updatedAt)) issues.push(`${label}-missing-original-timestamp`);
    }
    for (const [field, set] of [["id", ids], [numberField, numbers], ["invoiceNo", invoices]]) {
      const value = row[field];
      if (set.has(value)) issues.push(`${label}-duplicate-${field}`);
      set.add(value);
    }
    if (!Array.isArray(row.items) || row.items.length === 0) {
      issues.push(`${label}-invalid-items`);
      continue;
    }
    for (const [lineIndex, line] of row.items.entries()) {
      const lineLabel = `${label}-line-${lineIndex + 1}`;
      if (!line || typeof line !== "object" || Array.isArray(line)) {
        issues.push(`${lineLabel}-not-object`);
        continue;
      }
      for (const field of lineFields) if (!Object.hasOwn(line, field) || line[field] === null) issues.push(`${lineLabel}-missing-${field}`);
      for (const field of lineNumericFields) if (!finiteNumber(line[field])) issues.push(`${lineLabel}-invalid-${field}`);
      for (const field of ["productCode", "productName", "hsn", "unit"]) if (!text(line[field])) issues.push(`${lineLabel}-invalid-${field}`);
      if (!new Set(["KG", "Gram", "Pkt"]).has(line.unit)) issues.push(`${lineLabel}-invalid-unit`);
      const computedFields = kind === "purchase" ? ["netAmount"] : ["taxableAmount", "cgst", "sgst", "igst", "grandTotal"];
      for (const field of computedFields) if (!finiteNumber(line[field])) issues.push(`${lineLabel}-invalid-${field}`);
    }
  }
  return { issues, contactPersonMissing };
}

export function validateDomesticTransactionRecords({ purchases, sales }) {
  const purchase = validateRows(purchases, {
    kind: "purchase", headerFields: PURCHASE_HEADER_FIELDS, textFields: PURCHASE_TEXT_FIELDS, numericFields: PURCHASE_NUMERIC_FIELDS,
    lineFields: PURCHASE_LINE_FIELDS, lineNumericFields: LINE_NUMERIC_FIELDS, numberField: "purchaseNo",
  });
  const sale = validateRows(sales, {
    kind: "sales", headerFields: SALES_HEADER_FIELDS, textFields: SALES_TEXT_FIELDS, numericFields: SALES_NUMERIC_FIELDS,
    lineFields: SALES_LINE_FIELDS, lineNumericFields: LINE_NUMERIC_FIELDS, numberField: "salesNo",
  });
  const issues = [...purchase.issues, ...sale.issues];
  return {
    valid: issues.length === 0,
    issues,
    purchaseCount: Array.isArray(purchases) ? purchases.length : 0,
    purchaseLineCount: Array.isArray(purchases) ? purchases.reduce((n, row) => n + (Array.isArray(row?.items) ? row.items.length : 0), 0) : 0,
    salesCount: Array.isArray(sales) ? sales.length : 0,
    salesLineCount: Array.isArray(sales) ? sales.reduce((n, row) => n + (Array.isArray(row?.items) ? row.items.length : 0), 0) : 0,
    salesContactPersonMissingCount: sale.contactPersonMissing,
  };
}

function readBackup(raw) {
  if (createHash("sha256").update(raw, "utf8").digest("hex").toUpperCase() !== EXPECTED_BACKUP_SHA256) {
    throw new Error("Approved full-backup SHA-256 mismatch.");
  }
  const backup = JSON.parse(raw);
  if (backup?.format !== "UK-EXIM-ERP-FULL-RAW-BACKUP" || backup?.formatVersion !== 1 || backup?.keyCount !== 24) {
    throw new Error("Approved backup envelope is incompatible.");
  }
  const purchaseEntry = backup.keys?.["uk-exim-purchases"];
  const salesEntry = backup.keys?.["uk-exim-sales"];
  for (const entry of [purchaseEntry, salesEntry]) {
    if (entry?.exists !== true || entry?.parseSucceeded !== true || typeof entry.raw !== "string"
      || createHash("sha256").update(entry.raw, "utf8").digest("hex") !== entry.sha256) {
      throw new Error("Purchase or Sales source key failed its source checksum or parse validation.");
    }
  }
  const purchases = JSON.parse(purchaseEntry.raw);
  const sales = JSON.parse(salesEntry.raw);
  const validation = validateDomesticTransactionRecords({ purchases, sales });
  if (purchases.length !== EXPECTED_PURCHASES || sales.length !== EXPECTED_SALES) {
    validation.issues.push("expected-domestic-transaction-count-mismatch");
    validation.valid = false;
  }
  return { backupSha256: EXPECTED_BACKUP_SHA256, purchaseRaw: purchaseEntry.raw, salesRaw: salesEntry.raw, purchases, sales, validation };
}

async function countTable(client, table) {
  return Number((await client.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n);
}

async function preflight(client, source) {
  const identity = await verifyLocalPostgresConnection(client, TARGET_DATABASE);
  if (!String(identity.version).startsWith("18.6")) throw new Error("PostgreSQL version is not the verified local release.");
  const companyResult = await client.query("SELECT id::text AS id FROM public.companies WHERE name=$1", [TARGET_COMPANY_NAME]);
  if (companyResult.rowCount !== 1) throw new Error("Target company must exist exactly once.");
  const companyId = companyResult.rows[0].id;
  const migrationsResult = await client.query("SELECT name,checksum FROM public._schema_migrations ORDER BY name");
  const migrationStatus = [];
  for (const name of MIGRATION_NAMES) {
    const sql = await readFile(new URL(`../../db/migrations/${name}`, import.meta.url), "utf8");
    const checksum = createHash("sha256").update(sql, "utf8").digest("hex");
    const applied = migrationsResult.rows.find((row) => row.name === name);
    migrationStatus.push({ name, applied: Boolean(applied), checksumMatches: applied ? applied.checksum === checksum : null });
  }

  const tableColumns = await client.query(
    "SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])",
    [["purchases", "purchase_items", "sales", "sales_items"]],
  );
  const columnsByTable = new Map();
  for (const row of tableColumns.rows) {
    if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, new Set());
    columnsByTable.get(row.table_name).add(row.column_name);
  }
  const requirements = { purchases: PURCHASE_REQUIRED_COLUMNS, purchase_items: PURCHASE_ITEM_REQUIRED_COLUMNS, sales: SALES_REQUIRED_COLUMNS, sales_items: SALES_ITEM_REQUIRED_COLUMNS };
  const missingColumns = Object.fromEntries(Object.entries(requirements).map(([table, columns]) => [table, columns.filter((column) => !columnsByTable.get(table)?.has(column))]).filter(([, missing]) => missing.length));
  const incompatibleNumericColumns = tableColumns.rows
    .filter((row) => NUMERIC_COLUMNS.has(row.column_name) && !["numeric", "decimal"].includes(row.data_type))
    .map((row) => `${row.table_name}.${row.column_name}`);

  const purchaseIds = source.purchases.map((row) => row.id);
  const purchaseNumbers = source.purchases.map((row) => row.purchaseNo);
  const purchaseInvoices = source.purchases.map((row) => row.invoiceNo);
  const salesIds = source.sales.map((row) => row.id);
  const salesNumbers = source.sales.map((row) => row.salesNo);
  const salesInvoices = source.sales.map((row) => row.invoiceNo);
  const conflicts = await client.query(`SELECT
    (SELECT count(*)::int FROM public.purchases WHERE id=ANY($2::text[])) purchase_ids,
    (SELECT count(*)::int FROM public.sales WHERE id=ANY($3::text[])) sales_ids,
    (SELECT count(*)::int FROM public.purchases WHERE company_id=$1 AND (purchase_no=ANY($4::text[]) OR invoice_no=ANY($5::text[]))) purchase_documents,
    (SELECT count(*)::int FROM public.sales WHERE company_id=$1 AND (sales_no=ANY($6::text[]) OR invoice_no=ANY($7::text[]))) sales_documents`,
  [companyId, purchaseIds, salesIds, purchaseNumbers, purchaseInvoices, salesNumbers, salesInvoices]);

  const productCodes = [...new Set([...source.purchases, ...source.sales].flatMap((row) => row.items.map((item) => item.productCode)))];
  const supplierCodes = [...new Set(source.purchases.map((row) => row.supplierCode))];
  const customerCodes = [...new Set(source.sales.map((row) => row.customerCode))];
  const references = await client.query(`SELECT
    (SELECT count(*)::int FROM unnest($2::text[]) x(code) LEFT JOIN public.products p ON p.company_id=$1 AND p.code=x.code WHERE p.id IS NULL) products,
    (SELECT count(*)::int FROM unnest($3::text[]) x(code) LEFT JOIN public.suppliers s ON s.company_id=$1 AND s.code=x.code WHERE s.id IS NULL) suppliers,
    (SELECT count(*)::int FROM unnest($4::text[]) x(code) LEFT JOIN public.customers c ON c.company_id=$1 AND c.code=x.code WHERE c.id IS NULL) customers`,
  [companyId, productCodes, supplierCodes, customerCodes]);

  const purchaseFinancials = await client.query(`WITH src AS (SELECT value AS r FROM jsonb_array_elements($1::jsonb)), summed AS (
    SELECT r,(SELECT coalesce(sum((x->>'qty')::numeric),0) FROM jsonb_array_elements(r->'items') x) qty,
      (SELECT coalesce(sum((x->>'amount')::numeric),0) FROM jsonb_array_elements(r->'items') x) amount,
      (SELECT coalesce(sum((x->>'gstAmount')::numeric),0) FROM jsonb_array_elements(r->'items') x) gst,
      (SELECT coalesce(sum((x->>'netAmount')::numeric),0) FROM jsonb_array_elements(r->'items') x) net FROM src)
    SELECT count(*)::int total,count(*) FILTER(WHERE qty<>(r->>'totalQty')::numeric OR amount<>(r->>'totalAmount')::numeric OR gst<>(r->>'totalGstAmount')::numeric OR net<>(r->>'totalNetAmount')::numeric)::int mismatches FROM summed`, [source.purchaseRaw]);
  const salesFinancials = await client.query(`WITH src AS (SELECT value AS r FROM jsonb_array_elements($1::jsonb)), summed AS (
    SELECT r,(SELECT coalesce(sum((x->>'taxableAmount')::numeric),0) FROM jsonb_array_elements(r->'items') x) taxable,
      (SELECT coalesce(sum((x->>'gstAmount')::numeric),0) FROM jsonb_array_elements(r->'items') x) gst,
      (SELECT coalesce(sum((x->>'cgst')::numeric),0) FROM jsonb_array_elements(r->'items') x) cgst,
      (SELECT coalesce(sum((x->>'sgst')::numeric),0) FROM jsonb_array_elements(r->'items') x) sgst,
      (SELECT coalesce(sum((x->>'igst')::numeric),0) FROM jsonb_array_elements(r->'items') x) igst,
      (SELECT coalesce(sum((x->>'grandTotal')::numeric),0) FROM jsonb_array_elements(r->'items') x) grand FROM src)
    SELECT count(*)::int total,count(*) FILTER(WHERE taxable<>(r->>'taxableAmount')::numeric OR gst<>(r->>'gstAmount')::numeric OR cgst<>(r->>'cgst')::numeric OR sgst<>(r->>'sgst')::numeric OR igst<>(r->>'igst')::numeric OR grand<>(r->>'grandTotal')::numeric)::int mismatches FROM summed`, [source.salesRaw]);

  const targetCounts = {
    purchases: await countTable(client, "purchases"), purchaseItems: await countTable(client, "purchase_items"),
    sales: await countTable(client, "sales"), salesItems: await countTable(client, "sales_items"),
    stockBaselines: await countTable(client, "stock_baselines"), stockMovementEvents: await countTable(client, "stock_movement_events"),
  };
  const migrationReady = migrationStatus.every((row) => row.applied && row.checksumMatches === true)
    && Object.keys(missingColumns).length === 0 && incompatibleNumericColumns.length === 0;
  const conflict = conflicts.rows[0];
  const reference = references.rows[0];
  const financial = { purchases: Number(purchaseFinancials.rows[0].mismatches), sales: Number(salesFinancials.rows[0].mismatches) };
  const duplicateCounts = { sourceValidationIssues: source.validation.issues.length };
  const blockers = [];
  if (!source.validation.valid) blockers.push("source-validation-failed");
  if (!migrationReady) blockers.push("required-migration-or-schema-pending");
  if (Number(conflict.purchase_ids) || Number(conflict.sales_ids) || Number(conflict.purchase_documents) || Number(conflict.sales_documents)) blockers.push("target-id-or-document-conflict");
  if (Number(reference.products) || Number(reference.suppliers) || Number(reference.customers)) blockers.push("missing-company-scoped-reference");
  if (financial.purchases || financial.sales) blockers.push("financial-header-line-mismatch");
  return {
    identity, companyId, source: { backupSha256: source.backupSha256, purchases: source.validation.purchaseCount, purchaseItems: source.validation.purchaseLineCount, sales: source.validation.salesCount, salesItems: source.validation.salesLineCount, salesContactPersonMissingCount: source.validation.salesContactPersonMissingCount },
    migrationStatus, missingColumns, incompatibleNumericColumns, conflicts: { purchaseIds: Number(conflict.purchase_ids), salesIds: Number(conflict.sales_ids), purchaseDocuments: Number(conflict.purchase_documents), salesDocuments: Number(conflict.sales_documents) },
    missingReferences: { products: Number(reference.products), suppliers: Number(reference.suppliers), customers: Number(reference.customers) },
    financialHeaderLineMismatches: financial, sourceValidation: duplicateCounts, targetCounts, blockers,
  };
}

async function insertSource(client, companyId, source) {
  const purchaseInsert = await client.query(`WITH source AS (SELECT value AS r FROM jsonb_array_elements($1::jsonb))
    INSERT INTO public.purchases (id,company_id,purchase_no,purchase_date,invoice_no,supplier_code,supplier_name,contact_person,total_qty,total_amount,total_gst_amount,total_net_amount,remarks,posted_at,source_record,historical_imported)
    SELECT r->>'id',$2::uuid,r->>'purchaseNo',r->>'purchaseDate',r->>'invoiceNo',r->>'supplierCode',r->>'supplierName',coalesce(r->>'contactPerson',''),
      (r->>'totalQty')::numeric,(r->>'totalAmount')::numeric,(r->>'totalGstAmount')::numeric,(r->>'totalNetAmount')::numeric,coalesce(r->>'remarks',''),NULL,r,true FROM source RETURNING id`, [source.purchaseRaw, companyId]);
  const purchaseItemsInsert = await client.query(`WITH source AS (SELECT value AS r FROM jsonb_array_elements($1::jsonb)), lines AS (
    SELECT r, item, ordinality::integer AS row_number FROM source CROSS JOIN LATERAL jsonb_array_elements(r->'items') WITH ORDINALITY AS item_rows(item,ordinality))
    INSERT INTO public.purchase_items (purchase_id,row_number,line_id,product_code,product_name,hsn,unit,qty,rate,amount,gst,gst_amount,net_amount)
    SELECT r->>'id',row_number,'legacy:'||(r->>'id')||':'||row_number::text,item->>'productCode',item->>'productName',item->>'hsn',item->>'unit',
      (item->>'qty')::numeric,(item->>'rate')::numeric,(item->>'amount')::numeric,(item->>'gst')::numeric,(item->>'gstAmount')::numeric,(item->>'netAmount')::numeric FROM lines RETURNING purchase_id`, [source.purchaseRaw]);
  const salesInsert = await client.query(`WITH source AS (SELECT value AS r FROM jsonb_array_elements($1::jsonb))
    INSERT INTO public.sales (id,company_id,sales_no,sales_date,invoice_no,invoice_type,customer_code,customer_name,contact_person,taxable_amount,gst_amount,cgst,sgst,igst,grand_total,payment_mode,status,remarks,created_at,updated_at,posted_at,source_record,historical_imported)
    SELECT r->>'id',$2::uuid,r->>'salesNo',r->>'salesDate',r->>'invoiceNo',r->>'invoiceType',r->>'customerCode',r->>'customerName',coalesce(r->>'contactPerson',''),
      (r->>'taxableAmount')::numeric,(r->>'gstAmount')::numeric,(r->>'cgst')::numeric,(r->>'sgst')::numeric,(r->>'igst')::numeric,(r->>'grandTotal')::numeric,
      r->>'paymentMode',r->>'status',coalesce(r->>'remarks',''),r->>'createdAt',r->>'updatedAt',NULL,r,true FROM source RETURNING id`, [source.salesRaw, companyId]);
  const salesItemsInsert = await client.query(`WITH source AS (SELECT value AS r FROM jsonb_array_elements($1::jsonb)), lines AS (
    SELECT r,item,ordinality::integer AS row_number FROM source CROSS JOIN LATERAL jsonb_array_elements(r->'items') WITH ORDINALITY AS item_rows(item,ordinality))
    INSERT INTO public.sales_items (sales_id,row_number,line_id,product_code,product_name,hsn,unit,qty,rate,amount,gst,gst_amount,taxable_amount,cgst,sgst,igst,grand_total)
    SELECT r->>'id',row_number,'legacy:'||(r->>'id')||':'||row_number::text,item->>'productCode',item->>'productName',item->>'hsn',item->>'unit',
      (item->>'qty')::numeric,(item->>'rate')::numeric,(item->>'amount')::numeric,(item->>'gst')::numeric,(item->>'gstAmount')::numeric,(item->>'taxableAmount')::numeric,
      (item->>'cgst')::numeric,(item->>'sgst')::numeric,(item->>'igst')::numeric,(item->>'grandTotal')::numeric FROM lines RETURNING sales_id`, [source.salesRaw]);
  return { purchaseHeaders: purchaseInsert.rowCount, purchaseItems: purchaseItemsInsert.rowCount, salesHeaders: salesInsert.rowCount, salesItems: salesItemsInsert.rowCount };
}

async function verifyInsertedSource(client, companyId, source) {
  const purchaseHeaders = await client.query(`WITH source AS (SELECT value AS r FROM jsonb_array_elements($1::jsonb))
    SELECT count(*)::int AS source_count,count(*) FILTER(WHERE p.id IS NULL)::int AS missing_count,
      count(*) FILTER(WHERE p.company_id IS DISTINCT FROM $2::uuid OR p.purchase_no IS DISTINCT FROM r->>'purchaseNo'
        OR p.purchase_date IS DISTINCT FROM r->>'purchaseDate' OR p.invoice_no IS DISTINCT FROM r->>'invoiceNo'
        OR p.supplier_code IS DISTINCT FROM r->>'supplierCode' OR p.supplier_name IS DISTINCT FROM r->>'supplierName'
        OR p.contact_person IS DISTINCT FROM coalesce(r->>'contactPerson','') OR p.total_qty IS DISTINCT FROM (r->>'totalQty')::numeric
        OR p.total_amount IS DISTINCT FROM (r->>'totalAmount')::numeric OR p.total_gst_amount IS DISTINCT FROM (r->>'totalGstAmount')::numeric
        OR p.total_net_amount IS DISTINCT FROM (r->>'totalNetAmount')::numeric OR p.remarks IS DISTINCT FROM coalesce(r->>'remarks','')
        OR p.posted_at IS NOT NULL OR p.historical_imported IS DISTINCT FROM true OR p.source_record IS DISTINCT FROM r)::int AS mismatch_count
    FROM source LEFT JOIN public.purchases p ON p.id=r->>'id' AND p.company_id=$2`, [source.purchaseRaw, companyId]);
  const purchaseLines = await client.query(`WITH source AS (SELECT value AS r FROM jsonb_array_elements($1::jsonb)), lines AS (
    SELECT r,item,ordinality::integer AS row_number FROM source CROSS JOIN LATERAL jsonb_array_elements(r->'items') WITH ORDINALITY AS item_rows(item,ordinality))
    SELECT count(*)::int AS source_count,count(*) FILTER(WHERE i.purchase_id IS NULL)::int AS missing_count,
      count(*) FILTER(WHERE i.line_id IS DISTINCT FROM ('legacy:'||(r->>'id')||':'||lines.row_number::text)
        OR i.product_code IS DISTINCT FROM item->>'productCode' OR i.product_name IS DISTINCT FROM item->>'productName'
        OR i.hsn IS DISTINCT FROM item->>'hsn' OR i.unit IS DISTINCT FROM item->>'unit' OR i.qty IS DISTINCT FROM (item->>'qty')::numeric
        OR i.rate IS DISTINCT FROM (item->>'rate')::numeric OR i.amount IS DISTINCT FROM (item->>'amount')::numeric
        OR i.gst IS DISTINCT FROM (item->>'gst')::numeric OR i.gst_amount IS DISTINCT FROM (item->>'gstAmount')::numeric
        OR i.net_amount IS DISTINCT FROM (item->>'netAmount')::numeric)::int AS mismatch_count
    FROM lines LEFT JOIN public.purchase_items i ON i.purchase_id=r->>'id' AND i.row_number=lines.row_number`, [source.purchaseRaw]);
  const salesHeaders = await client.query(`WITH source AS (SELECT value AS r FROM jsonb_array_elements($1::jsonb))
    SELECT count(*)::int AS source_count,count(*) FILTER(WHERE s.id IS NULL)::int AS missing_count,
      count(*) FILTER(WHERE s.company_id IS DISTINCT FROM $2::uuid OR s.sales_no IS DISTINCT FROM r->>'salesNo'
        OR s.sales_date IS DISTINCT FROM r->>'salesDate' OR s.invoice_no IS DISTINCT FROM r->>'invoiceNo'
        OR s.invoice_type IS DISTINCT FROM r->>'invoiceType' OR s.customer_code IS DISTINCT FROM r->>'customerCode'
        OR s.customer_name IS DISTINCT FROM r->>'customerName' OR s.contact_person IS DISTINCT FROM coalesce(r->>'contactPerson','')
        OR s.taxable_amount IS DISTINCT FROM (r->>'taxableAmount')::numeric OR s.gst_amount IS DISTINCT FROM (r->>'gstAmount')::numeric
        OR s.cgst IS DISTINCT FROM (r->>'cgst')::numeric OR s.sgst IS DISTINCT FROM (r->>'sgst')::numeric OR s.igst IS DISTINCT FROM (r->>'igst')::numeric
        OR s.grand_total IS DISTINCT FROM (r->>'grandTotal')::numeric OR s.payment_mode IS DISTINCT FROM r->>'paymentMode'
        OR s.status IS DISTINCT FROM r->>'status' OR s.remarks IS DISTINCT FROM coalesce(r->>'remarks','')
        OR s.created_at IS DISTINCT FROM r->>'createdAt' OR s.updated_at IS DISTINCT FROM r->>'updatedAt'
        OR s.posted_at IS NOT NULL OR s.historical_imported IS DISTINCT FROM true OR s.source_record IS DISTINCT FROM r)::int AS mismatch_count
    FROM source LEFT JOIN public.sales s ON s.id=r->>'id' AND s.company_id=$2`, [source.salesRaw, companyId]);
  const salesLines = await client.query(`WITH source AS (SELECT value AS r FROM jsonb_array_elements($1::jsonb)), lines AS (
    SELECT r,item,ordinality::integer AS row_number FROM source CROSS JOIN LATERAL jsonb_array_elements(r->'items') WITH ORDINALITY AS item_rows(item,ordinality))
    SELECT count(*)::int AS source_count,count(*) FILTER(WHERE i.sales_id IS NULL)::int AS missing_count,
      count(*) FILTER(WHERE i.line_id IS DISTINCT FROM ('legacy:'||(r->>'id')||':'||lines.row_number::text)
        OR i.product_code IS DISTINCT FROM item->>'productCode' OR i.product_name IS DISTINCT FROM item->>'productName'
        OR i.hsn IS DISTINCT FROM item->>'hsn' OR i.unit IS DISTINCT FROM item->>'unit' OR i.qty IS DISTINCT FROM (item->>'qty')::numeric
        OR i.rate IS DISTINCT FROM (item->>'rate')::numeric OR i.amount IS DISTINCT FROM (item->>'amount')::numeric
        OR i.gst IS DISTINCT FROM (item->>'gst')::numeric OR i.gst_amount IS DISTINCT FROM (item->>'gstAmount')::numeric
        OR i.taxable_amount IS DISTINCT FROM (item->>'taxableAmount')::numeric OR i.cgst IS DISTINCT FROM (item->>'cgst')::numeric
        OR i.sgst IS DISTINCT FROM (item->>'sgst')::numeric OR i.igst IS DISTINCT FROM (item->>'igst')::numeric
        OR i.grand_total IS DISTINCT FROM (item->>'grandTotal')::numeric)::int AS mismatch_count
    FROM lines LEFT JOIN public.sales_items i ON i.sales_id=r->>'id' AND i.row_number=lines.row_number`, [source.salesRaw]);
  const summarize = (result) => ({ source: Number(result.rows[0].source_count), missing: Number(result.rows[0].missing_count), mismatches: Number(result.rows[0].mismatch_count) });
  return { purchases: summarize(purchaseHeaders), purchaseItems: summarize(purchaseLines), sales: summarize(salesHeaders), salesItems: summarize(salesLines) };
}

export async function runDomesticTransactionMigration({ apply = false, confirmSourceCompleteness = false, sourceFile = SOURCE_FILE, connectionString = process.env.DATABASE_URL, clientFactory } = {}) {
  if (apply && !confirmSourceCompleteness) throw new Error("Actual import requires --confirm-source-completeness after independent source review.");
  if (process.env.NODE_ENV === "production") throw new Error("Legacy domestic transaction migration is disabled in production.");
  const url = parseLocalPostgresUrl(connectionString, TARGET_DATABASE, "DATABASE_URL");
  const raw = await readFile(sourceFile, "utf8");
  const source = readBackup(raw);
  const client = clientFactory ? clientFactory(url.toString()) : new pg.Client({ connectionString: url.toString() });
  let transactionOpen = false;
  try {
    await client.connect();
    await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
    transactionOpen = true;
    if (apply) {
      await verifyLocalPostgresConnection(client, TARGET_DATABASE);
      const company = await client.query("SELECT id FROM public.companies WHERE name=$1", [TARGET_COMPANY_NAME]);
      if (company.rowCount !== 1) throw new Error("Target company must exist exactly once.");
      const companyId = company.rows[0].id;
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('purchase:' || $1::text,0))", [companyId]);
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('sale:' || $1::text,0))", [companyId]);
    }
    let report = await preflight(client, source);
    if (apply && report.blockers.length) throw Object.assign(new Error("Transaction import preflight is blocked; transaction rolled back."), { report });
    if (apply) {
      const beforeBaselines = report.targetCounts.stockBaselines;
      const beforeEvents = report.targetCounts.stockMovementEvents;
      const imported = await insertSource(client, report.companyId, source);
      if (imported.purchaseHeaders !== EXPECTED_PURCHASES || imported.purchaseItems !== source.validation.purchaseLineCount
        || imported.salesHeaders !== EXPECTED_SALES || imported.salesItems !== source.validation.salesLineCount) {
        throw new Error("Inserted row counts did not match the approved source counts; transaction rolled back.");
      }
      const after = {
        purchaseHeaders: await countTable(client, "purchases"), purchaseItems: await countTable(client, "purchase_items"),
        salesHeaders: await countTable(client, "sales"), salesItems: await countTable(client, "sales_items"),
        stockBaselines: await countTable(client, "stock_baselines"), stockMovementEvents: await countTable(client, "stock_movement_events"),
      };
      const reconciliation = await verifyInsertedSource(client, report.companyId, source);
      if (after.purchaseHeaders !== report.targetCounts.purchases + imported.purchaseHeaders
        || after.purchaseItems !== report.targetCounts.purchaseItems + imported.purchaseItems
        || after.salesHeaders !== report.targetCounts.sales + imported.salesHeaders
        || after.salesItems !== report.targetCounts.salesItems + imported.salesItems
        || after.stockBaselines !== beforeBaselines || after.stockMovementEvents !== beforeEvents
        || Object.values(reconciliation).some((row) => row.missing !== 0 || row.mismatches !== 0)) {
        throw new Error("Post-import counts or stock protection verification failed; transaction rolled back.");
      }
      await client.query("COMMIT");
      transactionOpen = false;
      return { mode: "apply", database: report.identity.database, imported, reconciliation, sourceBackupSha256: source.backupSha256, stockTablesWritten: false, committed: true };
    }
    await client.query("ROLLBACK");
    transactionOpen = false;
    return { mode: "dry-run", sourceCompletenessIndependentlyVerified: false, importReadyForProvidedRecords: report.blockers.length === 0, ...report, writesPerformed: false, stockTablesTouched: false };
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
    if (error.report) throw Object.assign(new Error("Transaction import preflight is blocked; no rows were written."), { report: error.report });
    throw error;
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--dry-run", "--apply", "--confirm-source-completeness"].includes(arg))
    || (args.includes("--dry-run") && args.includes("--apply"))) {
    console.error("Usage: node scripts/migration/legacy-domestic-transactions.mjs [--dry-run | --apply --confirm-source-completeness]");
    process.exitCode = 2;
  } else {
    try {
      const report = await runDomesticTransactionMigration({ apply: args.includes("--apply"), confirmSourceCompleteness: args.includes("--confirm-source-completeness") });
      console.log(JSON.stringify(report, null, 2));
      if (!report.importReadyForProvidedRecords && report.mode === "dry-run") process.exitCode = 1;
    } catch (error) {
      console.error(JSON.stringify({ error: error.message, report: error.report ?? undefined, writesPerformed: false }));
      process.exitCode = 1;
    }
  }
}
