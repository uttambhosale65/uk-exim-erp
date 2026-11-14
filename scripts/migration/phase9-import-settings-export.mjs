import "../db/env.mjs";
import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { parseLocalPostgresUrl, verifyLocalPostgresConnection } from "../../app/lib/db/postgres-target.mjs";
import { buildPhase9Plan, PHASE9_SOURCE_SHA256, verifySourceHash } from "./phase9-import-plan.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE = "C:/Users/ADMIN/Documents/UK-EXIM-ERP-Backups/UK-EXIM-ERP-Full-Backup-2026-11-12.json";
const BACKUP_ROOT = "C:/Users/ADMIN/Documents/UK-EXIM-ERP-Backups";
const COMPANY_ID = "c05f99c0-e21c-4766-9cf4-5aa34bb37e11";
const COMPANY_NAME = "UK EXIM ENTERPRISES";
const EXPECTED_MIGRATIONS = [
  "001_initial_foundation.sql", "002_auth_foundation.sql", "003_customer_master.sql", "004_supplier_master.sql",
  "005_transactional_trade_stock_ledger.sql", "006_immutable_stock_movement_events.sql", "007_stock_baseline_source_snapshot.sql",
  "008_verified_stock_baseline_gate.sql", "009_historical_transaction_protection.sql", "010_stock_baseline_provenance_and_effective_date.sql",
  "011_export_domain_foundation.sql", "012_company_settings.sql", "013_settlement_ledger.sql",
];
const APPLY = process.argv.includes("--apply");
const argument = name => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : null; };

function fail(message) { throw new Error(message); }
async function readSource() {
  const raw = await readFile(SOURCE, "utf8");
  const digest = verifySourceHash(raw);
  if (digest !== PHASE9_SOURCE_SHA256) fail("The legacy backup checksum does not match the verified source snapshot.");
  let backup;
  try { backup = JSON.parse(raw); } catch { fail("The verified legacy backup cannot be parsed."); }
  const plan = buildPhase9Plan(backup);
  return { raw, digest, plan };
}

async function assertFreshNativeBackup() {
  const backupPath = argument("--backup-file");
  const expectedHash = argument("--backup-sha256")?.toUpperCase();
  if (!backupPath || !/^[A-F0-9]{64}$/.test(expectedHash ?? "")) fail("Apply requires --backup-file and --backup-sha256 for a verified native DEV backup.");
  const root = await realpath(BACKUP_ROOT), file = await realpath(backupPath);
  if (path.dirname(file).toLowerCase() !== root.toLowerCase() || !path.basename(file).startsWith("UK-EXIM-ERP-DEV-") || !file.toLowerCase().endsWith(".dump")) fail("The native backup must be a DEV dump located directly in the approved backup directory.");
  const info = await stat(file);
  if (!info.isFile() || info.size < 1024) fail("The native DEV backup is missing or unexpectedly small.");
  const digest = createHash("sha256").update(await readFile(file)).digest("hex").toUpperCase();
  if (digest !== expectedHash) fail("The native DEV backup checksum does not match the supplied verified checksum.");
  return { file: path.basename(file), sha256: digest, bytes: info.size };
}

async function verifyMigrations(client) {
  const applied = await client.query("SELECT name,checksum FROM public._schema_migrations ORDER BY name");
  if (applied.rowCount !== EXPECTED_MIGRATIONS.length) fail("DEV migration history is not exactly the expected 001–013 set.");
  for (let index = 0; index < EXPECTED_MIGRATIONS.length; index++) {
    const name = EXPECTED_MIGRATIONS[index];
    if (applied.rows[index]?.name !== name) fail("DEV migration history contains a missing or unexpected migration.");
    const sql = await readFile(path.join(ROOT, "db", "migrations", name), "utf8");
    const expected = createHash("sha256").update(sql, "utf8").digest("hex");
    if (applied.rows[index].checksum !== expected) fail(`DEV migration checksum mismatch for ${name}.`);
  }
}

async function assertCompany(client) {
  const company = await client.query("SELECT id::text AS id FROM public.companies WHERE name=$1", [COMPANY_NAME]);
  if (company.rowCount !== 1 || company.rows[0].id !== COMPANY_ID) fail("The exact UK EXIM ENTERPRISES company identity is not present once in DEV.");
}

