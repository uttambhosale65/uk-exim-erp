import "./env.mjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { parseLocalPostgresUrl, verifyLocalPostgresConnection } from "../../app/lib/db/postgres-target.mjs";
import { parseProductsUiTestDatabaseUrl } from "../../app/lib/db/products-ui-test.mjs";
import { readProductsUiFixtureManifest } from "../../app/product/server/products-ui-test-manifest.mjs";
import { readMigrations, runMigrations, checksumMigration } from "./migrate-lib.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MANIFEST_PATH = path.join(ROOT, ".local-test", "e2e-disposable.json");
const PREFIX = "uk_exim_erp_e2e_disposable_";
const DB_NAME = /^uk_exim_erp_e2e_disposable_\d{14}_[a-f0-9]{8}$/;
const RUN_ID = /^\d{14}_[a-f0-9]{8}$/;
const MARKER = /^UKEXIM_E2E_CREATED_BY_RUN:[0-9]{14}_[a-f0-9]{8}:[a-f0-9]{32}$/;
const EXPECTED_MIGRATIONS = [
  "001_initial_foundation.sql", "002_auth_foundation.sql", "003_customer_master.sql", "004_supplier_master.sql",
  "005_transactional_trade_stock_ledger.sql", "006_immutable_stock_movement_events.sql",
  "007_stock_baseline_source_snapshot.sql", "008_verified_stock_baseline_gate.sql",
];
const MIGRATIONS_DIRECTORY = path.join(ROOT, "db", "migrations");
const PACKETS = [
  ["P0001", 50], ["P0002", 100], ["P0003", 200], ["P0004", 500], ["P0005", 1000],
];

function assertBaseTestEnvironment({ allowE2E = false } = {}) {
  if (process.env.NODE_ENV !== "development" || process.env.UKEXIM_PRODUCTS_UI_TEST_MODE !== "1") {
    throw new Error("Disposable E2E operations require explicit development Products UI TEST mode.");
  }
  if (!allowE2E && process.env.UKEXIM_E2E_DISPOSABLE_MODE !== undefined) {
    throw new Error("Create, seed, and cleanup commands must not inherit disposable application mode.");
  }
  return parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL).toString();
}

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function derivedUrl(source, database) {
  if (!DB_NAME.test(database) && database !== "uk_exim_erp_test" && database !== "postgres") {
    throw new Error("Database name is outside the exact TEST/disposable allow-list.");
  }
  const url = new URL(source);
  url.pathname = `/${database}`;
  return parseLocalPostgresUrl(url.toString(), database, "Local TEST connection").toString();
}

function validateManifest(value) {
  if (!value || typeof value !== "object" || value.version !== 1
    || value.sourceDatabase !== "uk_exim_erp_test"
    || !RUN_ID.test(value.runId || "")
    || value.databaseName !== `${PREFIX}${value.runId}` || !DB_NAME.test(value.databaseName)
    || !MARKER.test(value.marker || "") || !["creating", "created", "migrated", "seeded", "dropped"].includes(value.status)
    || !value.sourceSnapshot || !value.fixtureIds || !value.productOneBefore) {
    throw new Error("Disposable E2E manifest is invalid; refusing to use or remove a database.");
  }
  return value;
}

async function readManifest() {
  let raw;
  try { raw = await readFile(MANIFEST_PATH, "utf8"); }
  catch { throw new Error("Disposable E2E manifest is missing; refusing database cleanup or app start."); }
  try { return validateManifest(JSON.parse(raw)); }
  catch (error) { if (error instanceof SyntaxError) throw new Error("Disposable E2E manifest is unreadable."); throw error; }
}

