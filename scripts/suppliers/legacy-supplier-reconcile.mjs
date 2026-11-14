import "../db/env.mjs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const BACKUP = "C:/Users/ADMIN/Documents/UK-EXIM-ERP-Backups/UK-EXIM-ERP-Full-Backup-2026-11-12.json";
const EXPECTED_HASH = "A2928CD3E0BDB79CFB64AC264C4E5B0978B40B4BF9071B801A95C2320B8CB7C2";
const COMPANY_ID = "c05f99c0-e21c-4766-9cf4-5aa34bb37e11";
const COMPANY_NAME = "UK EXIM ENTERPRISES";
const KEY = "uk-exim-suppliers";
const hash = (value) => createHash("sha256").update(value, "utf8").digest("hex").toUpperCase();

const raw = await readFile(BACKUP, "utf8");
if (hash(raw) !== EXPECTED_HASH) throw new Error("Approved Supplier backup checksum mismatch.");
const backup = JSON.parse(raw), entry = backup?.keys?.[KEY];
if (!entry?.exists || !entry.parseSucceeded || typeof entry.raw !== "string" || hash(entry.raw) !== String(entry.sha256).toUpperCase()) {
  throw new Error("Supplier source entry checksum or validity check failed.");
}
const source = JSON.parse(entry.raw);
if (!Array.isArray(source) || source.length !== 1) throw new Error("Expected exactly one source Supplier record.");

const url = new URL(process.env.DATABASE_URL || "");
if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" || url.port !== "5432"
  || decodeURIComponent(url.pathname.slice(1)) !== "uk_exim_erp_dev" || url.search || url.hash) {
  throw new Error("Supplier reconciliation is restricted to local DEV PostgreSQL.");
}
const client = new pg.Client({ connectionString: url.toString() });
try {
  await client.connect();
  await client.query("BEGIN READ ONLY");
  const identity = (await client.query("SELECT current_database() AS database,host(inet_server_addr()) AS address,inet_server_port() AS port,current_setting('server_version') AS version")).rows[0];
  if (identity.database !== "uk_exim_erp_dev" || identity.address !== "127.0.0.1" || Number(identity.port) !== 5432) throw new Error("Connected database identity is not approved local DEV.");
  const company = await client.query("SELECT count(*)::int AS count FROM public.companies WHERE id=$1 AND name=$2", [COMPANY_ID, COMPANY_NAME]);
  if (Number(company.rows[0].count) !== 1) throw new Error("Exact target company identity did not verify.");
  const target = await client.query("SELECT count(*)::int AS count FROM public.suppliers WHERE company_id=$1", [COMPANY_ID]);
  const comparison = await client.query(`
    WITH source AS (
      SELECT elem FROM jsonb_array_elements($1::jsonb) AS elem
    ), compared AS (
      SELECT t.*,s.elem FROM public.suppliers t JOIN source s ON t.id=s.elem->>'id'
      WHERE t.company_id=$2
    )
    SELECT count(*)::int AS matched,
      count(*) FILTER (WHERE code IS DISTINCT FROM elem->>'code')::int AS code_mismatches,
      count(*) FILTER (WHERE name IS DISTINCT FROM elem->>'name')::int AS name_mismatches,
      count(*) FILTER (WHERE contact_person IS DISTINCT FROM elem->>'contactPerson')::int AS contact_person_mismatches,
      count(*) FILTER (WHERE mobile IS DISTINCT FROM elem->>'mobile')::int AS mobile_mismatches,
      count(*) FILTER (WHERE email IS DISTINCT FROM elem->>'email')::int AS email_mismatches,
      count(*) FILTER (WHERE gst IS DISTINCT FROM elem->>'gst')::int AS gst_mismatches,
      count(*) FILTER (WHERE pan IS DISTINCT FROM elem->>'pan')::int AS pan_mismatches,
      count(*) FILTER (WHERE address IS DISTINCT FROM elem->>'address')::int AS address_mismatches,
      count(*) FILTER (WHERE city IS DISTINCT FROM elem->>'city')::int AS city_mismatches,
      count(*) FILTER (WHERE state IS DISTINCT FROM elem->>'state')::int AS state_mismatches,
      count(*) FILTER (WHERE country IS DISTINCT FROM elem->>'country')::int AS country_mismatches,
      count(*) FILTER (WHERE pin_code IS DISTINCT FROM elem->>'pinCode')::int AS pin_code_mismatches,
      count(*) FILTER (WHERE opening_balance IS DISTINCT FROM (elem->>'openingBalance')::numeric)::int AS opening_balance_mismatches,
      count(*) FILTER (WHERE credit_limit IS DISTINCT FROM (elem->>'creditLimit')::numeric)::int AS credit_limit_mismatches,
      count(*) FILTER (WHERE status IS DISTINCT FROM elem->>'status')::int AS status_mismatches,
      count(*) FILTER (WHERE source_record IS DISTINCT FROM elem)::int AS source_record_mismatches
    FROM compared`, [entry.raw, COMPANY_ID]);
  const result = comparison.rows[0];
  const mismatchFields = Object.entries(result).filter(([field, count]) => field.endsWith("_mismatches") && Number(count) !== 0).map(([field]) => field);
  const exact = Number(target.rows[0].count) === 1 && Number(result.matched) === 1 && mismatchFields.length === 0;
  await client.query("ROLLBACK");
  console.log(JSON.stringify({ operation: "READ ONLY", identity: { database: identity.database, address: identity.address, port: Number(identity.port), version: identity.version }, backupSha256: EXPECTED_HASH, sourceEntrySha256: hash(entry.raw), sourceCount: source.length, targetCompanyId: COMPANY_ID, targetCount: Number(target.rows[0].count), matchedCount: Number(result.matched), fieldMismatchCount: mismatchFields.length, mismatchedFields: mismatchFields, result: exact ? "PASS; 1/1 reconciled" : "FAIL" }, null, 2));
  if (!exact) process.exitCode = 1;
} finally {
  await client.end();
}