async function checkSettings(client, item) {
  const result = await client.query(`SELECT setting_key,payload=$3::jsonb AND source_record=$3::jsonb AS exact
    FROM public.company_settings WHERE company_id=$1 AND setting_key=$2`, [COMPANY_ID, item.key, item.raw]);
  if (result.rowCount === 0) return "insert";
  if (result.rowCount === 1 && result.rows[0].exact) return "same";
  return "conflict";
}
async function checkCustomer(client, item) {
  const r = item.record;
  const result = await client.query(`SELECT id,company_id::text AS company_id,code,name,status,review_status,
    source_record=$4::jsonb AS source_match FROM public.export_customers WHERE id=$1 OR (company_id=$2 AND code=$3)`, [r.id, COMPANY_ID, r.code, item.raw]);
  if (result.rowCount === 0) return "insert";
  const row = result.rows[0];
  return result.rowCount === 1 && row.id === r.id && row.company_id === COMPANY_ID && row.code === r.code && row.name === r.name && row.status === r.status && row.review_status === item.reviewStatus && row.source_match ? "same" : "conflict";
}
async function checkDocument(client, item) {
  const r = item.record;
  const result = await client.query(`SELECT id,company_id::text AS company_id,document_kind,document_number,document_date,currency,status,review_status,
    source_record=$5::jsonb AS source_match FROM public.export_documents WHERE id=$1 OR (company_id=$2 AND document_kind=$3 AND document_number=$4)`, [r.id, COMPANY_ID, item.kind, item.number, item.raw]);
  const row = result.rows[0];
  return result.rowCount === 0 ? "insert" : result.rowCount === 1 && row.id === r.id && row.company_id === COMPANY_ID && row.document_kind === item.kind && row.document_number === item.number && row.document_date === item.date && row.currency === item.currency && row.status === item.status && row.review_status === item.reviewStatus && row.source_match ? "same" : "conflict";
}
async function checkStock(client, item) {
  const r = item.record, n = item.numerics;
  const result = await client.query(`SELECT id,company_id::text AS company_id,product_code,lot_batch_no,
    available_qty=$4::numeric AS a,reserved_qty=$5::numeric AS r,packed_qty=$6::numeric AS p,loaded_qty=$7::numeric AS l,shipped_qty=$8::numeric AS s,
    unit=$10::text AS u,stock_source=$11::text AS ss,purchase_reference=$12::text AS pr,review_status=$13::text AS rs,source_record=$14::jsonb AS source_match
    FROM public.export_stock WHERE id=$1 OR (company_id=$2 AND product_code=$3 AND lot_batch_no=$9)`,
  [r.id, COMPANY_ID, item.productCode, n.availableQty, n.reservedQty, n.packedQty, n.loadedQty, n.shippedQty, item.lotBatchNo, item.unit, item.stockSource, item.purchaseReference, item.reviewStatus, item.raw]);
  const row = result.rows[0];
  return result.rowCount === 0 ? "insert" : result.rowCount === 1 && row.id === r.id && row.company_id === COMPANY_ID && row.product_code === item.productCode && row.lot_batch_no === item.lotBatchNo && row.a && row.r && row.p && row.l && row.s && row.u && row.ss && row.pr && row.rs && row.source_match ? "same" : "conflict";
}

async function collisionPlan(client, plan) {
  const result = { settings: { insert: 0, same: 0, conflict: 0 }, customers: { insert: 0, same: 0, conflict: 0 }, documents: { insert: 0, same: 0, conflict: 0 }, stock: { insert: 0, same: 0, conflict: 0 } };
  for (const item of plan.settings) result.settings[await checkSettings(client, item)]++;
  for (const item of plan.customers) result.customers[await checkCustomer(client, item)]++;
  for (const item of plan.documents) result.documents[await checkDocument(client, item)]++;
  for (const item of plan.stockItems) result.stock[await checkStock(client, item)]++;
  return result;
}
function conflictCount(counts) { return Object.values(counts).reduce((sum, part) => sum + part.conflict, 0); }

async function assertTargetSets(client, plan, requireComplete = true) {
  const checks = [
    ["company_settings", "setting_key", plan.settings.map(item => item.key)],
    ["export_customers", "id", plan.customers.map(item => item.record.id)],
    ["export_documents", "id", plan.documents.map(item => item.record.id)],
    ["export_stock", "id", plan.stockItems.map(item => item.record.id)],
  ];
  for (const [table, field, expected] of checks) {
    const rows = await client.query(`SELECT ${field}::text AS value FROM public.${table} WHERE company_id=$1 ORDER BY ${field}`, [COMPANY_ID]);
    const actual = rows.rows.map(row => row.value).sort();
    const source = [...expected].sort();
    const hasUnexpected = actual.some(value => !source.includes(value));
    if (hasUnexpected || (requireComplete && (actual.length !== source.length || actual.some((value, index) => value !== source[index])))) {
      fail(`Unexpected company-scoped rows exist in ${table}; import stopped without changing them.`);
    }
  }
}