async function writeManifest(manifest, { create = false } = {}) {
  validateManifest(manifest);
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  const temporary = `${MANIFEST_PATH}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    if (create) {
      // Hard-link creation is not portable on all Windows configurations; exclusive
      // copy semantics from writeFile keep the first run from replacing a manifest.
      await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
      await unlink(temporary);
    } else {
      await rename(temporary, MANIFEST_PATH);
    }
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

async function connectVerified(connectionString, expectedDatabase) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const identity = await verifyLocalPostgresConnection(client, expectedDatabase);
    if (identity.version !== "18.6") throw new Error("Disposable E2E databases require the verified local PostgreSQL 18.6 server.");
    return { client, identity };
  } catch (error) {
    await client.end();
    throw error;
  }
}

async function snapshot(client) {
  const migrationRows = (await client.query("SELECT name, checksum FROM public._schema_migrations ORDER BY name")).rows;
  const tableRows = (await client.query(`SELECT n.nspname AS schema_name,c.relname AS table_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','auth') AND c.relkind IN ('r','p')
    ORDER BY n.nspname,c.relname`)).rows;
  const columns = (await client.query(`SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default
    FROM information_schema.columns WHERE table_schema IN ('public','auth')
    ORDER BY table_schema,table_name,ordinal_position`)).rows;
  const indexes = (await client.query("SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('public','auth') ORDER BY schemaname,tablename,indexname")).rows;
  const constraints = (await client.query(`SELECT n.nspname AS schema_name,c.relname AS table_name,con.conname,con.contype,pg_get_constraintdef(con.oid,true) AS definition
    FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','auth') ORDER BY n.nspname,c.relname,con.conname`)).rows;
  const schemaDigest = createHash("sha256").update(JSON.stringify({ columns, indexes, constraints })).digest("hex");
  const tables = {};
  for (const table of tableRows) {
    const schema = quoteIdent(table.schema_name), name = quoteIdent(table.table_name);
    const rows = (await client.query(`SELECT row_to_json(r)::text AS data FROM ${schema}.${name} r ORDER BY 1`)).rows;
    const hash = createHash("sha256");
    for (const row of rows) hash.update(row.data).update("\n");
    tables[`${table.schema_name}.${table.table_name}`] = { count: rows.length, sha256: hash.digest("hex") };
  }
  return {
    migrations: migrationRows,
    migrationCount: migrationRows.length,
    schemaDigest,
    tableCount: tableRows.length,
    indexCount: indexes.length,
    constraintCount: constraints.length,
    tables,
  };
}

async function assertMigrationChecksums(client) {
  const applied = (await client.query("SELECT name,checksum FROM public._schema_migrations ORDER BY name")).rows;
  if (JSON.stringify(applied.map((row) => row.name)) !== JSON.stringify(EXPECTED_MIGRATIONS)) {
    throw new Error("Persistent TEST source must have exactly the verified migrations 001–008.");
  }
  for (const row of applied) {
    const sql = await readFile(path.join(MIGRATIONS_DIRECTORY, row.name), "utf8");
    const expected = createHash("sha256").update(sql, "utf8").digest("hex");
    if (row.checksum !== expected) throw new Error(`Persistent TEST migration checksum differs from source for ${row.name}.`);
  }
  return applied;
}

function assertSnapshotsEqual(left, right, label) {
  if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error(`${label} does not match the persistent TEST source snapshot.`);
}

async function verifyDisposableMigrations(client) {
  const migrations = await readMigrations();
  const applied = (await client.query("SELECT name,checksum FROM public._schema_migrations ORDER BY name")).rows;
  if (JSON.stringify(applied.map(row => row.name)) !== JSON.stringify(migrations.map(row => row.name))) {
    throw new Error("Disposable database migration history does not exactly match all repository migrations.");
  }
  for (const migration of migrations) {
    const row = applied.find(item => item.name === migration.name);
    if (!row || row.checksum !== checksumMigration(migration.sql)) {
      throw new Error(`Disposable database migration checksum does not match ${migration.name}.`);
    }
  }
  return applied.length;
}

