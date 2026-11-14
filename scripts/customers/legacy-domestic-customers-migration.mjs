import "../db/env.mjs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export const EXPECTED_SHA256 = "A2928CD3E0BDB79CFB64AC264C4E5B0978B40B4BF9071B801A95C2320B8CB7C2";
export const EXPECTED_DATABASE = "uk_exim_erp_dev";
export const EXPECTED_COMPANY = "UK EXIM ENTERPRISES";
export const EXPECTED_COMPANY_ID = "c05f99c0-e21c-4766-9cf4-5aa34bb37e11";
export const SOURCE_FILE = "C:\\Users\\ADMIN\\Documents\\UK-EXIM-ERP-Backups\\UK-EXIM-ERP-Full-Backup-2026-11-12.json";
export const CUSTOMER_KEY = "uk-exim-customers";
export const CUSTOMER_FIELDS = Object.freeze([
  "id", "code", "name", "contactPerson", "mobile", "email", "gst", "pan",
  "address", "city", "state", "country", "pinCode", "openingBalance", "creditLimit", "status",
]);
const REQUIRED_COLUMNS = Object.freeze([
  "id", "company_id", "code", "name", "source_record", "contact_person", "mobile", "email",
  "gst", "pan", "address", "city", "state", "country", "pin_code", "opening_balance",
  "credit_limit", "status", "whatsapp", "payment_terms", "remarks",
]);
const MIGRATION_LOCK = "uk-exim-domestic-customer-import-v1";

export function parseStrictDevelopmentUrl(connectionString) {
  if (typeof connectionString !== "string" || !connectionString) throw new Error("DATABASE_URL is not configured.");
  let url;
  try { url = new URL(connectionString); } catch { throw new Error("DATABASE_URL is invalid."); }
  if (!(["postgres:", "postgresql:"].includes(url.protocol)
    && url.hostname.toLowerCase() === "127.0.0.1"
    && url.port === "5432"
    && decodeURIComponent(url.pathname.slice(1)) === EXPECTED_DATABASE
    && !url.search && !url.hash)) {
    throw new Error("Customer migration is restricted to 127.0.0.1:5432/uk_exim_erp_dev.");
  }
  return url;
}

export function inspectBackup(raw) {
  const digest = createHash("sha256").update(raw, "utf8").digest("hex").toUpperCase();
  if (digest !== EXPECTED_SHA256) throw new Error("The approved full-backup SHA-256 does not match.");
  let backup;
  try { backup = JSON.parse(raw); } catch { throw new Error("The approved full backup is not valid JSON."); }
  if (backup?.format !== "UK-EXIM-ERP-FULL-RAW-BACKUP" || backup?.formatVersion !== 1
    || !backup.keys || typeof backup.keys !== "object" || Array.isArray(backup.keys)) {
    throw new Error("The approved full-backup envelope is invalid.");
  }
  const entry = backup.keys[CUSTOMER_KEY];
  if (!entry || entry.exists !== true || typeof entry.raw !== "string" || entry.parseSucceeded !== true) {
    throw new Error("The Domestic Customer source entry is missing or invalid.");
  }
  const entryHash = createHash("sha256").update(entry.raw, "utf8").digest("hex");
  if (entryHash !== entry.sha256) throw new Error("The Domestic Customer raw-entry checksum does not match its backup manifest.");
  let customers;
  try { customers = JSON.parse(entry.raw); } catch { throw new Error("Domestic Customer raw data is not valid JSON."); }
  if (!Array.isArray(customers) || customers.length !== 39 || entry.recordCount !== customers.length) {
    throw new Error("Domestic Customer source must contain exactly 39 records.");
  }
  const ids = new Set();
  const codes = new Set();
  for (const customer of customers) {
    if (!customer || typeof customer !== "object" || Array.isArray(customer)) throw new Error("A Domestic Customer source row is not an object.");
    for (const field of CUSTOMER_FIELDS) {
      const value = customer[field];
      const numeric = field === "openingBalance" || field === "creditLimit";
      if (!(field in customer) || (numeric
        ? typeof value !== "number" || !Number.isFinite(value)
        : typeof value !== "string")) {
        throw new Error(`A Domestic Customer source row has an invalid ${field} value type.`);
      }
    }
    if (!customer.id || !customer.code || !customer.name.trim()) throw new Error("A Domestic Customer row has an empty required identifier or name.");
    if (!(["Active", "Inactive"].includes(customer.status))) throw new Error("A Domestic Customer row has an unsupported status.");
    if (ids.has(customer.id) || codes.has(customer.code)) throw new Error("Domestic Customer source contains duplicate IDs or codes.");
    ids.add(customer.id);
    codes.add(customer.code);
  }
  return { backup, customers, sourceRaw: entry.raw, backupSha256: digest, sourceCount: customers.length };
}

