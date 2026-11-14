import "../db/env.mjs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { parseLocalPostgresUrl, verifyLocalPostgresConnection } from "../../app/lib/db/postgres-target.mjs";

export const TARGET_DATABASE = "uk_exim_erp_dev";
export const TARGET_COMPANY_ID = "c05f99c0-e21c-4766-9cf4-5aa34bb37e11";
export const EFFECTIVE_AT = "2026-11-06T00:00:00+05:30";
export const APPROVED_BASELINE = Object.freeze([
  Object.freeze({ productCode: "P0006", expectedStockBaseCode: "P0006", openingStock: "79", purchaseQty: "0", salesQty: "0", currentStock: "79" }),
  Object.freeze({ productCode: "P0007", expectedStockBaseCode: "P0007", openingStock: "0", purchaseQty: "0", salesQty: "0", currentStock: "0" }),
]);

const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MIGRATIONS = [
  "001_initial_foundation.sql", "002_auth_foundation.sql", "003_customer_master.sql", "004_supplier_master.sql",
  "005_transactional_trade_stock_ledger.sql", "006_immutable_stock_movement_events.sql", "007_stock_baseline_source_snapshot.sql",
  "008_verified_stock_baseline_gate.sql", "009_historical_transaction_protection.sql", "010_stock_baseline_provenance_and_effective_date.sql",
];
const RUN_ID = "owner-attested-2026-11-06";

export function parseStrictDevUrl(value) {
  const url = parseLocalPostgresUrl(value, TARGET_DATABASE, "DATABASE_URL");
  if (url.hostname !== "127.0.0.1" || url.port !== "5432") throw new Error("Owner-attested baseline accepts only 127.0.0.1:5432/uk_exim_erp_dev.");
  return url;
}

export function createBaselineEvidence(products) {
  const evidence = {
    provenance: "owner_attested_historical_stock",
    effectiveAt: EFFECTIVE_AT,
    quantitiesUnit: "KG",
    products: APPROVED_BASELINE.map((item) => ({ ...item, productName: products.get(item.productCode)?.name ?? null })),
    notes: [
      "Quantities are owner-confirmed from the final Stock Summary; they are not represented as a physical count.",
      "They are not derived from the legacy Product Master stock snapshot.",
      "Historical imported purchases and sales are not included in these baseline quantities.",
    ],
  };
  const canonical = JSON.stringify(evidence);
  return { evidence, canonical, sha256: createHash("sha256").update(canonical, "utf8").digest("hex").toUpperCase() };
}