async function fixtureSource(client) {
  const base = await readProductsUiFixtureManifest();
  if (base.status !== "ready" || base.companyName !== "SYNTHETIC PRODUCTS UI TEST COMPANY") {
    throw new Error("A ready synthetic Products TEST owner/company manifest is required.");
  }
  const company = await client.query("SELECT id FROM public.companies WHERE id=$1 AND name=$2", [base.companyId, base.companyName]);
  const owner = await client.query("SELECT user_id FROM auth.company_memberships WHERE company_id=$1 AND user_id=$2 AND role='owner'", [base.companyId, base.userId]);
  const user = await client.query('SELECT id FROM auth."user" WHERE id=$1', [base.userId]);
  if (company.rowCount !== 1 || owner.rowCount !== 1 || user.rowCount !== 1) {
    throw new Error("Persistent TEST clone source does not contain exactly the manifest-matched synthetic owner membership.");
  }
  const products = await client.query("SELECT id,code,name,category,hsn,gst,unit,net_weight::text AS net_weight,stock_base_code,purchase::text AS purchase,sale::text AS sale,mrp::text AS mrp,base_cost::text AS base_cost,packing_cost::text AS packing_cost,other_charges::text AS other_charges,total_cost::text AS total_cost,stock::text AS stock,minimum_stock::text AS minimum_stock,active FROM public.products WHERE company_id=$1 ORDER BY code", [base.companyId]);
  if (products.rowCount !== 1 || products.rows[0].code !== "P0001") {
    throw new Error("Disposable E2E preparation expects exactly the existing synthetic P0001 product; no product was modified.");
  }
  const counts = (await client.query(`SELECT
    (SELECT count(*)::int FROM public.customers WHERE company_id=$1) customers,
    (SELECT count(*)::int FROM public.suppliers WHERE company_id=$1) suppliers,
    (SELECT count(*)::int FROM public.purchases WHERE company_id=$1) purchases,
    (SELECT count(*)::int FROM public.sales WHERE company_id=$1) sales,
    (SELECT count(*)::int FROM public.stock_baselines WHERE company_id=$1) baselines,
    (SELECT count(*)::int FROM public.stock_movement_events WHERE company_id=$1) movements`, [base.companyId])).rows[0];
  if (Object.values(counts).some((value) => Number(value) !== 0)) {
    throw new Error("Persistent TEST synthetic company has business records; clone fixture assumptions are not satisfied.");
  }
  return { base, productOneBefore: products.rows[0] };
}

async function maintenance(sourceUrl) {
  const targetUrl = derivedUrl(sourceUrl, "postgres");
  const { client, identity } = await connectVerified(targetUrl, "postgres");
  return { client, identity };
}

