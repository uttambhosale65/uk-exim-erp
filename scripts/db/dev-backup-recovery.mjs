import "./env.mjs";
import { createHash, randomUUID } from "node:crypto";
import { copyFile, readFile, stat, unlink } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BACKUP_DIRECTORY = "C:/Users/ADMIN/Documents/UK-EXIM-ERP-Backups";
const RUN_ID = `${new Date().toISOString().replace(/[-:.TZ]/g, "")}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
const RECOVERY_DATABASE = `uk_exim_erp_recovery_${RUN_ID}`;
const TARGET_COMPANY_ID = "c05f99c0-e21c-4766-9cf4-5aa34bb37e11";
const PG_BIN = "C:/Users/ADMIN/Downloads/postgresql-18.6-5-windows-x64-binaries/pgsql/bin";
const EXECUTE = process.argv.includes("--execute");
const EXPECTED_MIGRATIONS = [
  "001_initial_foundation.sql", "002_auth_foundation.sql", "003_customer_master.sql", "004_supplier_master.sql",
  "005_transactional_trade_stock_ledger.sql", "006_immutable_stock_movement_events.sql",
  "007_stock_baseline_source_snapshot.sql", "008_verified_stock_baseline_gate.sql", "009_historical_transaction_protection.sql",
  "010_stock_baseline_provenance_and_effective_date.sql",
  "011_export_domain_foundation.sql", "012_company_settings.sql", "013_settlement_ledger.sql",
  "014_india_gst_tax_engine.sql",
];
const TABLES = ["companies", "products", "customers", "suppliers", "purchases", "purchase_items", "sales", "sales_items", "stock_baselines", "stock_movement_transactions", "stock_movements", "stock_movement_events", "export_customers", "export_documents", "export_document_references", "export_customer_document_references", "export_stock", "company_settings", "customer_receipts", "supplier_payments", "customer_receipt_allocations", "supplier_payment_allocations", "company_tax_configurations"];
const tools = { dump: path.join(PG_BIN, "pg_dump.exe"), restore: path.join(PG_BIN, "pg_restore.exe") };

function assertDevUrl(value) {
  let url;
  try { url = new URL(value || ""); } catch { throw new Error("DATABASE_URL is not a valid PostgreSQL URL."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" || url.port !== "5432"
    || decodeURIComponent(url.pathname.slice(1)) !== "uk_exim_erp_dev" || url.search || url.hash) {
    throw new Error("Backup source is restricted to 127.0.0.1:5432/uk_exim_erp_dev.");
  }
  return url;
}

function child(executable, args, env, capture = false) {
  const result = spawnSync(executable, args, { env, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024, stdio: "pipe" });
  if (result.error) throw new Error(`${path.basename(executable)} could not run (${result.error.code || "process error"}).`);
  if (result.status !== 0) {
    let diagnostic = String(result.stderr || "").trim();
    for (const secret of [env.PGPASSWORD, env.DATABASE_URL, env.TEST_DATABASE_URL].filter(Boolean)) {
      diagnostic = diagnostic.replaceAll(String(secret), "[REDACTED]");
    }
    diagnostic = diagnostic.replace(/(?:postgres|postgresql):\/\/[^\s]+/gi, "[connection URL redacted]").slice(0, 1200);
    throw new Error(`${path.basename(executable)} exited with code ${result.status}${diagnostic ? `: ${diagnostic}` : "."}`);
  }
  return capture ? result.stdout : "";
}

function connectionArgs(username, database) {
  return ["--host=127.0.0.1", "--port=5432", `--username=${username}`, `--dbname=${database}`];
}

async function identify(client, expectedName) {
  const row = (await client.query(`SELECT current_database() AS database,host(inet_server_addr()) AS address,
    inet_server_port() AS port,current_setting('server_version') AS version,
    (SELECT rolcreatedb OR rolsuper FROM pg_roles WHERE rolname=current_user) AS can_create_database`)).rows[0];
  if (row.database !== expectedName || row.address !== "127.0.0.1" || Number(row.port) !== 5432) {
    throw new Error(`Connected PostgreSQL identity failed the ${expectedName} local-target guard.`);
  }
  if (!String(row.version).startsWith("18.6")) throw new Error("PostgreSQL source version is not the verified 18.6 release.");
  return { database: row.database, address: row.address, port: Number(row.port), version: row.version, canCreateDatabase: row.can_create_database };
}

async function databaseSnapshot(connectionString) {
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    const identity = await identify(client, new URL(connectionString).pathname.slice(1));
    await client.query("BEGIN READ ONLY");
    const migrations = await client.query("SELECT name,checksum FROM public._schema_migrations ORDER BY name");
    const migrationChecks = [];
    for (const name of EXPECTED_MIGRATIONS) {
      const sql = await readFile(path.join(ROOT, "db", "migrations", name), "utf8");
      const expected = createHash("sha256").update(sql, "utf8").digest("hex");
      const applied = migrations.rows.find((row) => row.name === name);
      if (applied && applied.checksum !== expected) throw new Error(`Migration checksum mismatch detected for ${name}.`);
      migrationChecks.push({ name, applied: Boolean(applied), checksumMatches: Boolean(applied && applied.checksum === expected) });
    }
    const rowCounts = {};
    for (const table of TABLES) {
      const present = await client.query("SELECT to_regclass($1) IS NOT NULL AS present", [`public.${table}`]);
      rowCounts[table] = present.rows[0].present ? Number((await client.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n) : null;
    }
    const objects = (await client.query(`SELECT
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth') AND c.relkind IN ('r','p')) AS tables,
      (SELECT count(*)::int FROM pg_indexes WHERE schemaname IN ('public','auth')) AS indexes,
      (SELECT count(*)::int FROM information_schema.table_constraints WHERE table_schema IN ('public','auth')) AS constraints`)).rows[0];
    const company = await client.query("SELECT id::text AS id,count(*) OVER()::int AS match_count FROM public.companies WHERE name=$1", ["UK EXIM ENTERPRISES"]);
    if (company.rowCount !== 1 || company.rows[0].id !== TARGET_COMPANY_ID) throw new Error("DEV backup source does not contain the exact verified company identity.");
    const relationships = await client.query(`SELECT
      (SELECT count(*)::int FROM public.purchase_items i LEFT JOIN public.purchases h ON h.id=i.purchase_id WHERE h.id IS NULL) AS orphan_purchase_items,
      (SELECT count(*)::int FROM public.sales_items i LEFT JOIN public.sales h ON h.id=i.sales_id WHERE h.id IS NULL) AS orphan_sales_items,
      (SELECT count(*)::int FROM public.purchases p LEFT JOIN public.suppliers s ON s.company_id=p.company_id AND s.code=p.supplier_code WHERE s.id IS NULL) AS missing_purchase_suppliers,
      (SELECT count(*)::int FROM public.sales t LEFT JOIN public.customers c ON c.company_id=t.company_id AND c.code=t.customer_code WHERE c.id IS NULL) AS missing_sales_customers,
      (SELECT count(*)::int FROM public.purchase_items i JOIN public.purchases h ON h.id=i.purchase_id LEFT JOIN public.products p ON p.company_id=h.company_id AND p.code=i.product_code WHERE p.id IS NULL) AS missing_purchase_products,
      (SELECT count(*)::int FROM public.sales_items i JOIN public.sales h ON h.id=i.sales_id LEFT JOIN public.products p ON p.company_id=h.company_id AND p.code=i.product_code WHERE p.id IS NULL) AS missing_sales_products`);
    await client.query("ROLLBACK");
    return { identity, rowCounts, objects, migrations: migrationChecks, company: { matchCount: company.rowCount, id: company.rows[0]?.id ?? null }, relationships: relationships.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

const sourceUrl = assertDevUrl(process.env.DATABASE_URL);
if (!tools.dump || !tools.restore) throw new Error("PostgreSQL backup utilities are unavailable.");
for (const toolPath of Object.values(tools)) await stat(toolPath);
const datePart = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const filename = `UK-EXIM-ERP-DEV-${datePart}-${randomUUID().slice(0, 8)}.dump`;
const backupPath = path.join(BACKUP_DIRECTORY, filename);
const partialPath = `${backupPath}.partial`;
const env = { ...process.env, PGPASSWORD: decodeURIComponent(sourceUrl.password) };
const args = connectionArgs(decodeURIComponent(sourceUrl.username), "uk_exim_erp_dev");

const before = await databaseSnapshot(sourceUrl.toString());
await stat(BACKUP_DIRECTORY);
if (before.identity.canCreateDatabase !== true) throw new Error("The local database role cannot create the isolated restore database; no backup or database was created.");
const maintenanceUrl = new URL(sourceUrl.toString());
maintenanceUrl.pathname = "/postgres";
const maintenance = new pg.Client({ connectionString: maintenanceUrl.toString() });
try {
  await maintenance.connect();
  await identify(maintenance, "postgres");
  const exists = await maintenance.query("SELECT 1 FROM pg_database WHERE datname=$1", [RECOVERY_DATABASE]);
  if (exists.rowCount !== 0) throw new Error(`Recovery database '${RECOVERY_DATABASE}' already exists; refusing to overwrite it.`);
} finally {
  await maintenance.end();
}
for (const candidate of [backupPath, partialPath]) {
  try { await stat(candidate); throw new Error(`Backup target '${path.basename(candidate)}' already exists; refusing to overwrite it.`); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}

if (!EXECUTE) {
  console.log(JSON.stringify({ operation: "READ-ONLY PREFLIGHT", source: before.identity, sourceRows: before.rowCounts, sourceObjects: before.objects, migrationStatus: before.migrations, recoveryDatabase: RECOVERY_DATABASE, recoveryDatabaseExists: false, databaseCreationPermission: true, proposedBackup: backupPath, nextStep: "Run with --execute to create the native backup and restore a new isolated database." }, null, 2));
  process.exit(0);
}

let partialExists = false;
try {
  child(tools.dump, [...args, "--format=custom", "--no-owner", "--no-acl", `--file=${partialPath}`], env);
  partialExists = true;
  const fileStat = await stat(partialPath);
  if (fileStat.size < 1024) throw new Error("The generated PostgreSQL backup is unexpectedly small.");
  const archive = child(tools.restore, ["--list", partialPath], env, true);
    const required = ["TABLE public _schema_migrations", "TABLE public companies", "TABLE public products", "TABLE public customers", "TABLE public suppliers", "TABLE public purchases", "TABLE public purchase_items", "TABLE public sales", "TABLE public sales_items", "TABLE public stock_baselines", "TABLE public stock_movement_transactions", "TABLE public stock_movements", "TABLE public stock_movement_events", "TABLE public export_customers", "TABLE public export_documents", "TABLE public export_document_references", "TABLE public export_customer_document_references", "TABLE public export_stock", "TABLE public company_settings", "TABLE public customer_receipts", "TABLE public supplier_payments", "TABLE public customer_receipt_allocations", "TABLE public supplier_payment_allocations"];
  if (before.migrations.find((migration) => migration.name === "014_india_gst_tax_engine.sql")?.applied) required.push("TABLE public company_tax_configurations");
  if (before.rowCounts.stock_movement_events !== null) required.push("TABLE public stock_movement_events");
  if (before.migrations.find((migration) => migration.name === "002_auth_foundation.sql")?.applied) required.push("TABLE auth user");
  const missingArchiveObjects = required.filter((entry) => !archive.includes(entry));
  if (missingArchiveObjects.length) throw new Error(`Backup archive is missing required objects: ${missingArchiveObjects.join(", ")}.`);

  const maintenance = new pg.Client({ connectionString: maintenanceUrl.toString() });
  try {
    await maintenance.connect();
    await identify(maintenance, "postgres");
    const exists = await maintenance.query("SELECT 1 FROM pg_database WHERE datname=$1", [RECOVERY_DATABASE]);
    if (exists.rowCount !== 0) throw new Error(`Recovery database '${RECOVERY_DATABASE}' appeared during preflight; refusing to modify it.`);
  await maintenance.query(`CREATE DATABASE "${RECOVERY_DATABASE}"`);
  } finally {
    await maintenance.end();
  }

  child(tools.restore, ["--exit-on-error", "--host=127.0.0.1", "--port=5432", `--username=${decodeURIComponent(sourceUrl.username)}`, `--dbname=${RECOVERY_DATABASE}`, "--no-owner", "--no-acl", partialPath], env);
  const recoveryUrl = new URL(sourceUrl.toString());
  recoveryUrl.pathname = `/${RECOVERY_DATABASE}`;
  const restored = await databaseSnapshot(recoveryUrl.toString());
  const sameRows = JSON.stringify(restored.rowCounts) === JSON.stringify(before.rowCounts);
  const sameMigrations = JSON.stringify(restored.migrations) === JSON.stringify(before.migrations);
  const sameObjects = JSON.stringify(restored.objects) === JSON.stringify(before.objects);
  const sameCompany = JSON.stringify(restored.company) === JSON.stringify(before.company);
  const sameRelationships = JSON.stringify(restored.relationships) === JSON.stringify(before.relationships);
  const cleanRelationships = Object.values(restored.relationships).every((count) => Number(count) === 0);
  if (!sameRows || !sameMigrations || !sameObjects || !sameCompany || !sameRelationships || !cleanRelationships) throw new Error("Restore verification differed from the DEV snapshot; recovery database preserved for investigation.");

  const digest = createHash("sha256").update(await readFile(partialPath)).digest("hex").toUpperCase();
  await copyFile(partialPath, backupPath, fsConstants.COPYFILE_EXCL);
  await unlink(partialPath);
  partialExists = false;
  const cleanup = new pg.Client({ connectionString: maintenanceUrl.toString() });
  try {
    await cleanup.connect();
    await identify(cleanup, "postgres");
    const active = await cleanup.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=$1", [RECOVERY_DATABASE]);
    if (Number(active.rows[0].n) !== 0) throw new Error("The run-owned recovery database still has active sessions; it was preserved for safe manual review.");
    await cleanup.query(`DROP DATABASE "${RECOVERY_DATABASE}"`);
    const remains = await cleanup.query("SELECT 1 FROM pg_database WHERE datname=$1", [RECOVERY_DATABASE]);
    if (remains.rowCount !== 0) throw new Error("The run-owned recovery database still exists after cleanup verification.");
  } finally {
    await cleanup.end();
  }
  console.log(JSON.stringify({ operation: "BACKUP AND RESTORE VERIFIED", sourceIdentity: before.identity, backup: { file: backupPath, bytes: fileStat.size, sha256: digest, requiredObjectsPresent: true }, recoveryDatabase: RECOVERY_DATABASE, recoveryDatabaseRemoved: true, restoredIdentity: restored.identity, rowCountsMatch: sameRows, migrationHistoryAndChecksumsMatch: sameMigrations, schemaObjectCountsMatch: sameObjects, companyIdentityMatches: sameCompany, relationshipsMatchAndClean: sameRelationships && cleanRelationships, sourceRows: before.rowCounts, migrationStatus: before.migrations, noSourceWrites: true }, null, 2));
} catch (error) {
  if (partialExists) console.error(`A partial backup file was preserved for inspection: ${path.basename(partialPath)}`);
  throw error;
}
