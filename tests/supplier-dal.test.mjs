import assert from "node:assert/strict";
import test from "node:test";
import { createSupplierDAL } from "../app/supplier/server/supplier-dal.mjs";

function inertDatabase() {
  return {
    calls: 0,
    async query() { this.calls += 1; throw new Error("database should not be reached"); },
    async connect() { this.calls += 1; throw new Error("database should not be reached"); },
  };
}

test("Supplier DAL requires authenticated company context before database access", async () => {
  const database = inertDatabase();
  const dal = createSupplierDAL({ getOwnerContext: async () => null, database });
  await assert.rejects(dal.listSuppliers(), { code: "UNAUTHENTICATED" });
  assert.equal(database.calls, 0);
});

test("Supplier DAL rejects browser-supplied identity fields and invalid amounts", async () => {
  const database = inertDatabase();
  const dal = createSupplierDAL({ getOwnerContext: async () => ({ company: { company_id: "company-a" } }), database });
  const base = {
    name: "Synthetic Supplier", contactPerson: "", mobile: "", email: "", gst: "", pan: "",
    address: "", city: "", state: "", country: "India", pinCode: "", openingBalance: 0,
    creditLimit: 0, status: "Active",
  };
  await assert.rejects(dal.createSupplier({ ...base, companyId: "company-b" }), { code: "INVALID_SUPPLIER" });
  await assert.rejects(dal.createSupplier({ ...base, openingBalance: Number.NaN }), { code: "INVALID_SUPPLIER" });
  await assert.rejects(dal.createSupplier({ ...base, creditLimit: -0.01 }), { code: "INVALID_SUPPLIER" });
  assert.equal(database.calls, 0);
});
