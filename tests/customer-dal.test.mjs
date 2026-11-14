import assert from "node:assert/strict";
import test from "node:test";
import { createCustomerDAL } from "../app/customer/server/customer-dal.mjs";
import { createCustomerRouteHandlers } from "../app/customer/server/customer-routes.mjs";

const companyId = "c05f99c0-e21c-4766-9cf4-5aa34bb37e11";
const customer = {
  name: "Synthetic Customer", contactPerson: "", mobile: "9876543210", email: "",
  gst: "", pan: "", address: "", city: "", state: "", country: "India", pinCode: "",
  openingBalance: 12.34, creditLimit: 1000, status: "Active",
};

function makeDAL({ authenticated = true, query = async () => ({ rows: [], rowCount: 0 }) } = {}) {
  const database = {
    query,
    connect: async () => ({ query, release() {} }),
  };
  return createCustomerDAL({
    getOwnerContext: async () => authenticated ? { company: { company_id: companyId } } : null,
    database,
    idFactory: () => "synthetic-customer-id",
  });
}

test("Customer DAL refuses unauthenticated reads before database access", async () => {
  let queried = false;
  const dal = makeDAL({ authenticated: false, query: async () => { queried = true; return { rows: [] }; } });
  await assert.rejects(dal.listCustomers(), { code: "UNAUTHENTICATED" });
  assert.equal(queried, false);
});

test("Customer DAL rejects unsupported fields and non-finite financial values", async () => {
  const dal = makeDAL();
  await assert.rejects(dal.createCustomer({ ...customer, companyId }), { code: "INVALID_CUSTOMER" });
  await assert.rejects(dal.createCustomer({ ...customer, openingBalance: Infinity }), { code: "INVALID_CUSTOMER" });
});

test("Customer DAL accepts financial fields and ignores no trusted identity fields", async () => {
  const queries = [];
  const row = {
    id: "synthetic-customer-id", company_id: companyId, code: "C0040", name: customer.name,
    contact_person: customer.contactPerson, mobile: customer.mobile, email: customer.email,
    gst: customer.gst, pan: customer.pan, address: customer.address, city: customer.city,
    state: customer.state, country: customer.country, pin_code: customer.pinCode,
    opening_balance: "12.34", credit_limit: "1000.00", status: customer.status,
  };
  const dal = createCustomerDAL({
    getOwnerContext: async () => ({ company: { company_id: companyId } }),
    idFactory: () => "synthetic-customer-id",
    database: {
      async query(sql, params = []) {
        queries.push({ sql, params });
        return { rows: [{ next_code: "C0040" }], rowCount: 1 };
      },
      async connect() {
        return {
          async query(sql, params = []) {
            queries.push({ sql, params });
            if (sql.includes("SELECT 'C'")) return { rows: [{ next_code: "C0040" }], rowCount: 1 };
            if (sql.includes("INSERT INTO public.customers")) return { rows: [row], rowCount: 1 };
            return { rows: [], rowCount: 1 };
          },
          release() {},
        };
      },
    },
  });
  const result = await dal.createCustomer(customer);
  assert.equal(result.openingBalance, 12.34);
  assert.equal(result.creditLimit, 1000);
  assert.equal(result.code, "C0040");
  const insert = queries.find((call) => call.sql.includes("INSERT INTO public.customers"));
  assert.equal(insert.params[1], companyId);
  assert.equal(insert.params[0], "synthetic-customer-id");
});

test("Customer DAL scopes search to the authenticated company and returns only mapped data", async () => {
  const calls = [];
  const dal = makeDAL({ query: async (statement, values = []) => {
    calls.push({ sql: statement, params: values });
    if (statement.includes("SELECT 'C'")) return { rows: [{ next_code: "C0001" }] };
    return { rows: [], rowCount: 0 };
  } });
  const result = await dal.listCustomers({ q: "tea%_", status: "Active" });
  assert.match(calls[0].sql, /company_id = \$1/);
  assert.match(calls[0].sql, /status = \$2/);
  assert.equal(calls[0].params[0], companyId);
  assert.equal(calls[0].params[1], "Active");
  assert.match(calls[0].params[2], /tea\\%\\_/);
  assert.equal(calls[1].params[0], companyId);
  assert.equal(result.nextCode, "C0001");
  assert.deepEqual(result.customers, []);
});

test("Dashboard customer count is company-scoped and includes active and inactive rows", async () => {
  let sql = "";
  let params;
  const dal = makeDAL({ query: async (statement, values = []) => {
    sql = statement;
    params = values;
    return { rows: [{ count: 39 }], rowCount: 1 };
  } });
  assert.equal(await dal.countCustomers(), 39);
  assert.match(sql, /count\(\*\)::int AS count FROM public\.customers WHERE company_id = \$1/);
  assert.doesNotMatch(sql, /status\s*=/i);
  assert.deepEqual(params, [companyId]);
});

test("Customer API refuses cross-origin writes before invoking the DAL", async () => {
  let called = false;
  const handlers = createCustomerRouteHandlers({
    async createCustomer() { called = true; return {}; },
    async listCustomers() { return { customers: [], nextCode: "C0001" }; },
  });
  const response = await handlers.create(new Request("http://localhost/api/customers", {
    method: "POST", headers: { origin: "https://other.example", "content-type": "application/json" }, body: JSON.stringify(customer),
  }));
  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test("Customer count route returns a count or an explicit service error, never a fallback zero", async () => {
  const success = createCustomerRouteHandlers({ async countCustomers() { return 39; } });
  const response = await success.count();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await response.json(), { count: 39 });

  for (const invalidCount of [NaN, Infinity, -1, "39"]) {
    const invalid = createCustomerRouteHandlers({ async countCustomers() { return invalidCount; } });
    const invalidResponse = await invalid.count();
    assert.equal(invalidResponse.status, 500);
    assert.deepEqual(await invalidResponse.json(), { error: "The customer request could not be completed." });
  }

  const failure = createCustomerRouteHandlers({ async countCustomers() { throw new Error("database unavailable"); } });
  const failedResponse = await failure.count();
  assert.equal(failedResponse.status, 500);
  assert.deepEqual(await failedResponse.json(), { error: "The customer request could not be completed." });
});

test("Unauthenticated Customer API requests return a JSON 401 response", async () => {
  const handlers = createCustomerRouteHandlers({
    async listCustomers() { throw Object.assign(new Error("Sign in is required."), { code: "UNAUTHENTICATED" }); },
    async countCustomers() { throw Object.assign(new Error("Sign in is required."), { code: "UNAUTHENTICATED" }); },
  });
  const listResponse = await handlers.list(new Request("http://localhost/api/customers"));
  assert.equal(listResponse.status, 401);
  assert.match(listResponse.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await listResponse.json(), { error: "Sign in is required." });
  const countResponse = await handlers.count();
  assert.equal(countResponse.status, 401);
  assert.match(countResponse.headers.get("content-type"), /application\/json/);
});