async function verifySchemaAndMigrations(client) {
  const applied = (await client.query("SELECT name,checksum FROM public._schema_migrations ORDER BY name")).rows;
  const statuses = [];
  for (const name of MIGRATIONS) {
    const sql = await readFile(path.join(PROJECT_ROOT, "db", "migrations", name), "utf8");
    const expected = createHash("sha256").update(sql, "utf8").digest("hex");
    const row = applied.find((entry) => entry.name === name);
    statuses.push({ name, applied: Boolean(row), checksumMatches: Boolean(row && row.checksum === expected) });
  }
  if (statuses.some((row) => !row.applied || !row.checksumMatches) || applied.length !== MIGRATIONS.length) {
    throw new Error("DEV migration history or checksum is not exactly current through migration 010.");
  }
  const columns = (await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_baselines'")).rows.map((row) => row.column_name);
  for (const required of ["source_record", "verification_status", "verification_sha256", "verified_at", "verification_method", "effective_at"]) {
    if (!columns.includes(required)) throw new Error(`Stock baseline schema is missing required column ${required}.`);
  }
  return statuses;
}

async function preflight(client) {
  const identity = await verifyLocalPostgresConnection(client, TARGET_DATABASE);
  if (identity.address !== "127.0.0.1" || Number(identity.port) !== 5432 || !String(identity.version).startsWith("18.6")) {
    throw new Error("Connected PostgreSQL identity failed the DEV-only 18.6 local guard.");
  }
  const company = await client.query("SELECT id::text AS id,count(*) OVER()::int AS matches FROM public.companies WHERE name=$1", ["UK EXIM ENTERPRISES"]);
  if (company.rowCount !== 1 || company.rows[0].id !== TARGET_COMPANY_ID) throw new Error("UK EXIM ENTERPRISES company identity is missing or ambiguous.");
  const migrationStatus = await verifySchemaAndMigrations(client);
  const codes = APPROVED_BASELINE.map((item) => item.productCode);
  const productRows = await client.query("SELECT code,name,hsn,stock_base_code,unit FROM public.products WHERE company_id=$1 AND code=ANY($2::text[]) ORDER BY code", [TARGET_COMPANY_ID, codes]);
  if (productRows.rowCount !== APPROVED_BASELINE.length) throw new Error("One or more owner-approved stock products are missing from the target company.");
  const products = new Map(productRows.rows.map((row) => [row.code, row]));
  for (const expected of APPROVED_BASELINE) {
    const row = products.get(expected.productCode);
    if (!row || row.stock_base_code !== expected.expectedStockBaseCode) throw new Error(`Stock mapping verification failed for ${expected.productCode}.`);
  }
  const existing = await client.query("SELECT id,product_code FROM public.stock_baselines WHERE company_id=$1 ORDER BY product_code", [TARGET_COMPANY_ID]);
  const idConflicts = await client.query("SELECT count(*)::int AS count FROM public.stock_baselines WHERE id=ANY($1::text[])", [APPROVED_BASELINE.map((row) => `${RUN_ID}-${row.productCode}`)]);
  const movementCounts = await client.query(`SELECT
    (SELECT count(*)::int FROM public.stock_movement_transactions WHERE company_id=$1) AS transactions,
    (SELECT count(*)::int FROM public.stock_movement_events WHERE company_id=$1) AS events,
    (SELECT count(*)::int FROM public.stock_movements WHERE company_id=$1) AS movements`, [TARGET_COMPANY_ID]);
  const evidence = createBaselineEvidence(products);
  return {
    identity: { database: identity.database, address: identity.address, port: Number(identity.port), version: identity.version },
    companyId: TARGET_COMPANY_ID,
    migrationStatus,
    mappings: productRows.rows.map(({ code, stock_base_code, unit }) => ({ productCode: code, stockBaseCode: stock_base_code, productUnit: unit })),
    baselineRowsBefore: existing.rowCount,
    baselineCodesBefore: existing.rows.map((row) => row.product_code),
    idConflicts: Number(idConflicts.rows[0].count),
    stockMovementRowsBefore: Object.fromEntries(Object.entries(movementCounts.rows[0]).map(([key, value]) => [key, Number(value)])),
    effectiveAt: EFFECTIVE_AT,
    quantitiesUnit: "KG",
    ownerApprovedQuantities: APPROVED_BASELINE.map(({ productCode, openingStock, purchaseQty, salesQty, currentStock }) => ({ productCode, openingStock, purchaseQty, salesQty, currentStock })),
    evidenceSha256: evidence.sha256,
    evidence,
    products,
  };
}

export async function runOwnerAttestedBaseline({ apply = false, connectionString = process.env.DATABASE_URL, clientFactory } = {}) {
  if (process.env.NODE_ENV === "production") throw new Error("Owner-attested stock baseline is disabled in production.");
  const url = parseStrictDevUrl(connectionString);
  const client = clientFactory ? clientFactory(url.toString()) : new pg.Client({ connectionString: url.toString() });
  let transactionOpen = false;
  try {
    await client.connect();
    await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
    transactionOpen = true;
    if (apply) await client.query("SELECT pg_advisory_xact_lock(571015520,271829)");
    const report = await preflight(client);
    if (report.baselineRowsBefore !== 0 || report.idConflicts !== 0
      || Object.values(report.stockMovementRowsBefore).some((count) => count !== 0)) {
      throw new Error("Baseline preflight is blocked by an existing baseline, stock movement or ID conflict; no baseline written.");
    }
    if (!apply) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      const safeReport = { ...report };
      delete safeReport.products;
      delete safeReport.evidence;
      return { mode: "dry-run", ready: true, writesPerformed: false, ...safeReport };
    }

    for (const row of APPROVED_BASELINE) {
      const product = report.products.get(row.productCode);
      const sourceRecord = {
        ...report.evidence.evidence,
        productCode: row.productCode,
        productName: product.name,
        productHsn: product.hsn,
        unit: "KG",
        sourceRun: RUN_ID,
      };
      await client.query(`INSERT INTO public.stock_baselines
        (id,company_id,product_code,product_name,hsn,unit,opening_stock,purchase_qty,sales_qty,current_stock,captured_at,source_record,
         verification_status,verification_sha256,verified_at,verification_method,effective_at)
        SELECT $1,$2,$3,$4,p.hsn,'KG',$5::numeric,$6::numeric,$7::numeric,$8::numeric,now(),$9::jsonb,'verified',$10,now(),'owner_attested',$11::timestamptz
        FROM public.products p WHERE p.company_id=$2 AND p.code=$3`,
      [`${RUN_ID}-${row.productCode}`, TARGET_COMPANY_ID, row.productCode, product.name, row.openingStock, row.purchaseQty, row.salesQty,
        row.currentStock, JSON.stringify(sourceRecord), report.evidenceSha256, EFFECTIVE_AT]);
    }
    const verify = await client.query(`SELECT product_code,opening_stock::text,purchase_qty::text,sales_qty::text,current_stock::text,
      verification_status,verification_method,verification_sha256,effective_at,source_record
      FROM public.stock_baselines WHERE company_id=$1 AND product_code=ANY($2::text[]) ORDER BY product_code`, [TARGET_COMPANY_ID, APPROVED_BASELINE.map((row) => row.productCode)]);
    const rowChecks = APPROVED_BASELINE.map((expected, index) => {
      const row = verify.rows[index];
      return {
        productCode: expected.productCode,
        found: Boolean(row),
        identityMatches: row?.product_code === expected.productCode,
        quantitiesMatch: row?.opening_stock === expected.openingStock && row?.purchase_qty === expected.purchaseQty
          && row?.sales_qty === expected.salesQty && row?.current_stock === expected.currentStock,
        verificationMatches: row?.verification_status === "verified" && row?.verification_method === "owner_attested"
          && row?.verification_sha256 === report.evidenceSha256,
        effectiveDateMatches: Boolean(row?.effective_at) && new Date(row.effective_at).toISOString() === "2026-11-05T18:30:00.000Z",
        provenanceMatches: row?.source_record?.provenance === "owner_attested_historical_stock",
      };
    });
    const exact = verify.rowCount === APPROVED_BASELINE.length && rowChecks.every((check) => check.found && check.identityMatches
      && check.quantitiesMatch && check.verificationMatches && check.effectiveDateMatches && check.provenanceMatches);
    const movementAfter = await client.query(`SELECT
      (SELECT count(*)::int FROM public.stock_movement_transactions WHERE company_id=$1) AS transactions,
      (SELECT count(*)::int FROM public.stock_movement_events WHERE company_id=$1) AS events,
      (SELECT count(*)::int FROM public.stock_movements WHERE company_id=$1) AS movements`, [TARGET_COMPANY_ID]);
    const movementUnchanged = Object.entries(report.stockMovementRowsBefore).every(([key, count]) => Number(movementAfter.rows[0][key]) === count);
    if (!exact || !movementUnchanged) throw new Error(`Owner-attested baseline verification failed; transaction rolled back. Diagnostics: ${JSON.stringify({ rowCount: verify.rowCount, rowChecks, movementUnchanged })}`);
    await client.query("COMMIT");
    transactionOpen = false;
    return { mode: "apply", database: report.identity, companyId: TARGET_COMPANY_ID, effectiveAt: EFFECTIVE_AT, baselineCount: verify.rowCount,
      balances: APPROVED_BASELINE.map(({ productCode, openingStock, currentStock }) => ({ productCode, openingStock, currentStock, unit: "KG" })),
      verificationMethod: "owner_attested", evidenceSha256: report.evidenceSha256, stockMovementRowsUnchanged: movementUnchanged, committed: true };
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply") || args.length > 1) {
    console.error("Usage: node scripts/stock/owner-attested-stock-baseline.mjs [--apply]");
    process.exitCode = 2;
  } else {
    try {
      console.log(JSON.stringify(await runOwnerAttestedBaseline({ apply: args.includes("--apply") }), null, 2));
    } catch (error) {
      console.error(JSON.stringify({ error: error.message, writesPerformed: false }));
      process.exitCode = 1;
    }
  }
}