async function verifyReferenceSets(client, plan) {
  const expectedDocs = [], expectedCustomers = [];
  for (const item of plan.documents) for (const reference of item.references) {
    if (reference.targetKind === "customer") expectedCustomers.push([item.record.id, reference.target.record.id, reference.target.record.code, reference.field]);
    else expectedDocs.push([item.record.id, item.kind, reference.target.record.id, reference.targetKind, reference.field]);
  }
  const actualDocs = await client.query("SELECT source_id,source_kind,target_id,target_kind,source_field FROM public.export_document_references WHERE company_id=$1 ORDER BY source_id,source_field", [COMPANY_ID]);
  const actualCustomers = await client.query("SELECT document_id,customer_id,customer_code,source_field FROM public.export_customer_document_references WHERE company_id=$1 ORDER BY document_id,source_field", [COMPANY_ID]);
  const sortRows = rows => rows.map(row => JSON.stringify(Object.values(row))).sort();
  if (JSON.stringify(sortRows(actualDocs.rows)) !== JSON.stringify(expectedDocs.map(row => JSON.stringify(row)).sort())
    || JSON.stringify(sortRows(actualCustomers.rows)) !== JSON.stringify(expectedCustomers.map(row => JSON.stringify(row)).sort())) {
    fail("Normalized export relationships do not exactly match source-resolved relationships.");
  }
}

async function insertSettings(client, item) {
  await client.query("INSERT INTO public.company_settings(company_id,setting_key,payload,source_record) VALUES($1,$2,$3::jsonb,$3::jsonb)", [COMPANY_ID, item.key, item.raw]);
}
async function insertCustomer(client, item) {
  const r = item.record;
  await client.query("INSERT INTO public.export_customers(id,company_id,code,name,status,review_status,source_record) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)", [r.id, COMPANY_ID, r.code, r.name, r.status, item.reviewStatus, item.raw]);
}
async function insertDocument(client, item) {
  const r = item.record;
  await client.query("INSERT INTO public.export_documents(id,company_id,document_kind,document_number,document_date,currency,status,review_status,source_record) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)", [r.id, COMPANY_ID, item.kind, item.number, item.date, item.currency, item.status, item.reviewStatus, item.raw]);
}
async function insertStock(client, item) {
  const n = item.numerics;
  await client.query(`INSERT INTO public.export_stock(id,company_id,product_code,lot_batch_no,available_qty,reserved_qty,packed_qty,loaded_qty,shipped_qty,unit,stock_source,purchase_reference,review_status,source_record)
    VALUES($1,$2,$3,$4,$5::numeric,$6::numeric,$7::numeric,$8::numeric,$9::numeric,$10,$11,$12,$13,$14::jsonb)`, [item.record.id, COMPANY_ID, item.productCode, item.lotBatchNo, n.availableQty, n.reservedQty, n.packedQty, n.loadedQty, n.shippedQty, item.unit, item.stockSource, item.purchaseReference, item.reviewStatus, item.raw]);
}
async function insertReferences(client, plan) {
  let documentLinks = 0, customerLinks = 0;
  for (const item of plan.documents) for (const reference of item.references) {
    if (reference.targetKind === "customer") {
      const values = [COMPANY_ID, item.record.id, reference.target.record.id, reference.target.record.code, reference.field];
      const exists = await client.query("SELECT customer_id,customer_code FROM public.export_customer_document_references WHERE company_id=$1 AND document_id=$2 AND source_field=$3", [COMPANY_ID, item.record.id, reference.field]);
      if (exists.rowCount && (exists.rowCount !== 1 || exists.rows[0].customer_id !== values[2] || exists.rows[0].customer_code !== values[3])) fail("An existing export customer relationship conflicts with the verified source.");
      if (!exists.rowCount) { await client.query("INSERT INTO public.export_customer_document_references(company_id,document_id,customer_id,customer_code,source_field) VALUES($1,$2,$3,$4,$5)", values); customerLinks++; }
    } else {
      const values = [COMPANY_ID, item.record.id, item.kind, reference.target.record.id, reference.targetKind, reference.field];
      const exists = await client.query("SELECT source_kind,target_id,target_kind FROM public.export_document_references WHERE company_id=$1 AND source_id=$2 AND source_field=$3", [COMPANY_ID, item.record.id, reference.field]);
      if (exists.rowCount && (exists.rowCount !== 1 || exists.rows[0].source_kind !== values[2] || exists.rows[0].target_id !== values[3] || exists.rows[0].target_kind !== values[4])) fail("An existing export document relationship conflicts with the verified source.");
      if (!exists.rowCount) { await client.query("INSERT INTO public.export_document_references(company_id,source_id,source_kind,target_id,target_kind,source_field) VALUES($1,$2,$3,$4,$5,$6)", values); documentLinks++; }
    }
  }
  return { documentLinks, customerLinks };
}