async function createDisposable() {
  const sourceUrl = assertBaseTestEnvironment();
  if (existsSync(MANIFEST_PATH)) throw new Error("An E2E disposable manifest already exists; inspect and clean that exact run before creating another.");
  const sourceConnection = await connectVerified(sourceUrl, "uk_exim_erp_test");
  let sourceInfo, sourceSnapshot;
  try {
    const { rows } = await sourceConnection.client.query("SELECT current_setting('server_version') AS version");
    if (rows[0]?.version !== "18.6") throw new Error("Persistent TEST source must be PostgreSQL 18.6.");
    await sourceConnection.client.query("BEGIN READ ONLY");
    sourceInfo = await fixtureSource(sourceConnection.client);
    await assertMigrationChecksums(sourceConnection.client);
    sourceSnapshot = await snapshot(sourceConnection.client);
    await sourceConnection.client.query("ROLLBACK");
  } catch (error) {
    await sourceConnection.client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { await sourceConnection.client.end(); }

  const runId = `${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}_${randomBytes(4).toString("hex")}`;
  const databaseName = `${PREFIX}${runId}`;
  const marker = `UKEXIM_E2E_CREATED_BY_RUN:${runId}:${randomBytes(16).toString("hex")}`;
  const fixtureIds = {
    companyId: sourceInfo.base.companyId,
    ownerId: sourceInfo.base.userId,
    supplierId: randomUUID(),
    customerId: randomUUID(),
    products: Object.fromEntries(PACKETS.slice(1).map(([code]) => [code, randomUUID()])),
    p0006Id: randomUUID(),
    p0007Id: randomUUID(),
  };
  const manifest = {
    version: 1, sourceDatabase: "uk_exim_erp_test", databaseName, runId, marker,
    status: "creating", createdAt: new Date().toISOString(), sourceSnapshot,
    productOneBefore: sourceInfo.productOneBefore, fixtureIds,
  };
  await writeManifest(manifest, { create: true });

  const admin = await maintenance(sourceUrl);
  try {
    if (admin.identity.version !== "18.6") throw new Error("Maintenance connection is not PostgreSQL 18.6.");
    const permission = (await admin.client.query("SELECT rolcreatedb OR rolsuper AS allowed FROM pg_roles WHERE rolname=current_user")).rows[0];
    if (permission?.allowed !== true) throw new Error("Current local TEST database role cannot create a disposable database.");
    const targetExists = await admin.client.query("SELECT 1 FROM pg_database WHERE datname=$1", [databaseName]);
    if (targetExists.rowCount) throw new Error("Generated disposable database name already exists; refusing to overwrite it.");
    const sourceConnections = await admin.client.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname='uk_exim_erp_test' AND pid<>pg_backend_pid()");
    if (Number(sourceConnections.rows[0].n) !== 0) throw new Error("Persistent TEST has active connections; refusing template clone.");
    await admin.client.query(`CREATE DATABASE ${quoteIdent(databaseName)} TEMPLATE ${quoteIdent("uk_exim_erp_test")}`);
    await admin.client.query(`COMMENT ON DATABASE ${quoteIdent(databaseName)} IS '${marker}'`);
  } finally { await admin.client.end(); }

  manifest.status = "created";
  await writeManifest(manifest);
  const disposable = await connectVerified(derivedUrl(sourceUrl, databaseName), databaseName);
  let clonedSnapshot;
  try {
    clonedSnapshot = await snapshot(disposable.client);
  } finally { await disposable.client.end(); }
  assertSnapshotsEqual(sourceSnapshot, clonedSnapshot, "Disposable clone");
  console.log(JSON.stringify({ operation: "created and verified", source: "uk_exim_erp_test", disposableDatabase: databaseName,
    identity: { address: "127.0.0.1", port: 5432, version: "18.6" }, sourceCloneSnapshotMatch: true,
    tables: sourceSnapshot.tableCount, indexes: sourceSnapshot.indexCount, constraints: sourceSnapshot.constraintCount,
    migrations: sourceSnapshot.migrationCount, manifestContainsCredentials: false }));
}

async function migrateDisposable() {
  const sourceUrl = assertBaseTestEnvironment();
  const manifest = await readManifest();
  if (!["created", "migrated", "seeded"].includes(manifest.status)) {
    throw new Error("Disposable database must be created and verified before migrations can run.");
  }
  const connection = await connectVerified(derivedUrl(sourceUrl, manifest.databaseName), manifest.databaseName);
  let applied = 0, current = 0;
  try {
    if (connection.identity.version !== "18.6") throw new Error("Disposable migration target must be local PostgreSQL 18.6.");
    const marker = await connection.client.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
    if (marker.rows[0]?.marker !== manifest.marker) throw new Error("Disposable database marker does not match the active run manifest; refusing migration.");
    ({ applied, current } = await runMigrations(connection.client, await readMigrations()));
    const migrationCount = await verifyDisposableMigrations(connection.client);
    const expectedMigrationCount = (await readMigrations()).length;
    if (migrationCount !== expectedMigrationCount) throw new Error("Disposable database must contain exactly the reviewed repository migrations.");
    if (manifest.status !== "seeded") {
      manifest.status = "migrated";
      manifest.migratedAt = new Date().toISOString();
      await writeManifest(manifest);
    }
    console.log(JSON.stringify({ operation: "disposable migrations verified", database: manifest.databaseName,
      identity: { address: connection.identity.address, port: connection.identity.port, version: connection.identity.version },
      appliedThisRun: applied, current: current, migrationCount, expectedMigrationCount,
      persistentTestWrites: false, developmentDatabaseConnected: false }));
  } finally { await connection.client.end(); }
}

function productValues(code, id, weight, unit, stockBase, runId) {
  return [id, code, `Synthetic E2E ${code} ${runId.slice(-8)}`, "Synthetic E2E", "0000", "5%", unit, weight, stockBase,
    "1", "2", "3", "1", "0", "0", "1", "0", "0", true];
}

async function verifySeeded(client, manifest) {
  const companyId = manifest.fixtureIds.companyId;
  const ownership = await client.query(`SELECT
    (SELECT count(*)::int FROM public.companies WHERE id=$1 AND name='SYNTHETIC PRODUCTS UI TEST COMPANY') company,
    (SELECT count(*)::int FROM auth.company_memberships WHERE company_id=$1 AND user_id=$2 AND role='owner') owner_membership,
    (SELECT count(*)::int FROM auth."user" WHERE id=$2) owner_user,
    (SELECT count(*)::int FROM public.suppliers WHERE company_id=$1 AND id=$3 AND source_record->>'e2eRunId'=$4) supplier,
    (SELECT count(*)::int FROM public.customers WHERE company_id=$1 AND id=$5 AND source_record->>'e2eRunId'=$4) customer,
    (SELECT count(*)::int FROM public.suppliers WHERE company_id=$1) supplier_total,
    (SELECT count(*)::int FROM public.customers WHERE company_id=$1) customer_total,
    (SELECT count(*)::int FROM public.products WHERE company_id=$1) products,
    (SELECT count(*)::int FROM public.stock_baselines WHERE company_id=$1 AND source_record->>'e2eRunId'=$4 AND verification_status='verified') baselines,
    (SELECT count(*)::int FROM public.stock_baselines WHERE company_id=$1) baseline_total`,
    [companyId, manifest.fixtureIds.ownerId, manifest.fixtureIds.supplierId, manifest.runId, manifest.fixtureIds.customerId]);
  const r = ownership.rows[0];
  if (["company","owner_membership","owner_user","supplier","customer"].some((key) => Number(r[key]) !== 1)
    || Number(r.supplier_total) !== 1 || Number(r.customer_total) !== 1
    || Number(r.products) !== 7 || Number(r.baselines) !== 2 || Number(r.baseline_total) !== 2) {
    throw new Error("Disposable synthetic fixture identity, product set, or protected baselines did not verify.");
  }
  const mappings = (await client.query("SELECT code,unit,net_weight::text AS weight,stock_base_code FROM public.products WHERE company_id=$1 ORDER BY code", [companyId])).rows;
  const expected = [
    ["P0001","Pkt","50","P0006"],["P0002","Pkt","100","P0006"],["P0003","Pkt","200","P0006"],
    ["P0004","Pkt","500","P0006"],["P0005","Pkt","1000","P0006"],["P0006","KG","0","P0006"],["P0007","Pkt","50","P0007"],
  ];
  if (JSON.stringify(mappings.map((row) => [row.code,row.unit,row.weight,row.stock_base_code])) !== JSON.stringify(expected)) {
    throw new Error("Disposable synthetic product stock mappings did not verify.");
  }
  return { company: Number(r.company), ownerMembership: Number(r.owner_membership), ownerUser: Number(r.owner_user),
    supplier: Number(r.supplier), customer: Number(r.customer), products: Number(r.products), baselines: Number(r.baselines) };
}

async function seedFixtures() {
  assertBaseTestEnvironment();
  let manifest = await readManifest();
  if (!["migrated", "seeded"].includes(manifest.status)) throw new Error("Disposable database migrations must be verified before fixture setup.");
  const sourceUrl = parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL).toString();
  const { client } = await connectVerified(derivedUrl(sourceUrl, manifest.databaseName), manifest.databaseName);
  let alreadyComplete = false;
  try {
    await client.query("BEGIN");
    await verifyDisposableMigrations(client);
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('e2e-fixture:' || $1::text,0))", [manifest.fixtureIds.companyId]);
    const companyId = manifest.fixtureIds.companyId;
    const before = await client.query(`SELECT
      (SELECT count(*)::int FROM public.suppliers WHERE company_id=$1) suppliers,
      (SELECT count(*)::int FROM public.customers WHERE company_id=$1) customers,
      (SELECT count(*)::int FROM public.stock_baselines WHERE company_id=$1) baselines,
      (SELECT count(*)::int FROM public.purchases WHERE company_id=$1) purchases,
      (SELECT count(*)::int FROM public.sales WHERE company_id=$1) sales,
      (SELECT count(*)::int FROM public.stock_movement_events WHERE company_id=$1) movements`, [companyId]);
    const p1 = await client.query("SELECT id,code,unit,net_weight::text AS net_weight,stock_base_code FROM public.products WHERE company_id=$1 AND code='P0001'", [companyId]);
    if (manifest.status === "seeded") {
      const counts = await verifySeeded(client, manifest);
      alreadyComplete = true;
      await client.query("ROLLBACK");
      console.log(JSON.stringify({ operation: "already seeded", disposableDatabase: manifest.databaseName, fixtureCounts: counts }));
      return;
    }
    const hasAny = Object.values(before.rows[0]).some((value) => Number(value) !== 0);
    if (hasAny) {
      const targetStatus = await verifySeeded(client, manifest).then(() => true, () => false);
      if (!targetStatus) throw new Error("Disposable company contains partial or unowned rows; refusing fixture writes.");
      alreadyComplete = true;
      await client.query("ROLLBACK");
    } else {
      const original = manifest.productOneBefore;
      if (p1.rowCount !== 1 || p1.rows[0].id !== original.id || p1.rows[0].unit !== original.unit
        || p1.rows[0].net_weight !== original.net_weight || p1.rows[0].stock_base_code !== original.stock_base_code) {
        throw new Error("The cloned synthetic P0001 changed before fixture setup; refusing to overwrite it.");
      }
      const definitions = [
        ["P0001", 50, "Pkt", "P0006", original.id],
        ...PACKETS.slice(1).map(([code, grams]) => [code, grams, "Pkt", "P0006", manifest.fixtureIds.products[code]]),
        ["P0006", 0, "KG", "P0006", manifest.fixtureIds.p0006Id],
        ["P0007", 50, "Pkt", "P0007", manifest.fixtureIds.p0007Id],
      ];
      for (const [code, weight, unit, base, id] of definitions) {
        const values = productValues(code, id, weight, unit, base, manifest.runId);
        if (code === "P0001") {
          await client.query(`UPDATE public.products SET name=$3,category=$4,hsn=$5,gst=$6,unit=$7,net_weight=$8,stock_base_code=$9,
            purchase=$10,sale=$11,mrp=$12,base_cost=$13,packing_cost=$14,other_charges=$15,total_cost=$16,stock=$17,minimum_stock=$18,active=$19
            WHERE company_id=$1 AND id=$2 AND code='P0001'`, [companyId, id, ...values.slice(2)]);
        } else {
          await client.query(`INSERT INTO public.products(id,company_id,code,name,category,hsn,gst,unit,net_weight,stock_base_code,purchase,sale,mrp,base_cost,packing_cost,other_charges,total_cost,stock,minimum_stock,active)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`, [id, companyId, ...values.slice(1)]);
        }
      }
      const markerJson = JSON.stringify({ syntheticE2E: true, e2eRunId: manifest.runId });
      await client.query(`INSERT INTO public.suppliers(id,company_id,code,name,source_record,contact_person,mobile,email,gst,pan,address,city,state,country,pin_code,opening_balance,credit_limit,status)
        VALUES($1,$2,'SUP0001',$3,$4::jsonb,$5,'9000000001',$6,'','','','Test City','','India','',0,0,'Active')`,
      [manifest.fixtureIds.supplierId, companyId, `Synthetic E2E Supplier ${manifest.runId.slice(-8)}`, markerJson, `E2E-SUPPLIER-${manifest.runId.slice(-8)}`, `supplier-${manifest.runId.slice(-8)}@example.invalid`]);
      await client.query(`INSERT INTO public.customers(id,company_id,code,name,source_record,contact_person,mobile,email,gst,pan,address,city,state,country,pin_code,opening_balance,credit_limit,status)
        VALUES($1,$2,'C0001',$3,$4::jsonb,$5,'9000000002',$6,'','','','Test City','','India','',0,0,'Active')`,
      [manifest.fixtureIds.customerId, companyId, `Synthetic E2E Customer ${manifest.runId.slice(-8)}`, markerJson, `E2E-CUSTOMER-${manifest.runId.slice(-8)}`, `customer-${manifest.runId.slice(-8)}@example.invalid`]);
      for (const [code, id, quantity] of [["P0006",manifest.fixtureIds.p0006Id,10],["P0007",manifest.fixtureIds.p0007Id,2]]) {
        const hash = createHash("sha256").update(`${manifest.marker}:${code}:${quantity}`).digest("hex");
        const stockSource = JSON.stringify({ syntheticE2E: true, e2eRunId: manifest.runId, note: "disposable test baseline; not a business opening balance" });
        await client.query(`INSERT INTO public.stock_baselines(id,company_id,product_code,product_name,hsn,unit,opening_stock,purchase_qty,sales_qty,current_stock,captured_at,source_record,verification_status,verification_sha256,verified_at)
          VALUES($1,$2,$3,$3,'0000','KG',$4,0,0,$4,now(),$5::jsonb,'verified',$6,now())`, [id,companyId,code,quantity,stockSource,hash]);
      }
      const counts = await verifySeeded(client, manifest);
      await client.query("COMMIT");
      manifest.status = "seeded";
      manifest.fixturesVerified = counts;
      await writeManifest(manifest);
      console.log(JSON.stringify({ operation: "synthetic fixtures seeded", disposableDatabase: manifest.databaseName, fixtureCounts: counts,
        syntheticBaselinesOnly: true, persistentTestTouched: false }));
      return;
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { await client.end(); }
  if (alreadyComplete && manifest.status !== "seeded") {
    manifest.status = "seeded";
    manifest.fixturesVerified = await verifyCloneSeededReadOnly(sourceUrl, manifest);
    await writeManifest(manifest);
    console.log(JSON.stringify({ operation: "recovered complete seed transaction", disposableDatabase: manifest.databaseName,
      fixtureCounts: manifest.fixturesVerified, persistentTestTouched: false }));
  }
}

async function verifyCloneSeededReadOnly(sourceUrl, manifest) {
  const { client } = await connectVerified(derivedUrl(sourceUrl, manifest.databaseName), manifest.databaseName);
  try { await client.query("BEGIN READ ONLY"); const counts = await verifySeeded(client, manifest); await client.query("ROLLBACK"); return counts; }
  catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { await client.end(); }
}

async function isDatabasePresent(client, databaseName) {
  return (await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [databaseName])).rowCount === 1;
}

