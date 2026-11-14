import "../db/env.mjs";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  parseProductsUiTestDatabaseUrl,
  PRODUCTS_UI_TEST_COMPANY_NAME,
  verifyProductsUiTestDatabase,
} from "../../app/lib/db/products-ui-test.mjs";
import { readProductsUiFixtureManifest } from "../../app/product/server/products-ui-test-manifest.mjs";

const MANIFEST_PATH = path.resolve(process.cwd(), ".local-test", "supplier-browser-fixture.json");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertTestEnvironment() {
  if (process.env.NODE_ENV !== "development" || process.env.UKEXIM_PRODUCTS_UI_TEST_MODE !== "1") {
    throw new Error("Supplier browser fixture requires explicit development TEST mode.");
  }
  if (process.env.BETTER_AUTH_URL !== "http://localhost:3001") {
    throw new Error("Supplier browser fixture requires canonical BETTER_AUTH_URL http://localhost:3001.");
  }
  return parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL).toString();
}

function validateRunManifest(manifest, ownerFixture) {
  if (!manifest || typeof manifest !== "object"
    || Object.keys(manifest).some((key) => !["version", "database", "companyId", "userId", "marker", "supplierIds", "sessionIds"].includes(key))
    || manifest.version !== 1 || manifest.database !== "uk_exim_erp_test"
    || manifest.companyId !== ownerFixture.companyId || manifest.userId !== ownerFixture.userId
    || typeof manifest.marker !== "string" || !/^SYNTHETIC-SUPPLIER-UI-[0-9A-F]{8}$/.test(manifest.marker)
    || !Array.isArray(manifest.supplierIds) || manifest.supplierIds.some((id) => typeof id !== "string" || !UUID.test(id))
    || new Set(manifest.supplierIds).size !== manifest.supplierIds.length
    || (manifest.sessionIds !== undefined && (!Array.isArray(manifest.sessionIds)
      || manifest.sessionIds.some((id) => typeof id !== "string" || id.length < 1 || id.length > 200)
      || new Set(manifest.sessionIds).size !== manifest.sessionIds.length))) {
    throw new Error("Supplier browser fixture manifest is invalid or does not match the TEST owner manifest.");
  }
  return { ...manifest, sessionIds: manifest.sessionIds ?? [] };
}

async function readRunManifest(ownerFixture) {
  let value;
  try { value = JSON.parse(await readFile(MANIFEST_PATH, "utf8")); }
  catch { throw new Error("Supplier browser fixture manifest is missing or unreadable; refusing cleanup."); }
  return validateRunManifest(value, ownerFixture);
}

async function connectVerified(connectionString) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try { await verifyProductsUiTestDatabase(client); }
  catch (error) { await client.end(); throw error; }
  return client;
}

async function verifyFixtureOwner(client, fixture) {
  const company = await client.query("SELECT id FROM public.companies WHERE id=$1 AND name=$2", [fixture.companyId, PRODUCTS_UI_TEST_COMPANY_NAME]);
  const member = await client.query("SELECT user_id FROM auth.company_memberships WHERE company_id=$1 AND user_id=$2 AND role='owner'", [fixture.companyId, fixture.userId]);
  const user = await client.query('SELECT id FROM auth."user" WHERE id=$1', [fixture.userId]);
  if (company.rowCount !== 1 || member.rowCount !== 1 || user.rowCount !== 1) {
    throw new Error("Synthetic company, owner, or membership does not match the original TEST fixture.");
  }
}

