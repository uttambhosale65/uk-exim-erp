import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("new export documents are Draft and preserve source fields in a JSONB payload", async () => {
  const source = { id: "export-1", quotationNo: "Q-1", quotationDate: "2026-01-01", enquiryNo: "", currency: "USD", items: [{ productCode: "P-X", qty: 2 }], unknownField: "keep" };
  const pool = fakePool({ clientQuery: async (sql, params) => {
    if (/INSERT INTO public.export_documents/.test(sql)) return { rows: [{ id: params[0], company_id: params[1], document_kind: params[2], document_number: params[3], document_date: params[4], currency: params[5], status: params[6], review_status: "owner_verified", source_record: JSON.parse(params[7]) }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  } });
  const dal = createExportDAL({ getOwnerContext: async () => owner, database: pool.database });
  const created = await dal.createDocument("quotation", source);
  assert.equal(created.id, source.id);
  assert.equal(created.unknownField, "keep");
  assert.equal(created.sourceRecord.unknownField, source.unknownField, "unknown source fields remain preserved");
  assert.equal(created.status, "Draft");
  assert.equal(created.sourceRecord.status, "Draft");
  assert.equal(created.documentNumber, source.quotationNo);
  assert.equal(pool.statements.some(x => /INSERT INTO public.export_document_references/.test(x.sql)), false);
  assert.equal(pool.statements.some(x => /UPDATE|DELETE|TRUNCATE/i.test(x.sql)), false);
});

test("a new Export document cannot be created directly as Issued", async () => {
  const pool = fakePool();
  const dal = createExportDAL({ getOwnerContext: async () => owner, database: pool.database });
  await assert.rejects(dal.createDocument("quotation", { id: "q-issued", quotationNo: "Q-I", quotationDate: "2026-01-01", status: "Issued" }), { code: "EXPORT_DOCUMENT_LOCKED" });
  assert.equal(pool.statements.length, 0);
});

test("non-Draft Export documents cannot be edited and their relationships are untouched", async () => {
  const pool = fakePool({ clientQuery: async sql => {
    if (/SELECT \* FROM public\.export_documents/.test(sql)) return { rows: [{ id: "q1", status: "Issued", review_status: "owner_verified" }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  } });
  const dal = createExportDAL({ getOwnerContext: async () => owner, database: pool.database });
  await assert.rejects(dal.updateDocument("quotation", "q1", { id: "q1", quotationNo: "Q1", quotationDate: "2026-01-01", status: "Draft" }), { code: "EXPORT_DOCUMENT_LOCKED" });
  assert.ok(!pool.statements.some(item => /^(?:DELETE|UPDATE)\b/i.test(item.sql)));
  assert.ok(pool.statements.some(item => item.sql === "ROLLBACK"));
});

test("Export UI provides a labelled A4 preview/print view without displaying raw JSON", async () => {
  const workspace = await readFile(new URL("../app/international/export/ExportPostgresWorkspace.tsx", import.meta.url), "utf8");
  const preview = await readFile(new URL("../app/international/export/ExportRecordPreview.tsx", import.meta.url), "utf8");
  assert.match(workspace, /Preview Profile \/ Print/);
  assert.match(workspace, /Preview \/ Print/);
  assert.match(preview, /@page\{size:A4 portrait/);
  assert.match(preview, /Print \/ Save as PDF/);
  assert.match(preview, /not an issued operational document/i);
  assert.match(preview, /id="export-preview-title"/);
  assert.doesNotMatch(preview, /JSON\.stringify/);
});

test("export record read exposes the original source snapshot separately from normalized fields", async () => {
  const source = { id: "customer-1", code: "EXP-1", name: "Synthetic Buyer", extraOriginalField: "preserved" };
  const pool = fakePool({ query: async () => ({ rows: [{ id: source.id, code: source.code, name: source.name, status: "Active", review_status: "review_required", source_record: source }], rowCount: 1 }) });
  const dal = createExportDAL({ getOwnerContext: async () => owner, database: pool.database });
  const result = await dal.getCustomer(source.id);
  assert.equal(result.extraOriginalField, "preserved");
  assert.deepEqual(result.sourceRecord, source);
  assert.match(pool.statements[0].sql, /company_id=\$1 AND id=\$2/);
});

test("owner review transition is company-scoped for Export Customers", async () => {
  const source = { id: "customer-1", code: "EXP-1", name: "Synthetic Buyer" };
  const pool = fakePool({ query: async (sql, params) => ({ rows: [{ ...source, status: "Active", review_status: params[2], source_record: source }], rowCount: 1 }) });
  const dal = createExportDAL({ getOwnerContext: async () => owner, database: pool.database });
  const result = await dal.setCustomerReviewStatus(source.id, "owner_verified");
  assert.equal(result.reviewStatus, "owner_verified");
  assert.deepEqual(result.sourceRecord, source);
  assert.deepEqual(pool.statements[0].params, ["company-a", source.id, "owner_verified"]);
  assert.match(pool.statements[0].sql, /WHERE company_id=\$1 AND id=\$2/);
  await assert.rejects(dal.setCustomerReviewStatus(source.id, "approved"), { code: "INVALID_EXPORT" });
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

test("customer review promotion uses same-origin owner route and customer payload", async () => {
  const handlers = createExportRouteHandlers({ setCustomerReviewStatus: async (_id, status) => ({ id: "c1", reviewStatus: status }) });
  const response = await handlers.review(new Request("http://localhost/api/export/customers/c1", { method: "PATCH", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ reviewStatus: "owner_verified" }) }), "customers", "c1");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { customer: { id: "c1", reviewStatus: "owner_verified" } });
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
