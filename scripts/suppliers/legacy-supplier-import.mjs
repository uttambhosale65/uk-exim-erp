import "../db/env.mjs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import pg from "pg";

const BACKUP = "C:/Users/ADMIN/Documents/UK-EXIM-ERP-Backups/UK-EXIM-ERP-Full-Backup-2026-11-12.json";
const BACKUP_SHA = "A2928CD3E0BDB79CFB64AC264C4E5B0978B40B4BF9071B801A95C2320B8CB7C2";
const MIGRATION = "004_supplier_master.sql";
const COMPANY_NAME = "UK EXIM ENTERPRISES";
const COMPANY_ID = "c05f99c0-e21c-4766-9cf4-5aa34bb37e11";
const SUPPLIER_KEY = "uk-exim-suppliers";
const apply = process.argv.includes("--apply");
const hash = (value) => createHash("sha256").update(value, "utf8").digest("hex").toUpperCase();
const fail = (message) => { throw new Error(message); };

const rawBackup = await readFile(BACKUP, "utf8");
if (hash(rawBackup) !== BACKUP_SHA) fail("Approved backup SHA-256 mismatch; no import performed.");
let backup;
try { backup = JSON.parse(rawBackup); } catch { fail("Approved backup is invalid JSON; no import performed."); }
const entry = backup?.keys?.[SUPPLIER_KEY];
if (!entry?.exists || !entry.parseSucceeded || typeof entry.raw !== "string" || hash(entry.raw) !== String(entry.sha256).toUpperCase()) {
  fail("Supplier source entry checksum or validity check failed; no import performed.");
}
let suppliers;
try { suppliers = JSON.parse(entry.raw); } catch { fail("Supplier source JSON is invalid; no import performed."); }
const fields = ["id", "code", "name", "contactPerson", "mobile", "email", "gst", "pan", "address", "city", "state", "country", "pinCode", "openingBalance", "creditLimit", "status"];
if (!Array.isArray(suppliers) || suppliers.length !== 1) fail("Expected exactly one approved supplier source row; no import performed.");
const ids = new Set(), codes = new Set();
for (const row of suppliers) {
  if (!row || typeof row !== "object" || Array.isArray(row)) fail("Supplier source row is invalid; no import performed.");
  for (const field of fields) {
    const number = field === "openingBalance" || field === "creditLimit";
    if (!(field in row) || (number ? typeof row[field] !== "number" || !Number.isFinite(row[field]) : typeof row[field] !== "string")) {
      fail(`Supplier source field type validation failed (${field}); no import performed.`);
    }
  }
  if (!row.id || !row.code || !row.name.trim() || !["Active", "Inactive"].includes(row.status)) fail("Supplier source identifiers/status are invalid; no import performed.");
  if (ids.has(row.id) || codes.has(row.code)) fail("Supplier source contains duplicate IDs or codes; no import performed.");
  ids.add(row.id); codes.add(row.code);
}

const url = new URL(process.env.DATABASE_URL || "");
if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" || url.port !== "5432"
  || decodeURIComponent(url.pathname.slice(1)) !== "uk_exim_erp_dev" || url.search || url.hash) {
  fail("Supplier import is restricted to 127.0.0.1:5432/uk_exim_erp_dev.");
}
const client = new pg.Client({ connectionString: url.toString() });
const typedColumns = ["id", "company_id", "code", "name", "contact_person", "mobile", "email", "gst", "pan", "address", "city", "state", "country", "pin_code", "opening_balance", "credit_limit", "status", "source_record"];

