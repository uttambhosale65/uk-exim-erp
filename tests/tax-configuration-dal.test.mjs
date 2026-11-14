import test from "node:test";
import assert from "node:assert/strict";
import { createTaxConfigurationDAL } from "../app/tax/server/tax-configuration-dal.mjs";

const draft = () => ({
  version: 1,
  seller: { registrationType: "regular", gstin: "27ABCDE1234F1Z5", stateCode: "27",
    verification: { status: "verified", source: "official_gst_search", reference: "synthetic-owner-evidence", verifiedOn: "2026-11-14" } },
  productClassifications: [
    { productCode: "SYN-1", hsn: "09103030", classification: "taxable", ratePercent: 5, effectiveFrom: "2026-11-14", effectiveTo: "", evidenceReference: "synthetic-rate-evidence" },
    { productCode: "SYN-UNKNOWN", hsn: "unknown", classification: "unclassified", ratePercent: "", effectiveFrom: "", effectiveTo: "", evidenceReference: "" },
  ],
  export: { status: "unverified", mode: "unconfigured", reference: "", lutReference: "", lutValidFrom: "", lutValidTo: "", igstPaymentPermitted: false, igstPermissionReference: "" },
  approval: { status: "draft", ownerAttested: true, accountantReviewed: false, accountantReference: "" },
});

function databaseMock() {
  const calls = [];
  const row = { configuration: null, approval_status: "draft", revision: 1, approved_at: null, updated_at: "synthetic-now" };
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rows: [], rowCount: 0 };
      if (sql.includes("INSERT INTO public.company_tax_configurations")) {
        row.configuration = JSON.parse(params[1]); row.approval_status = params[2]; row.approved_at = params[3];
        return { rows: [{ ...row }], rowCount: 1 };
      }
      throw new Error("Unexpected mock client query.");
    }, release() {},
  };
  return { calls, async query(sql, params = []) { calls.push({ sql, params }); return { rows: [], rowCount: 0 }; }, async connect() { return client; } };
}

test("tax configuration saves as a company-scoped draft and preserves unclassified products", async () => {
  const database = databaseMock();
  const dal = createTaxConfigurationDAL({ getOwnerContext: async () => ({ company: { company_id: "company-synthetic" }, session: { user: { id: "owner-synthetic" } } }), database });
  const saved = await dal.save(draft());
  assert.equal(saved.approvalStatus, "draft");
  assert.equal(saved.configuration.productClassifications[1].classification, "unclassified");
  const insert = database.calls.find(({ sql }) => sql.includes("INSERT INTO public.company_tax_configurations"));
  assert.equal(insert.params[0], "company-synthetic");
  assert.equal(insert.params[2], "draft");
  assert.equal(insert.params[4], null);
});

test("tax configuration rejects browser-supplied company scope before connecting", async () => {
  const database = databaseMock();
  const dal = createTaxConfigurationDAL({ getOwnerContext: async () => ({ company: { company_id: "company-synthetic" }, session: { user: { id: "owner-synthetic" } } }), database });
  await assert.rejects(dal.save({ ...draft(), company_id: "another-company" }), { code: "INVALID_TAX_CONFIGURATION" });
  assert.equal(database.calls.some(({ sql }) => sql.includes("INSERT INTO")), false);
});

test("tax configuration requires an authenticated owner and fails closed when migration 014 is pending", async () => {
  const unauthenticatedDb = databaseMock();
  const unauthenticated = createTaxConfigurationDAL({ getOwnerContext: async () => null, database: unauthenticatedDb });
  await assert.rejects(unauthenticated.get(), { code: "UNAUTHENTICATED" });
  assert.equal(unauthenticatedDb.calls.length, 0);
  const missingSchema = { async query() { throw new Error("private connection detail"); }, async connect() { throw new Error("not expected"); } };
  const pending = createTaxConfigurationDAL({ getOwnerContext: async () => ({ company: { company_id: "company-synthetic" }, session: { user: { id: "owner-synthetic" } } }), database: missingSchema });
  await assert.rejects(pending.get(), { code: "SCHEMA_PENDING" });
});
