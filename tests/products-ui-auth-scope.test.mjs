import assert from "node:assert/strict";
import test from "node:test";
import { resolveOwnerContext } from "../app/lib/auth/authorization.mjs";

test("normal owner context keeps the existing company name restriction", async () => {
  let parameters;
  const database = {
    query: async (_sql, values) => {
      parameters = values;
      return { rows: [{ company_id: "company-id", company_name: values[1], role: "owner" }] };
    },
  };
  const context = await resolveOwnerContext(database, { user: { id: "user-id" } });
  assert.equal(parameters[1], "UK EXIM ENTERPRISES");
  assert.equal(context.company.role, "owner");
});

test("test-only owner context can scope to the synthetic company name", async () => {
  let parameters;
  const database = {
    query: async (_sql, values) => {
      parameters = values;
      return { rows: [{ company_id: "synthetic-company-id", company_name: values[1], role: "owner" }] };
    },
  };
  const context = await resolveOwnerContext(
    database,
    { user: { id: "synthetic-user-id" } },
    "SYNTHETIC PRODUCTS UI TEST COMPANY",
  );
  assert.equal(parameters[1], "SYNTHETIC PRODUCTS UI TEST COMPANY");
  assert.equal(context.company.company_name, "SYNTHETIC PRODUCTS UI TEST COMPANY");
});