async function activeConnections(client, databaseName) {
  return Number((await client.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()", [databaseName])).rows[0].n);
}

async function cleanupDisposable() {
  assertBaseTestEnvironment();
  const manifest = await readManifest();
  const sourceUrl = parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL).toString();
  const currentSource = await connectVerified(sourceUrl, "uk_exim_erp_test");
  let sourceUnchanged;
  try {
    await currentSource.client.query("BEGIN READ ONLY");
    sourceUnchanged = JSON.stringify(await snapshot(currentSource.client)) === JSON.stringify(manifest.sourceSnapshot);
    await currentSource.client.query("ROLLBACK");
  } catch (error) { await currentSource.client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { await currentSource.client.end(); }

  const admin = await maintenance(sourceUrl);
  try {
    const exists = await isDatabasePresent(admin.client, manifest.databaseName);
    if (!exists) {
      if (manifest.status !== "dropped") throw new Error("Manifest names a database that is absent but not verified as dropped; refusing to erase run evidence.");
    } else {
      const markerRow = await admin.client.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1", [manifest.databaseName]);
      if (markerRow.rows[0]?.marker !== manifest.marker) throw new Error("Disposable database run marker does not match the manifest; refusing DROP DATABASE.");
      const cloneClient = await connectVerified(derivedUrl(sourceUrl, manifest.databaseName), manifest.databaseName);
      try {
        await cloneClient.client.query("BEGIN READ ONLY");
        const actualMarker = (await cloneClient.client.query("SELECT current_database() AS database")).rows[0].database;
        if (actualMarker !== manifest.databaseName) throw new Error("Connected clone identity changed before cleanup.");
        await cloneClient.client.query("ROLLBACK");
      } finally { await cloneClient.client.end(); }
      const active = await activeConnections(admin.client, manifest.databaseName);
      if (active !== 0) throw new Error(`Disposable database still has ${active} active connection(s); stop only the exact E2E server and retry cleanup.`);
      await admin.client.query(`DROP DATABASE ${quoteIdent(manifest.databaseName)}`);
      if (await isDatabasePresent(admin.client, manifest.databaseName)) throw new Error("Disposable database remains after DROP; preserving the manifest.");
      manifest.status = "dropped";
      await writeManifest(manifest);
    }
  } finally { await admin.client.end(); }

  const sourceAfter = await connectVerified(sourceUrl, "uk_exim_erp_test");
  let sourceStillUnchanged;
  try {
    await sourceAfter.client.query("BEGIN READ ONLY");
    sourceStillUnchanged = JSON.stringify(await snapshot(sourceAfter.client)) === JSON.stringify(manifest.sourceSnapshot);
    await sourceAfter.client.query("ROLLBACK");
  } catch (error) { await sourceAfter.client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { await sourceAfter.client.end(); }
  const persistentTestUnchanged = sourceUnchanged && sourceStillUnchanged;
  if (persistentTestUnchanged && manifest.status === "dropped") await unlink(MANIFEST_PATH);
  console.log(JSON.stringify({ operation: "cleanup verified", disposableDatabase: manifest.databaseName,
    disposableDatabaseAbsent: true, persistentTestUnchanged, manifestRemoved: persistentTestUnchanged,
    persistentTestRateLimitRowsTouched: false, developmentDatabaseConnected: false }));
  if (!persistentTestUnchanged) throw new Error("Disposable DB was removed, but persistent TEST snapshot drifted; the manifest was retained for review.");
}

async function assertSeededDatabase(sourceUrl, manifest) {
  if (manifest.status !== "seeded") throw new Error("Application start requires a fully seeded disposable E2E database.");
  const target = await connectVerified(derivedUrl(sourceUrl, manifest.databaseName), manifest.databaseName);
  try {
    await target.client.query("BEGIN READ ONLY");
    const counts = await verifySeeded(target.client, manifest);
    await target.client.query("ROLLBACK");
    return counts;
  } catch (error) { await target.client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { await target.client.end(); }
}

async function assertPortFree(port) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function startDisposableApp() {
  const sourceUrl = assertBaseTestEnvironment({ allowE2E: true });
  const manifest = await readManifest();
  if (process.env.UKEXIM_E2E_DISPOSABLE_MODE !== "1") throw new Error("App runner requires UKEXIM_E2E_DISPOSABLE_MODE=1.");
  const fixtureCounts = await assertSeededDatabase(sourceUrl, manifest);
  const port = process.env.UKEXIM_E2E_PORT || "3002";
  if (!new Set(["3002", "3003"]).has(port)) throw new Error("Disposable E2E app port must be one of the isolated TEST ports 3002 or 3003.");
  await assertPortFree(Number(port));
  const nextCli = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const origin = `http://localhost:${port}`;
  const childEnv = { ...process.env,
    NODE_ENV: "development",
    UKEXIM_PRODUCTS_UI_TEST_MODE: "1",
    UKEXIM_E2E_DISPOSABLE_MODE: "1",
    UKEXIM_E2E_DATABASE_NAME: manifest.databaseName,
    UKEXIM_E2E_RUN_ID: manifest.runId,
    UKEXIM_E2E_DATABASE_URL: derivedUrl(sourceUrl, manifest.databaseName),
    BETTER_AUTH_URL: origin,
  };
  childEnv.DATABASE_URL = "";
  childEnv.TEST_DATABASE_URL = "";
  console.log(JSON.stringify({ operation: "starting isolated TEST app", origin, database: manifest.databaseName,
    fixtureCounts, developmentAndPersistentTestUrlsDisabledInChildEnvironment: true }));
  const child = spawn(process.execPath, [nextCli, "dev", "--hostname", "127.0.0.1", "--port", port], {
    cwd: ROOT, env: childEnv, stdio: "inherit", windowsHide: true,
  });
  const stopChild = () => { if (child.exitCode === null) child.kill("SIGINT"); };
  process.once("SIGINT", stopChild);
  process.once("SIGTERM", stopChild);
  const exit = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  process.off("SIGINT", stopChild);
  process.off("SIGTERM", stopChild);
  if (exit.code && exit.code !== 0) throw new Error(`Isolated Next.js server exited with code ${exit.code}.`);
}

const operation = process.argv[2];
if (operation === "create") await createDisposable();
else if (operation === "migrate") await migrateDisposable();
else if (operation === "seed") await seedFixtures();
else if (operation === "cleanup") await cleanupDisposable();
else if (operation === "start") await startDisposableApp();
else throw new Error("Choose exactly one operation: create, migrate, seed, start, or cleanup.");
