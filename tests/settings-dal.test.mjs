import test from "node:test";
import assert from "node:assert/strict";
import { createSettingsDAL } from "../app/settings/server/settings-dal.mjs";

function poolFor(company = "company-a") {
  const statements = [];
  const saved = new Map();
  const client = {
    async query(sql, params = []) {
      statements.push({ sql, params });
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [], rowCount: 0 };
      if (sql.includes("INSERT INTO public.company_settings")) {
        const key = params[1];
        const record = { setting_key: key, payload: JSON.parse(params[2]), revision: (saved.get(key)?.revision || 0) + 1, updated_at: "now" };
        saved.set(key, record);
        return { rows: [record], rowCount: 1 };
      }
      throw new Error("Unexpected SQL in mock client.");
    },
    release() {},
  };
  const database = {
    statements,
    saved,
    async query(sql, params = []) {
      statements.push({ sql, params });
      if (sql.includes("LIMIT 0")) return { rows: [], rowCount: 0 };
      if (sql.includes("SELECT setting_key,payload")) {
        const [scope, key] = params;
        assert.equal(scope, company);
        const rows = key ? [saved.get(key)].filter(Boolean) : [...saved.values()];
        return { rows, rowCount: rows.length };
      }
      throw new Error("Unexpected SQL in mock database.");
    },
    async connect() { return client; },
  };
  return database;
}

test("settings are scoped to the authenticated company and persisted by category", async () => {
  const database = poolFor();
  const dal = createSettingsDAL({ getOwnerContext: async () => ({ company: { company_id: "company-a" } }), database });
  const saved = await dal.save("invoice", { invoicePrefix: "TEST", extension: { preserve: true } });
  assert.equal(saved.key, "invoice");
  assert.equal(saved.value.extension.preserve, true);
  assert.equal(saved.revision, 1);
  const list = await dal.list();
  assert.equal(list.length, 1);
  assert.ok(database.statements.every(({ params }) => !params.includes("company-b")));
  assert.ok(database.statements.some(({ sql, params }) => sql.includes("WHERE company_id=$1") && params[0] === "company-a"));
});

test("settings reject browser-supplied tenant IDs and unsupported categories", async () => {
  const database = poolFor();
  const dal = createSettingsDAL({ getOwnerContext: async () => ({ company: { company_id: "company-a" } }), database });
  await assert.rejects(dal.save("bank", { account: "synthetic", company_id: "company-b" }), { code: "INVALID_SETTINGS" });
  await assert.rejects(dal.get("unrecognized"), { code: "INVALID_SETTINGS" });
  assert.equal(database.statements.some(({ sql }) => sql.includes("INSERT INTO")), false);
});

test("settings reject unauthenticated access without querying settings rows", async () => {
  const database = poolFor();
  const dal = createSettingsDAL({ getOwnerContext: async () => null, database });
  await assert.rejects(dal.list(), { code: "UNAUTHENTICATED" });
  assert.equal(database.statements.length, 0);
});

test("missing settings schema fails closed with a safe diagnostic", async () => {
  const database = { async query() { throw new Error("database internals"); }, async connect() { throw new Error("not expected"); } };
  const dal = createSettingsDAL({ getOwnerContext: async () => ({ company: { company_id: "company-a" } }), database });
  await assert.rejects(dal.list(), { code: "SCHEMA_PENDING" });
});
