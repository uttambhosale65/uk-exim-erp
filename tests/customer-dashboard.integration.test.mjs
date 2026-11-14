import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import test from "node:test";
import { createCustomerDAL } from "../app/customer/server/customer-dal.mjs";
import { createCustomerRouteHandlers } from "../app/customer/server/customer-routes.mjs";
import { parseProductsUiTestDatabaseUrl } from "../app/lib/db/products-ui-test.mjs";

dotenv.config({ path: ".env.local", quiet: true });

function syntheticCustomer(label, suffix) {
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
    whatsapp: "",
    paymentTerms: "Synthetic only",
    remarks: "Disposable integration-test record",
  };
}

function apiRequest(path, { method = "GET", body } = {}) {
  const url = new URL(path, "http://127.0.0.1");
  return new Request(url, {
    method,
    headers: {
      origin: "http://127.0.0.1",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("TEST database customer API lifecycle is company-scoped and fixture-cleaned", async () => {
  const url = parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "5432");
  assert.equal(url.pathname, "/uk_exim_erp_test");

  const database = new pg.Pool({ connectionString: url.toString(), max: 3 });
  const cleanupClient = new pg.Client({ connectionString: url.toString() });
  const companies = [
    { id: randomUUID(), name: `Synthetic Customer API Test A ${randomUUID()}` },
    { id: randomUUID(), name: `Synthetic Customer API Test B ${randomUUID()}` },
  ];
  const customerIds = [];
  let companyFixturesInserted = false;

  try {
    await cleanupClient.connect();
    const identity = await cleanupClient.query(`
      SELECT current_database() AS database, host(inet_server_addr()) AS address,
             inet_server_port() AS port, current_setting('server_version') AS version`);
    assert.equal(identity.rows[0]?.database, "uk_exim_erp_test");
    assert.equal(identity.rows[0]?.address, "127.0.0.1");
    assert.equal(Number(identity.rows[0]?.port), 5432);

    const statusColumn = await cleanupClient.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'status'`);
    assert.equal(statusColumn.rowCount, 1, "TEST schema must have migration 003 before status-filter tests");

    await cleanupClient.query(
      "INSERT INTO public.companies (id, name) VALUES ($1, $2), ($3, $4)",
      [companies[0].id, companies[0].name, companies[1].id, companies[1].name],
    );
    companyFixturesInserted = true;

    let activeCompanyId = companies[0].id;
    const dal = createCustomerDAL({
      getOwnerContext: async () => ({ company: { company_id: activeCompanyId } }),
      database,
    });
    const handlers = createCustomerRouteHandlers(dal);

    const first = syntheticCustomer("Alpha", 100000001);
    const createFirst = await handlers.create(apiRequest("/api/customers", { method: "POST", body: first }));
    assert.equal(createFirst.status, 201);
    const firstCustomer = (await createFirst.json()).customer;
    assert.equal(firstCustomer.code, "C0001");
    customerIds.push({ id: firstCustomer.id, companyId: companies[0].id });

    const countAfterFirstCreate = await handlers.count();
    assert.equal(countAfterFirstCreate.status, 200);
    assert.deepEqual(await countAfterFirstCreate.json(), { count: 1 });

    const listAfterFirstCreate = await handlers.list(apiRequest("/api/customers"));
    assert.equal(listAfterFirstCreate.status, 200);
    const listData = await listAfterFirstCreate.json();
    assert.equal(listData.customers.length, 1);
    assert.equal(listData.customers[0].id, firstCustomer.id);

    const viewResponse = await handlers.get(apiRequest(`/api/customers/${firstCustomer.id}`), firstCustomer.id);
    assert.equal(viewResponse.status, 200);
    assert.equal((await viewResponse.json()).customer.id, firstCustomer.id);

    const updatedFirst = { ...first, name: "Synthetic Alpha Edited", city: "Edited Synthetic City" };
    const updateResponse = await handlers.update(
      apiRequest(`/api/customers/${firstCustomer.id}`, { method: "PATCH", body: updatedFirst }),
      firstCustomer.id,
    );
    assert.equal(updateResponse.status, 200);
    assert.equal((await updateResponse.json()).customer.name, updatedFirst.name);

    for (const query of [updatedFirst.name, firstCustomer.code, first.mobile]) {
      const searchResponse = await handlers.list(apiRequest(`/api/customers?q=${encodeURIComponent(query)}`));
      assert.equal(searchResponse.status, 200);
      assert.equal((await searchResponse.json()).customers.length, 1, `search must match synthetic ${query === updatedFirst.name ? "name" : query === firstCustomer.code ? "code" : "mobile"}`);
    }

    const duplicateWarnings = await handlers.duplicateCheck(apiRequest("/api/customers/duplicate-check", {
      method: "POST",
      body: { mobile: first.mobile, email: first.email, gst: first.gst },
    }));
    assert.equal(duplicateWarnings.status, 200);
    assert.deepEqual((await duplicateWarnings.json()).warnings, ["mobile", "email", "gst"]);

    const second = syntheticCustomer("Beta", 100000002);
    second.mobile = first.mobile;
    second.email = first.email;
    second.gst = first.gst;
    const createSecond = await handlers.create(apiRequest("/api/customers", { method: "POST", body: second }));
    assert.equal(createSecond.status, 201, "duplicate mobile/email/GST values are warnings, not blocking rules");
    const secondCustomer = (await createSecond.json()).customer;
    assert.equal(secondCustomer.code, "C0002");
    customerIds.push({ id: secondCustomer.id, companyId: companies[0].id });

    assert.deepEqual(await (await handlers.count()).json(), { count: 2 });
    const deactivateResponse = await handlers.deactivate(
      apiRequest(`/api/customers/${firstCustomer.id}`, { method: "DELETE" }),
      firstCustomer.id,
    );
    assert.equal(deactivateResponse.status, 200);
    assert.equal((await deactivateResponse.json()).customer.status, "Inactive");
    const activeList = await handlers.list(apiRequest("/api/customers?status=Active"));
    const inactiveList = await handlers.list(apiRequest("/api/customers?status=Inactive"));
    assert.equal((await activeList.json()).customers.length, 1);
    assert.equal((await inactiveList.json()).customers.length, 1);
    assert.deepEqual(await (await handlers.count()).json(), { count: 2 }, "count includes both active and inactive customers");

    const reactivateResponse = await handlers.reactivate(
      apiRequest(`/api/customers/${firstCustomer.id}`, { method: "POST" }),
      firstCustomer.id,
    );
    assert.equal(reactivateResponse.status, 200);
    assert.equal((await reactivateResponse.json()).customer.status, "Active");

    const invalidInput = await handlers.create(apiRequest("/api/customers", {
      method: "POST", body: { ...first, companyId: companies[0].id },
    }));
    assert.equal(invalidInput.status, 400);
    assert.match(invalidInput.headers.get("content-type"), /application\/json/);

    const invalidQuery = await handlers.list(apiRequest(`/api/customers?q=${"x".repeat(101)}`));
    assert.equal(invalidQuery.status, 400);
    assert.match(invalidQuery.headers.get("content-type"), /application\/json/);

    activeCompanyId = companies[1].id;
    const createOtherCompany = await handlers.create(apiRequest("/api/customers", {
      method: "POST", body: syntheticCustomer("Company B", 100000003),
    }));
    assert.equal(createOtherCompany.status, 201);
    const otherCompanyCustomer = (await createOtherCompany.json()).customer;
    assert.equal(otherCompanyCustomer.code, "C0001", "customer codes are independent by company");
    customerIds.push({ id: otherCompanyCustomer.id, companyId: companies[1].id });
    assert.deepEqual(await (await handlers.count()).json(), { count: 1 });
    const otherCompanyList = await handlers.list(apiRequest("/api/customers"));
    assert.equal((await otherCompanyList.json()).customers.length, 1);

    activeCompanyId = companies[0].id;
    assert.deepEqual(await (await handlers.count()).json(), { count: 2 });
    const ownerAList = await handlers.list(apiRequest("/api/customers"));
    assert.equal((await ownerAList.json()).customers.length, 2);

    const unauthorizedDAL = createCustomerDAL({
      getOwnerContext: async () => null,
      database,
    });
    const unauthorized = createCustomerRouteHandlers(unauthorizedDAL);
    const unauthorizedList = await unauthorized.list(apiRequest("/api/customers"));
    const unauthorizedCount = await unauthorized.count();
    assert.equal(unauthorizedList.status, 401);
    assert.equal(unauthorizedCount.status, 401);
    assert.match(unauthorizedList.headers.get("content-type"), /application\/json/);

    const finalCount = await cleanupClient.query(
      "SELECT count(*)::int AS count FROM public.customers WHERE company_id = ANY($1::uuid[])",
      [companies.map(({ id }) => id)],
    );
    assert.equal(Number(finalCount.rows[0].count), customerIds.length);
  } finally {
    if (companyFixturesInserted) {
      await cleanupClient.query("BEGIN");
      try {
        const companyIds = companies.map(({ id }) => id);
        const unexpectedCustomers = await cleanupClient.query(
          "SELECT id FROM public.customers WHERE company_id = ANY($1::uuid[]) AND NOT (id = ANY($2::text[]))",
          [companyIds, customerIds.map(({ id }) => id)],
        );
        if (unexpectedCustomers.rowCount > 0) {
          throw new Error("Synthetic TEST cleanup found an unowned customer; cleanup rolled back.");
        }

        const recordedCustomers = await cleanupClient.query(
          "SELECT id, company_id FROM public.customers WHERE id = ANY($1::text[])",
          [customerIds.map(({ id }) => id)],
        );
        if (recordedCustomers.rowCount !== customerIds.length
          || recordedCustomers.rows.some(({ id, company_id }) => !customerIds.some((entry) => entry.id === id && entry.companyId === company_id))) {
          throw new Error("Synthetic TEST cleanup found a customer ID or company mismatch; cleanup rolled back.");
        }
        const deletedCustomers = await cleanupClient.query(
          "DELETE FROM public.customers WHERE id = ANY($1::text[]) AND company_id = ANY($2::uuid[]) RETURNING id",
          [customerIds.map(({ id }) => id), companyIds],
        );
        if (deletedCustomers.rowCount !== customerIds.length) {
          throw new Error("Synthetic TEST cleanup did not remove exactly the recorded customers; cleanup rolled back.");
        }

        const companyRows = await cleanupClient.query(
          "SELECT id, name FROM public.companies WHERE id = ANY($1::uuid[])",
          [companyIds],
        );
        if (companyRows.rowCount !== companies.length
          || companyRows.rows.some(({ id, name }) => !companies.some((entry) => entry.id === id && entry.name === name))) {
          throw new Error("Synthetic TEST cleanup found a company identity mismatch; cleanup rolled back.");
        }
        const deletedCompanies = await cleanupClient.query(
          "DELETE FROM public.companies WHERE id = ANY($1::uuid[])",
          [companyIds],
        );
        if (deletedCompanies.rowCount !== companies.length) {
          throw new Error("Synthetic TEST cleanup did not remove exactly the recorded companies; cleanup rolled back.");
        }

        const remaining = await cleanupClient.query(
          `SELECT
             (SELECT count(*)::int FROM public.customers WHERE id = ANY($1::text[])) AS customers,
             (SELECT count(*)::int FROM public.companies WHERE id = ANY($2::uuid[])) AS companies`,
          [customerIds.map(({ id }) => id), companyIds],
        );
        if (Number(remaining.rows[0].customers) !== 0 || Number(remaining.rows[0].companies) !== 0) {
          throw new Error("Synthetic TEST cleanup verification failed; cleanup rolled back.");
        }
        await cleanupClient.query("COMMIT");
      } catch (cleanupError) {
        await cleanupClient.query("ROLLBACK").catch(() => {});
        throw cleanupError;
      }
    }
    await database.end();
    await cleanupClient.end();
  }
});