async function assertIdentity() {
  const row = (await client.query("SELECT current_database() AS database,host(inet_server_addr()) AS address,inet_server_port() AS port,current_setting('server_version') AS version")).rows[0];
  if (row?.database !== "uk_exim_erp_dev" || row?.address !== "127.0.0.1" || Number(row?.port) !== 5432) fail("Connected PostgreSQL identity is not the approved local DEV database.");
  return row;
}
async function preflight() {
  const company = await client.query("SELECT id::text AS id FROM public.companies WHERE name=$1", [COMPANY_NAME]);
  if (company.rowCount !== 1 || company.rows[0].id !== COMPANY_ID) fail("The exact UK EXIM ENTERPRISES company row is not present exactly once.");
  const columnRows = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers'");
  const available = new Set(columnRows.rows.map((row) => row.column_name));
  const missingColumns = typedColumns.filter((name) => !available.has(name));
  if (missingColumns.length) fail(`Supplier schema is missing required columns: ${missingColumns.join(", " )}.`);
  const migration = await client.query("SELECT checksum FROM public._schema_migrations WHERE name=$1", [MIGRATION]);
  const migrationSql = await readFile(new URL("../../db/migrations/004_supplier_master.sql", import.meta.url), "utf8");
  const expectedChecksum = createHash("sha256").update(migrationSql, "utf8").digest("hex");
  if (migration.rowCount !== 1 || migration.rows[0].checksum !== expectedChecksum) fail("Supplier migration 004 is missing or its checksum differs from the repository.");
  const target = await client.query("SELECT count(*)::int AS count FROM public.suppliers WHERE company_id=$1", [COMPANY_ID]);
  const idConflicts = await client.query("SELECT count(*)::int AS count FROM public.suppliers WHERE id=ANY($1::text[])", [[...ids]]);
  const codeConflicts = await client.query("SELECT count(*)::int AS count FROM public.suppliers WHERE company_id=$1 AND code=ANY($2::text[])", [COMPANY_ID, [...codes]]);
  return {
    companyMatchCount: company.rowCount,
    companyId: company.rows[0].id,
    targetCount: Number(target.rows[0].count),
    idConflicts: Number(idConflicts.rows[0].count),
    codeConflicts: Number(codeConflicts.rows[0].count),
    sourceDuplicateGroups: 0,
    schemaCompatible: true,
    migrationChecksumVerified: true,
  };
}

try {
  await client.connect();
  const identity = await assertIdentity();
  await client.query(apply ? "BEGIN ISOLATION LEVEL SERIALIZABLE" : "BEGIN READ ONLY");
  if (apply) await client.query("SELECT pg_advisory_xact_lock(571015520, 271831)");
  const before = await preflight();
  if (before.targetCount !== 0 || before.idConflicts !== 0 || before.codeConflicts !== 0) fail("Supplier import preflight no longer matches the authorized preview; no rows imported.");

  if (!apply) {
    await client.query("ROLLBACK");
    console.log(JSON.stringify({ operation: "DRY RUN", backupSha256: BACKUP_SHA, sourceEntrySha256: hash(entry.raw), sourceCount: suppliers.length, identity: { database: identity.database, address: identity.address, port: Number(identity.port), version: identity.version }, ...before, result: "READY; no writes" }, null, 2));
  } else {
    const insert = await client.query(`
      INSERT INTO public.suppliers (${typedColumns.join(",")})
      SELECT elem->>'id',$2,elem->>'code',elem->>'name',elem->>'contactPerson',elem->>'mobile',elem->>'email',elem->>'gst',elem->>'pan',elem->>'address',elem->>'city',elem->>'state',elem->>'country',elem->>'pinCode',
        (elem->>'openingBalance')::numeric,(elem->>'creditLimit')::numeric,elem->>'status',elem
      FROM jsonb_array_elements($1::jsonb) AS elem
      RETURNING id,code,source_record`, [entry.raw, COMPANY_ID]);
    if (insert.rowCount !== suppliers.length) fail("Insert count differs from source count; transaction will roll back.");
    const expectedById = new Map(suppliers.map((row) => [row.id, row]));
    const exact = insert.rows.every((row) => {
      const source = expectedById.get(row.id);
      return source && row.code === source.code && isDeepStrictEqual(row.source_record, source);
    });
    if (!exact) fail("Inserted Supplier ID/code/source_record reconciliation failed; transaction will roll back.");
    const verified = await client.query("SELECT count(*)::int AS count FROM public.suppliers WHERE company_id=$1 AND id=ANY($2::text[])", [COMPANY_ID, [...ids]]);
    if (Number(verified.rows[0].count) !== suppliers.length) fail("Post-insert Supplier count verification failed; transaction will roll back.");
    await client.query("COMMIT");
    console.log(JSON.stringify({ operation: "APPLIED", backupSha256: BACKUP_SHA, sourceEntrySha256: hash(entry.raw), sourceCount: suppliers.length, identity: { database: identity.database, address: identity.address, port: Number(identity.port), version: identity.version }, inserted: insert.rowCount, reconciled: Number(verified.rows[0].count), targetCompanyId: COMPANY_ID, conflicts: 0, sourceRecordPreserved: exact }, null, 2));
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
