import test from "node:test";
import assert from "node:assert/strict";
import { createExportDAL } from "../app/international/export/server/export-dal.mjs";
import { createExportRouteHandlers } from "../app/international/export/server/export-routes.mjs";

const owner = { company: { company_id: "company-a" } };
function fakePool({ query = async () => ({ rows: [], rowCount: 0 }), clientQuery = query } = {}) {
  const statements = [];
  const client = { async query(sql, params) { statements.push({ sql, params }); return clientQuery(sql, params); }, release() {} };
  return { statements, database: { async query(sql, params) { statements.push({ sql, params }); return query(sql, params); }, async connect() { return client; } } };
}

test("export document list is scoped to the authenticated company and type", async () => {
  const pool = fakePool({ query: async () => ({ rows: [], rowCount: 0 }) });
  const dal = createExportDAL({ getOwnerContext: async () => owner, database: pool.database });
  assert.deepEqual(await dal.listDocuments("quotation"), []);
  assert.deepEqual(pool.statements[0].params.slice(0, 2), ["company-a", "quotation"]);
  assert.match(pool.statements[0].sql, /company_id=\$1 AND document_kind=\$2/);
});

test("unlinked export document create preserves source fields in a JSONB payload", async () => {
  const source = { id: "export-1", quotationNo: "Q-1", quotationDate: "2026-01-01", enquiryNo: "", currency: "USD", items: [{ productCode: "P-X", qty: 2 }], unknownField: "keep" };
  const pool = fakePool({ clientQuery: async (sql, params) => {
    if (/INSERT INTO public.export_documents/.test(sql)) return { rows: [{ id: params[0], company_id: params[1], document_kind: params[2], document_number: params[3], document_date: params[4], currency: params[5], status: params[6], review_status: "owner_verified", source_record: JSON.parse(params[7]) }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  } });
  const dal = createExportDAL({ getOwnerContext: async () => owner, database: pool.database });
  const created = await dal.createDocument("quotation", source);
  assert.equal(created.id, source.id);
  assert.equal(created.unknownField, "keep");
  assert.equal(created.documentNumber, source.quotationNo);
  assert.equal(pool.statements.some(x => /INSERT INTO public.export_document_references/.test(x.sql)), false);
  assert.equal(pool.statements.some(x => /UPDATE|DELETE|TRUNCATE/i.test(x.sql)), false);
});

test("missing same-company verified document reference rolls back the write", async () => {
  const pool = fakePool({ clientQuery: async sql => {
    if (/SELECT id FROM public.export_documents/.test(sql)) return { rows: [], rowCount: 0 };
    return { rows: [], rowCount: 1 };
  } });
  const dal = createExportDAL({ getOwnerContext: async () => owner, database: pool.database });
  await assert.rejects(dal.createDocument("quotation", { id: "q1", quotationNo: "Q1", quotationDate: "2026-01-01", enquiryNo: "missing" }), { code: "EXPORT_REFERENCE_NOT_FOUND" });
  assert.ok(pool.statements.some(x => x.sql === "ROLLBACK"));
  assert.ok(!pool.statements.some(x => /INSERT INTO public.export_document_references/.test(x.sql)));
});

test("unauthenticated Export requests return JSON 401", async () => {
  const handlers = createExportRouteHandlers({ listDocuments: async () => { throw Object.assign(new Error("Sign in is required."), { code: "UNAUTHENTICATED" }); } });
  const response = await handlers.list(new Request("http://localhost/api/export/quotation"), "quotation");
  assert.equal(response.status, 401);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
});

test("Export writes retain same-origin protection", async () => {
  let called = false;
  const handlers = createExportRouteHandlers({ createDocument: async () => { called = true; } });
  const response = await handlers.create(new Request("https://erp.example/api/export/quotation", { method: "POST", headers: { origin: "https://attacker.invalid", "content-type": "application/json" }, body: "{}" }), "quotation");
  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test("invalid document shapes are rejected before database writes", async () => {
  const pool = fakePool();
  const dal = createExportDAL({ getOwnerContext: async () => owner, database: pool.database });
  await assert.rejects(dal.createDocument("order", { id: "o1", exportOrderNo: "", exportOrderDate: "2026-01-01" }), { code: "INVALID_EXPORT" });
  assert.equal(pool.statements.length, 0);
});

test("unknown export kinds do not query the database", async () => {
  const pool = fakePool();
  const dal = createExportDAL({ getOwnerContext: async () => owner, database: pool.database });
  await assert.rejects(dal.listDocuments("domestic_sales"), { code: "INVALID_QUERY" });
  assert.equal(pool.statements.length, 0);
});