async function prepare(connectionString) {
  const ownerFixture = await readProductsUiFixtureManifest();
  await readFile(MANIFEST_PATH).then(
    () => { throw new Error("A Supplier browser fixture manifest already exists; inspect it before continuing."); },
    (error) => { if (error.code !== "ENOENT") throw error; },
  );
  const client = await connectVerified(connectionString);
  const marker = `SYNTHETIC-SUPPLIER-UI-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  try {
    await client.query("BEGIN READ ONLY");
    await verifyFixtureOwner(client, ownerFixture);
    const existing = await client.query("SELECT count(*)::int AS count FROM public.suppliers WHERE source_record->>'contactPerson'=$1", [marker]);
    if (Number(existing.rows[0].count) !== 0) throw new Error("Generated Supplier test marker unexpectedly already exists.");
    const sessions = await client.query('SELECT count(*)::int AS count FROM auth."session" WHERE "userId"=$1', [ownerFixture.userId]);
    if (Number(sessions.rows[0].count) !== 0) throw new Error("Synthetic TEST owner already has sessions; refusing to start a browser fixture run.");
    const counts = await client.query("SELECT count(*)::int AS count FROM public.suppliers WHERE company_id=$1", [ownerFixture.companyId]);
    await client.query("ROLLBACK");
    const manifest = {
      version: 1,
      database: "uk_exim_erp_test",
      companyId: ownerFixture.companyId,
      userId: ownerFixture.userId,
      marker,
      supplierIds: [],
      sessionIds: [],
    };
    await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
    await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    console.log(JSON.stringify({ operation: "prepared", database: "uk_exim_erp_test", companySupplierCountBefore: Number(counts.rows[0].count), marker }));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function record(connectionString) {
  const ownerFixture = await readProductsUiFixtureManifest();
  const manifest = await readRunManifest(ownerFixture);
  const client = await connectVerified(connectionString);
  try {
    await client.query("BEGIN READ ONLY");
    await verifyFixtureOwner(client, ownerFixture);
    const rows = await client.query(
      "SELECT id::text AS id, company_id::text AS company_id, code, name, source_record->>'contactPerson' AS marker FROM public.suppliers WHERE source_record->>'contactPerson'=$1 ORDER BY id",
      [manifest.marker],
    );
    if (rows.rowCount !== 1 || rows.rows[0].company_id !== manifest.companyId
      || rows.rows[0].marker !== manifest.marker
      || rows.rows[0].name !== rows.rows[0].name.trim()
      || !rows.rows[0].code) {
      throw new Error("Exactly one Supplier matching the unique TEST marker and company must exist before recording its ID.");
    }
    const supplierId = rows.rows[0].id;
    if (manifest.supplierIds.length && !manifest.supplierIds.includes(supplierId)) {
      throw new Error("A different Supplier ID was already recorded for this browser test.");
    }
    const sessions = await client.query('SELECT id FROM auth."session" WHERE "userId"=$1 ORDER BY id', [ownerFixture.userId]);
    await client.query("ROLLBACK");
    if (!manifest.supplierIds.includes(supplierId)) manifest.supplierIds.push(supplierId);
    manifest.sessionIds = sessions.rows.map((row) => row.id);
    await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "w" });
    console.log(JSON.stringify({ operation: "recorded", database: "uk_exim_erp_test", supplierCount: 1, idRecorded: true }));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function cleanup(connectionString) {
  const ownerFixture = await readProductsUiFixtureManifest();
  const manifest = await readRunManifest(ownerFixture);
  const client = await connectVerified(connectionString);
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('supplier-ui:' || $1::text, 0))", [manifest.companyId]);
    await verifyFixtureOwner(client, ownerFixture);
    const markedRows = await client.query(
      "SELECT id::text AS id, company_id::text AS company_id, code, name, source_record->>'contactPerson' AS marker FROM public.suppliers WHERE source_record->>'contactPerson'=$1 FOR UPDATE",
      [manifest.marker],
    );
    const sessions = await client.query(
      'SELECT id, "userId" FROM auth."session" WHERE "userId"=$1 OR id=ANY($2::text[]) ORDER BY id FOR UPDATE',
      [manifest.userId, manifest.sessionIds],
    );
    if (sessions.rows.some((row) => row.userId !== manifest.userId
      || !manifest.sessionIds.includes(row.id))) {
      throw new Error("A browser session is not recorded for the exact synthetic TEST owner; cleanup refused.");
    }
    const markedIds = markedRows.rows.map((row) => row.id);
    const trackedIds = manifest.supplierIds;
    if (markedRows.rows.some((row) => row.company_id !== manifest.companyId || row.marker !== manifest.marker
      || row.name !== row.name.trim() || !row.code)
      || (trackedIds.length && (markedIds.length !== trackedIds.length || trackedIds.some((id) => !markedIds.includes(id))))) {
      throw new Error("Marked Supplier ownership or ID set differs from the test manifest; cleanup refused.");
    }
    const idsToDelete = trackedIds.length ? trackedIds : markedIds;
    if (idsToDelete.length) {
      const supplierCodes = markedRows.rows.filter((row) => idsToDelete.includes(row.id)).map((row) => row.code);
      const references = await client.query(
        "SELECT count(*)::int AS count FROM public.purchases WHERE company_id=$1 AND supplier_code=ANY($2::text[])",
        [manifest.companyId, supplierCodes],
      );
      if (Number(references.rows[0].count) !== 0) throw new Error("A test Supplier is referenced by a purchase; cleanup refused.");
      await client.query(
        "DELETE FROM public.suppliers WHERE company_id=$1 AND id=ANY($2::text[]) AND source_record->>'contactPerson'=$3",
        [manifest.companyId, idsToDelete, manifest.marker],
      );
    }
    const ownedSessionIds = sessions.rows.filter((row) => row.userId === manifest.userId).map((row) => row.id);
    if (ownedSessionIds.length) {
      await client.query('DELETE FROM auth."session" WHERE "userId"=$1 AND id=ANY($2::text[])', [manifest.userId, ownedSessionIds]);
    }
    const remaining = await client.query(
      "SELECT id FROM public.suppliers WHERE source_record->>'contactPerson'=$1 OR id=ANY($2::text[])",
      [manifest.marker, idsToDelete],
    );
    const remainingSessions = await client.query(
      'SELECT id FROM auth."session" WHERE "userId"=$1 OR id=ANY($2::text[])',
      [manifest.userId, manifest.sessionIds],
    );
    if (remaining.rowCount !== 0 || remainingSessions.rowCount !== 0) throw new Error("Supplier/session cleanup verification failed; manifest must be retained.");
    await client.query("COMMIT");
    await unlink(MANIFEST_PATH);
    console.log(JSON.stringify({ operation: "cleanup", database: "uk_exim_erp_test", removedSuppliers: idsToDelete.length, removedBrowserSessions: ownedSessionIds.length, verifiedAbsent: true, unrelatedRateLimitsPreserved: true }));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

const connectionString = assertTestEnvironment();
const operation = process.argv[2];
if (operation === "prepare") await prepare(connectionString);
else if (operation === "record") await record(connectionString);
else if (operation === "cleanup") await cleanup(connectionString);
else throw new Error("Choose exactly one operation: prepare, record, or cleanup.");
