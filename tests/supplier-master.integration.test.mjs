import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import dotenv from "dotenv";
import pg from "pg";
import test from "node:test";
import { createSupplierDAL } from "../app/supplier/server/supplier-dal.mjs";
import { createSupplierRouteHandlers } from "../app/supplier/server/supplier-routes.mjs";
import { parseProductsUiTestDatabaseUrl } from "../app/lib/db/products-ui-test.mjs";

dotenv.config({ path: ".env.local", quiet: true });

function syntheticSupplier(label, suffix) {
  return {
    name: `Synthetic ${label}`,
    contactPerson: `Test Contact ${label}`,
    mobile: `9${String(suffix).padStart(9, "0")}`,
    email: `${label.toLowerCase().replace(/\s+/g, ".")}+${suffix}@example.invalid`,
    gst: `SYNTHETIC-GST-${suffix}`,
    pan: `SYNTHETIC-PAN-${suffix}`,
    address: "Synthetic test address",
    city: "Test City",
    state: "Test State",
    country: "Test Country",
    pinCode: "000000",
    openingBalance: 12.34,
    creditLimit: 100.01,
    status: "Active",
  };
}

function apiRequest(path, { method = "GET", body, origin = "http://127.0.0.1" } = {}) {
  return new Request(new URL(path, "http://127.0.0.1"), {
    method,
    headers: {
      ...(origin ? { origin } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("TEST database Supplier API lifecycle is company-scoped and fixture-cleaned", async () => {
  const url = parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "5432");
  assert.equal(url.pathname, "/uk_exim_erp_test");

  const database = new pg.Pool({ connectionString: url.toString(), max: 3 });
  const cleanupClient = new pg.Client({ connectionString: url.toString() });
  const companies = [
    { id: randomUUID(), name: `Synthetic Supplier API Test A ${randomUUID()}` },
    { id: randomUUID(), name: `Synthetic Supplier API Test B ${randomUUID()}` },
  ];
  const supplierIds = [];
  let companyFixturesInserted = false;

  try {
    await cleanupClient.connect();
    const identity = await cleanupClient.query(`
      SELECT current_database() AS database, host(inet_server_addr()) AS address,
             inet_server_port() AS port, current_setting('server_version') AS version`);
    assert.equal(identity.rows[0]?.database, "uk_exim_erp_test");
    assert.equal(identity.rows[0]?.address, "127.0.0.1");
    assert.equal(Number(identity.rows[0]?.port), 5432);

    const migrationSql = await readFile(new URL("../db/migrations/004_supplier_master.sql", import.meta.url), "utf8");
    const expectedChecksum = createHash("sha256").update(migrationSql, "utf8").digest("hex");
    const migrationRecord = await cleanupClient.query(
      "SELECT count(*)::int AS count, min(checksum) AS checksum FROM public._schema_migrations WHERE name=$1",
      ["004_supplier_master.sql"],
    );
    assert.equal(Number(migrationRecord.rows[0].count), 1);
    assert.equal(migrationRecord.rows[0].checksum, expectedChecksum);

    const requiredColumns = await cleanupClient.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='suppliers'`);
    const columnNames = new Set(requiredColumns.rows.map(({ column_name }) => column_name));
    for (const column of ["contact_person", "mobile", "email", "gst", "pan", "address", "city", "state", "country", "pin_code", "opening_balance", "credit_limit", "status"]) {
      assert.ok(columnNames.has(column), `TEST migration must add suppliers.${column}`);
    }
    const uniqueIndex = await cleanupClient.query(`
      SELECT indexdef FROM pg_indexes
      WHERE schemaname='public' AND tablename='suppliers' AND indexname='suppliers_company_code_uidx'`);
    assert.equal(uniqueIndex.rowCount, 1);
    assert.match(uniqueIndex.rows[0].indexdef, /UNIQUE.*\(company_id, code\)/i);
    const statusConstraint = await cleanupClient.query(
      "SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='suppliers_status_check' AND conrelid='public.suppliers'::regclass",
    );
    assert.equal(statusConstraint.rowCount, 1);
    assert.match(statusConstraint.rows[0].definition, /Active.*Inactive/);

    await cleanupClient.query(
      "INSERT INTO public.companies (id, name) VALUES ($1, $2), ($3, $4)",
      [companies[0].id, companies[0].name, companies[1].id, companies[1].name],
    );
    companyFixturesInserted = true;

    let activeCompanyId = companies[0].id;
    const dal = createSupplierDAL({
      getOwnerContext: async () => ({ company: { company_id: activeCompanyId } }),
      database,
    });
    const handlers = createSupplierRouteHandlers(dal);

    const first = syntheticSupplier("Alpha", 200000001);
    const createFirst = await handlers.create(apiRequest("/api/suppliers", { method: "POST", body: first }));
    assert.equal(createFirst.status, 201);
    const firstSupplier = (await createFirst.json()).supplier;
    assert.equal(firstSupplier.code, "SUP0001");
    supplierIds.push({ id: firstSupplier.id, companyId: companies[0].id });

    const list = await handlers.list(apiRequest("/api/suppliers"));
    assert.equal(list.status, 200);
    const listData = await list.json();
    assert.equal(listData.suppliers.length, 1);
    assert.equal(listData.suppliers[0].id, firstSupplier.id);
    assert.equal(listData.nextCode, "SUP0002");

    const view = await handlers.get(apiRequest(`/api/suppliers/${firstSupplier.id}`), firstSupplier.id);
    assert.equal(view.status, 200);
    assert.equal((await view.json()).supplier.id, firstSupplier.id);

    await cleanupClient.query(
      "UPDATE public.suppliers SET source_record=source_record || '{\"legacyUnmapped\":\"preserve-me\"}'::jsonb WHERE id=$1 AND company_id=$2",
      [firstSupplier.id, companies[0].id],
    );
    const updated = { ...first, name: "Synthetic Alpha Edited", city: "Edited Synthetic City" };
    const update = await handlers.update(apiRequest(`/api/suppliers/${firstSupplier.id}`, { method: "PATCH", body: updated }), firstSupplier.id);
    assert.equal(update.status, 200);
    assert.equal((await update.json()).supplier.name, updated.name);
    const storedAfterUpdate = await cleanupClient.query("SELECT opening_balance::text, credit_limit::text, source_record->>'legacyUnmapped' AS legacy_unmapped FROM public.suppliers WHERE id=$1", [firstSupplier.id]);
    assert.deepEqual(storedAfterUpdate.rows[0], { opening_balance: "12.34", credit_limit: "100.01", legacy_unmapped: "preserve-me" });

    for (const query of [updated.name, firstSupplier.code, first.mobile]) {
      const response = await handlers.list(apiRequest(`/api/suppliers?q=${encodeURIComponent(query)}`));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).suppliers.length, 1);
    }

    const warningResponse = await handlers.duplicateCheck(apiRequest("/api/suppliers/duplicate-check", {
      method: "POST", body: { mobile: first.mobile, email: first.email, gst: first.gst },
    }));
    assert.deepEqual((await warningResponse.json()).warnings, ["mobile", "email", "gst"]);

    const second = syntheticSupplier("Beta", 200000002);
    second.mobile = first.mobile;
    second.email = first.email;
    second.gst = first.gst;
    const createSecond = await handlers.create(apiRequest("/api/suppliers", { method: "POST", body: second }));
    assert.equal(createSecond.status, 201, "duplicate mobile/email/GST remain warnings, not hard uniqueness rules");
    const secondSupplier = (await createSecond.json()).supplier;
    assert.equal(secondSupplier.code, "SUP0002");
    supplierIds.push({ id: secondSupplier.id, companyId: companies[0].id });

    await cleanupClient.query("BEGIN");
    await cleanupClient.query("SAVEPOINT duplicate_supplier_code");
    let duplicateCodeRejected = false;
    try {
      await cleanupClient.query(
        `INSERT INTO public.suppliers (id, company_id, code, name, source_record)
         VALUES ($1, $2, $3, $4, '{}'::jsonb)`,
        [randomUUID(), companies[0].id, firstSupplier.code, "Synthetic Duplicate Code"],
      );
    } catch (error) {
      if (error.code !== "23505") throw error;
      duplicateCodeRejected = true;
      await cleanupClient.query("ROLLBACK TO SAVEPOINT duplicate_supplier_code");
    }
    await cleanupClient.query("RELEASE SAVEPOINT duplicate_supplier_code");
    await cleanupClient.query("ROLLBACK");
    assert.equal(duplicateCodeRejected, true, "same-company supplier codes must be unique");

    const deactivated = await handlers.setStatus(apiRequest(`/api/suppliers/${firstSupplier.id}`, { method: "DELETE" }), firstSupplier.id, "Inactive");
    const deactivatedBody = await deactivated.json();
    assert.equal(deactivated.status, 200, JSON.stringify(deactivatedBody));
    assert.equal(deactivatedBody.supplier.status, "Inactive");
    assert.equal((await (await handlers.list(apiRequest("/api/suppliers?status=Active"))).json()).suppliers.length, 1);
    assert.equal((await (await handlers.list(apiRequest("/api/suppliers?status=Inactive"))).json()).suppliers.length, 1);
    const reactivated = await handlers.setStatus(apiRequest(`/api/suppliers/${firstSupplier.id}`, { method: "POST" }), firstSupplier.id, "Active");
    const reactivatedBody = await reactivated.json();
    assert.equal(reactivated.status, 200, JSON.stringify(reactivatedBody));
    assert.equal(reactivatedBody.supplier.status, "Active");

    const invalid = await handlers.create(apiRequest("/api/suppliers", { method: "POST", body: { ...first, companyId: companies[0].id } }));
    assert.equal(invalid.status, 400);
    assert.match(invalid.headers.get("content-type"), /application\/json/);
    const invalidStatus = await handlers.create(apiRequest("/api/suppliers", { method: "POST", body: { ...first, status: "Suspended" } }));
    assert.equal(invalidStatus.status, 400);
    const badQuery = await handlers.list(apiRequest(`/api/suppliers?q=${"x".repeat(101)}`));
    assert.equal(badQuery.status, 400);
    const crossOrigin = await handlers.create(apiRequest("/api/suppliers", { method: "POST", body: first, origin: "https://attacker.invalid" }));
    assert.equal(crossOrigin.status, 403);

    activeCompanyId = companies[1].id;
    const otherCompanyCreate = await handlers.create(apiRequest("/api/suppliers", { method: "POST", body: syntheticSupplier("Company B", 200000003) }));
    assert.equal(otherCompanyCreate.status, 201);
    const otherSupplier = (await otherCompanyCreate.json()).supplier;
    assert.equal(otherSupplier.code, "SUP0001");
    supplierIds.push({ id: otherSupplier.id, companyId: companies[1].id });
    assert.equal((await (await handlers.list(apiRequest("/api/suppliers"))).json()).suppliers.length, 1);
    assert.equal((await handlers.get(apiRequest(`/api/suppliers/${firstSupplier.id}`), firstSupplier.id)).status, 404);

    const unauthorizedHandlers = createSupplierRouteHandlers(createSupplierDAL({ getOwnerContext: async () => null, database }));
    assert.equal((await unauthorizedHandlers.list(apiRequest("/api/suppliers"))).status, 401);
    const unauthorizedCreate = await unauthorizedHandlers.create(apiRequest("/api/suppliers", { method: "POST", body: first }));
    assert.equal(unauthorizedCreate.status, 401);
    assert.match(unauthorizedCreate.headers.get("content-type"), /application\/json/);

    const exactCount = await cleanupClient.query(
      "SELECT count(*)::int AS count FROM public.suppliers WHERE company_id=ANY($1::uuid[])",
      [companies.map(({ id }) => id)],
    );
    assert.equal(Number(exactCount.rows[0].count), supplierIds.length);
  } finally {
    if (companyFixturesInserted) {
      await cleanupClient.query("BEGIN");
      try {
        const companyIds = companies.map(({ id }) => id);
        const unexpected = await cleanupClient.query(
          "SELECT id FROM public.suppliers WHERE company_id=ANY($1::uuid[]) AND NOT (id=ANY($2::text[]))",
          [companyIds, supplierIds.map(({ id }) => id)],
        );
        if (unexpected.rowCount) throw new Error("Supplier TEST cleanup found an unowned supplier; cleanup rolled back.");
        const recorded = await cleanupClient.query("SELECT id, company_id FROM public.suppliers WHERE id=ANY($1::text[])", [supplierIds.map(({ id }) => id)]);
        if (recorded.rowCount !== supplierIds.length || recorded.rows.some(({ id, company_id }) => !supplierIds.some((entry) => entry.id === id && entry.companyId === company_id))) {
          throw new Error("Supplier TEST cleanup found an identity mismatch; cleanup rolled back.");
        }
        const deleted = await cleanupClient.query("DELETE FROM public.suppliers WHERE id=ANY($1::text[]) AND company_id=ANY($2::uuid[]) RETURNING id", [supplierIds.map(({ id }) => id), companyIds]);
        if (deleted.rowCount !== supplierIds.length) throw new Error("Supplier TEST cleanup did not remove exactly the fixture IDs; cleanup rolled back.");
        const companyRows = await cleanupClient.query("SELECT id, name FROM public.companies WHERE id=ANY($1::uuid[])", [companyIds]);
        if (companyRows.rowCount !== companies.length || companyRows.rows.some(({ id, name }) => !companies.some((entry) => entry.id === id && entry.name === name))) {
          throw new Error("Supplier TEST cleanup found a company mismatch; cleanup rolled back.");
        }
        const deletedCompanies = await cleanupClient.query("DELETE FROM public.companies WHERE id=ANY($1::uuid[])", [companyIds]);
        if (deletedCompanies.rowCount !== companies.length) throw new Error("Supplier TEST cleanup did not remove exactly its company fixtures; cleanup rolled back.");
        const remaining = await cleanupClient.query(
          "SELECT (SELECT count(*)::int FROM public.suppliers WHERE id=ANY($1::text[])) AS suppliers, (SELECT count(*)::int FROM public.companies WHERE id=ANY($2::uuid[])) AS companies",
          [supplierIds.map(({ id }) => id), companyIds],
        );
        assert.equal(Number(remaining.rows[0].suppliers), 0);
        assert.equal(Number(remaining.rows[0].companies), 0);
        await cleanupClient.query("COMMIT");
      } catch (error) {
        await cleanupClient.query("ROLLBACK").catch(() => {});
        throw error;
      }
    }
    await database.end();
    await cleanupClient.end();
  }
});