async function main() {
  const source = await readSource();
  if (APPLY) var nativeBackup = await assertFreshNativeBackup();
  const connection = parseLocalPostgresUrl(process.env.DATABASE_URL, "uk_exim_erp_dev", "DATABASE_URL");
  const client = new pg.Client({ connectionString: connection.toString() });
  try {
    await client.connect();
    const identity = await verifyLocalPostgresConnection(client, "uk_exim_erp_dev");
    await client.query("BEGIN READ ONLY");
    await assertCompany(client); await verifyMigrations(client);
    const counts = await collisionPlan(client, source.plan);
    await client.query("ROLLBACK");
    if (conflictCount(counts)) fail("Source/target ID, code, document number, settings, or stock collision detected; no writes were made.");
    if (!APPLY) {
      console.log(JSON.stringify({ mode: "DRY_RUN", sourceSha256: source.digest, sourceCounts: source.plan.sourceCounts,
        directOwnerReviewFlags: source.plan.directReviewCount, allExportRowsReviewRequired: source.plan.reviewCount,
        unresolvedSourceReferences: source.plan.unresolvedReferences, target: identity, companyMatch: true,
        collisionCheck: counts, stockProtection: "Only public.export_stock is in scope; domestic stock tables are not written.", paymentProtection: "No receipts, payments, or allocations are written.", readyToApply: true }, null, 2));
      return;
    }
    await client.query("BEGIN");
    try {
      await client.query("SELECT pg_advisory_xact_lock($1,$2)", [571015520, 271828]);
      await client.query("LOCK TABLE public.company_settings,public.export_customers,public.export_documents,public.export_document_references,public.export_customer_document_references,public.export_stock IN SHARE ROW EXCLUSIVE MODE");
      const companyCheck = await client.query("SELECT id::text AS id FROM public.companies WHERE name=$1 FOR SHARE", [COMPANY_NAME]);
      if (companyCheck.rowCount !== 1 || companyCheck.rows[0].id !== COMPANY_ID) fail("Company identity changed before the import transaction.");
      await verifyMigrations(client);
      const latest = await collisionPlan(client, source.plan);
      if (conflictCount(latest)) fail("A source/target collision appeared before apply; transaction rolled back.");
      await assertTargetSets(client, source.plan, false);
      for (const item of source.plan.settings) if (await checkSettings(client, item) === "insert") await insertSettings(client, item);
      for (const item of source.plan.customers) if (await checkCustomer(client, item) === "insert") await insertCustomer(client, item);
      for (const item of source.plan.documents) if (await checkDocument(client, item) === "insert") await insertDocument(client, item);
      for (const item of source.plan.stockItems) if (await checkStock(client, item) === "insert") await insertStock(client, item);
      const links = await insertReferences(client, source.plan);
      const after = await collisionPlan(client, source.plan);
      if (conflictCount(after) || after.settings.same !== 4 || after.customers.same !== 66 || after.documents.same !== 14 || after.stock.same !== 2) fail("Post-import reconciliation failed; transaction rolled back.");
      await assertTargetSets(client, source.plan);
      await verifyReferenceSets(client, source.plan);
      const linkCounts = await client.query("SELECT (SELECT count(*)::int FROM public.export_document_references WHERE company_id=$1) AS docs,(SELECT count(*)::int FROM public.export_customer_document_references WHERE company_id=$1) AS customers", [COMPANY_ID]);
      await client.query("COMMIT");
      console.log(JSON.stringify({ mode: "APPLIED", sourceSha256: source.digest, nativeBackup, target: identity, companyMatch: true,
        insertedOrAlreadyExact: { settings: after.settings.same, exportCustomers: after.customers.same, exportDocuments: after.documents.same, exportStockRows: after.stock.same },
        directOwnerReviewFlags: source.plan.directReviewCount, exportRowsHeldForReview: source.plan.reviewCount,
        unresolvedSourceReferences: source.plan.unresolvedReferences, normalizedReferences: links,
        persistedReferenceRows: { documents: Number(linkCounts.rows[0].docs), customers: Number(linkCounts.rows[0].customers) },
        domesticStockTouched: false, domesticTransactionsTouched: false, settlementRowsWritten: false }, null, 2));
    } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  } finally { await client.end(); }
}

try { await main(); }
catch (error) {
  const message = String(error?.message ?? "Phase 9 import failed.").replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[connection URL redacted]").replace(/(?:password|secret|token)=\S+/gi, "$1=[redacted]");
  console.error(`Phase 9 settings/export import failed safely: ${message}`);
  process.exitCode = 1;
}