async function verifyConnectedIdentity(client) {
  const result = await client.query(`
    SELECT current_database() AS database,
           host(inet_server_addr()) AS address,
           inet_server_port() AS port,
           current_setting('server_version') AS version`);
  const identity = result.rows[0];
  if (identity?.database !== EXPECTED_DATABASE || identity?.address !== "127.0.0.1" || Number(identity?.port) !== 5432) {
    throw new Error("Connected PostgreSQL identity is not exactly 127.0.0.1:5432/uk_exim_erp_dev.");
  }
  return identity;
}

async function inspectDatabase(client) {
  const companyResult = await client.query(
    "SELECT id::text AS id, name FROM public.companies WHERE name = $1 ORDER BY id",
    [EXPECTED_COMPANY],
  );
  const companyRows = companyResult.rows;
  const companyReady = companyRows.length === 1 && companyRows[0].id === EXPECTED_COMPANY_ID;
  const allCompanyCount = await client.query("SELECT count(*)::int AS count FROM public.companies WHERE id = $1", [EXPECTED_COMPANY_ID]);
  if (!companyReady || Number(allCompanyCount.rows[0].count) !== 1) {
    throw new Error("The exact verified UK EXIM ENTERPRISES company row was not found exactly once.");
  }

  const columnsResult = await client.query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers'",
  );
  const columns = new Map(columnsResult.rows.map((column) => [column.column_name, column]));
  const missingColumns = REQUIRED_COLUMNS.filter((name) => !columns.has(name));
  const tableExists = columnsResult.rowCount > 0;
  if (!tableExists) throw new Error("public.customers does not exist; refusing import.");

  const counts = await client.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE company_id = $1)::int AS target_company
       FROM public.customers`, [EXPECTED_COMPANY_ID],
  );
  const migrationRows = await client.query(
    "SELECT name, checksum FROM public._schema_migrations WHERE name = $1",
    ["003_customer_master.sql"],
  );
  const migrationSql = await readFile(new URL("../../db/migrations/003_customer_master.sql", import.meta.url), "utf8");
  const expectedMigrationChecksum = createHash("sha256").update(migrationSql, "utf8").digest("hex");
  const customerConstraints = await client.query(
    "SELECT count(*)::int AS count FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'customers'",
  );
  return {
    companyId: companyRows[0].id,
    companyMatchCount: companyRows.length,
    columns,
    missingColumns,
    tableCounts: counts.rows[0],
    migrationRecordCount: migrationRows.rowCount,
    migrationChecksumMatches: migrationRows.rowCount === 1 && migrationRows.rows[0].checksum === expectedMigrationChecksum,
    constraintCount: Number(customerConstraints.rows[0].count),
  };
}

async function findCollisions(client, customers) {
  const ids = customers.map((row) => row.id);
  const codes = customers.map((row) => row.code);
  const [idResult, codeResult] = await Promise.all([
    client.query("SELECT count(*)::int AS count FROM public.customers WHERE id = ANY($1::text[])", [ids]),
    client.query("SELECT count(*)::int AS count FROM public.customers WHERE company_id = $1 AND code = ANY($2::text[])", [EXPECTED_COMPANY_ID, codes]),
  ]);
  return { idConflicts: Number(idResult.rows[0].count), codeConflicts: Number(codeResult.rows[0].count) };
}

async function assertTypedSchema(client) {
  const definitions = await client.query(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'customers'`,
  );
  const byName = new Map(definitions.rows.map((row) => [row.column_name, row]));
  const missing = REQUIRED_COLUMNS.filter((name) => !byName.has(name));
  if (missing.length) throw new Error(`Customer schema migration is incomplete (${missing.length} required columns missing).`);
  const expectedTypes = {
    id: "text", company_id: "uuid", code: "text", name: "text", source_record: "jsonb",
    contact_person: "text", mobile: "text", email: "text", gst: "text", pan: "text",
    address: "text", city: "text", state: "text", country: "text", pin_code: "text",
    opening_balance: "numeric", credit_limit: "numeric", status: "text",
    whatsapp: "text", payment_terms: "text", remarks: "text",
  };
  for (const [name, dataType] of Object.entries(expectedTypes)) {
    if (byName.get(name)?.data_type !== dataType) throw new Error(`Customer schema column ${name} has an incompatible type.`);
    if (byName.get(name)?.is_nullable !== "NO" && !["whatsapp", "payment_terms", "remarks"].includes(name)) {
      throw new Error(`Customer schema column ${name} must be NOT NULL.`);
    }
  }
  const constraint = await client.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'customers'
      AND indexname = 'customers_company_code_uidx' AND indexdef ILIKE 'CREATE UNIQUE INDEX%'`,
  );
  if (!constraint.rowCount) throw new Error("Company-scoped unique customer-code index is missing.");
}

async function assertImportable(client, customers) {
  await assertTypedSchema(client);
  const collisions = await findCollisions(client, customers);
  if (collisions.idConflicts || collisions.codeConflicts) {
    throw Object.assign(new Error("Existing customer ID or company-scoped code collisions block the complete import."), { collisions });
  }
  return collisions;
}

async function verifyImportedCustomers(client, sourceRaw) {
  const verification = await client.query(`
    WITH source AS (
      SELECT value AS record FROM jsonb_array_elements($1::jsonb) AS value
    )
    SELECT count(*)::int AS source_count,
           count(*) FILTER (WHERE customer.id IS NULL)::int AS missing_count,
           count(*) FILTER (WHERE customer.source_record IS DISTINCT FROM source.record
             OR customer.company_id IS DISTINCT FROM $2::uuid
             OR customer.code IS DISTINCT FROM source.record->>'code'
             OR customer.name IS DISTINCT FROM source.record->>'name'
             OR customer.contact_person IS DISTINCT FROM source.record->>'contactPerson'
             OR customer.mobile IS DISTINCT FROM source.record->>'mobile'
             OR customer.email IS DISTINCT FROM source.record->>'email'
             OR customer.gst IS DISTINCT FROM source.record->>'gst'
             OR customer.pan IS DISTINCT FROM source.record->>'pan'
             OR customer.address IS DISTINCT FROM source.record->>'address'
             OR customer.city IS DISTINCT FROM source.record->>'city'
             OR customer.state IS DISTINCT FROM source.record->>'state'
             OR customer.country IS DISTINCT FROM source.record->>'country'
             OR customer.pin_code IS DISTINCT FROM source.record->>'pinCode'
             OR customer.opening_balance IS DISTINCT FROM (source.record->>'openingBalance')::numeric
             OR customer.credit_limit IS DISTINCT FROM (source.record->>'creditLimit')::numeric
             OR customer.status IS DISTINCT FROM source.record->>'status'
           )::int AS mismatch_count
      FROM source LEFT JOIN public.customers AS customer
        ON customer.company_id = $2::uuid AND customer.id = source.record->>'id'`,
  [sourceRaw, EXPECTED_COMPANY_ID]);
  const companyCount = await client.query(
    "SELECT count(*)::int AS count FROM public.customers WHERE company_id = $1",
    [EXPECTED_COMPANY_ID],
  );
  const result = {
    sourceCount: Number(verification.rows[0].source_count),
    missingCount: Number(verification.rows[0].missing_count),
    mismatchCount: Number(verification.rows[0].mismatch_count),
    targetCompanyCustomerCount: Number(companyCount.rows[0].count),
  };
  if (result.sourceCount !== 39 || result.missingCount !== 0 || result.mismatchCount !== 0 || result.targetCompanyCustomerCount !== 39) {
    throw Object.assign(new Error("Post-import exact source reconciliation failed."), { verification: result });
  }
  return result;
}

export async function runCustomerMigration({ apply = false, verify = false, connectionString = process.env.DATABASE_URL, sourceFile = SOURCE_FILE, clientFactory } = {}) {
  if (apply && verify) throw new Error("Choose either --apply or --verify.");
  if (process.env.NODE_ENV === "production") throw new Error("Domestic Customer migration is disabled in production mode.");
  const url = parseStrictDevelopmentUrl(connectionString);
  const raw = await readFile(sourceFile, "utf8");
  const source = inspectBackup(raw);
  const client = clientFactory ? clientFactory(url.toString()) : new pg.Client({ connectionString: url.toString() });
  await client.connect();
  let transactionOpen = false;
  try {
    if (apply) {
      await client.query("BEGIN");
      transactionOpen = true;
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [MIGRATION_LOCK]);
    } else {
      await client.query("BEGIN READ ONLY");
      transactionOpen = true;
    }
    const identity = await verifyConnectedIdentity(client);
    const databaseState = await inspectDatabase(client);
    const schemaReady = databaseState.missingColumns.length === 0;
    if (schemaReady) await assertTypedSchema(client);
    if (verify) {
      const verification = await verifyImportedCustomers(client, source.sourceRaw);
      await client.query("ROLLBACK");
      transactionOpen = false;
      return {
        mode: "verify",
        database: identity.database,
        address: identity.address,
        port: Number(identity.port),
        version: identity.version,
        companyId: databaseState.companyId,
        customerMigrationRecordCount: databaseState.migrationRecordCount,
        customerMigrationChecksumMatches: databaseState.migrationChecksumMatches,
        backupSha256: source.backupSha256,
        ...verification,
        stockTablesTouched: false,
        writesPerformed: false,
        verified: true,
      };
    }
    const collisions = await findCollisions(client, source.customers);
    if (apply) {
      if (!schemaReady) throw new Error("The Customer Master schema migration has not been applied.");
      await assertImportable(client, source.customers);
      const result = await client.query(`
        WITH source AS (
          SELECT value AS record FROM jsonb_array_elements($1::jsonb) AS value
        )
        INSERT INTO public.customers (
          id, company_id, code, name, contact_person, mobile, email, gst, pan, address,
          city, state, country, pin_code, opening_balance, credit_limit, status,
          whatsapp, payment_terms, remarks, source_record
        )
        SELECT record->>'id', $2::uuid, record->>'code', record->>'name',
          record->>'contactPerson', record->>'mobile', record->>'email', record->>'gst',
          record->>'pan', record->>'address', record->>'city', record->>'state',
          record->>'country', record->>'pinCode', (record->>'openingBalance')::numeric,
          (record->>'creditLimit')::numeric, record->>'status', record->>'whatsapp',
          record->>'paymentTerms', record->>'remarks', record
        FROM source
        RETURNING id`, [source.sourceRaw, EXPECTED_COMPANY_ID]);
      if (result.rowCount !== source.sourceCount) throw new Error("Inserted customer count did not equal the verified source count.");
      const verification = await verifyImportedCustomers(client, source.sourceRaw);
      await client.query("COMMIT");
      transactionOpen = false;
      return { mode: "apply", database: identity.database, address: identity.address, port: Number(identity.port), version: identity.version, companyId: databaseState.companyId, sourceCount: source.sourceCount, insertedCount: result.rowCount, idConflicts: 0, codeConflicts: 0, verification, stockTablesTouched: false, committed: true };
    }
    const ready = schemaReady && collisions.idConflicts === 0 && collisions.codeConflicts === 0;
    await client.query("ROLLBACK");
    transactionOpen = false;
    return {
      mode: "dry-run",
      database: identity.database,
      address: identity.address,
      port: Number(identity.port),
      version: identity.version,
      companyId: databaseState.companyId,
      companyMatchCount: databaseState.companyMatchCount,
      customerMigrationRecordCount: databaseState.migrationRecordCount,
      customerMigrationChecksumMatches: databaseState.migrationChecksumMatches,
      customerConstraintCount: databaseState.constraintCount,
      backupSha256: source.backupSha256,
      sourceCount: source.sourceCount,
      validCount: source.customers.length,
      existingDevCustomerCount: Number(databaseState.tableCounts.total),
      existingCompanyCustomerCount: Number(databaseState.tableCounts.target_company),
      idConflicts: collisions.idConflicts,
      codeConflicts: collisions.codeConflicts,
      missingColumns: databaseState.missingColumns,
      schemaReady,
      stockTablesTouched: false,
      ready,
      reason: ready ? null : !schemaReady ? "customer-schema-migration-pending" : "customer-conflicts-found",
      writesPerformed: false,
    };
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
  if (args.some((arg) => !["--apply", "--verify"].includes(arg)) || args.length > 1) {
    console.error("Usage: node scripts/customers/legacy-domestic-customers-migration.mjs [--apply|--verify]");
    process.exitCode = 2;
  } else {
    try {
      const report = await runCustomerMigration({ apply: args.includes("--apply"), verify: args.includes("--verify") });
      console.log(JSON.stringify(report, null, 2));
      if (!report.ready && report.mode === "dry-run") process.exitCode = 1;
    } catch (error) {
      console.error(JSON.stringify({ error: error.message, collisions: error.collisions ?? null, writesPerformed: false }));
      process.exitCode = 1;
    }
  }
}
