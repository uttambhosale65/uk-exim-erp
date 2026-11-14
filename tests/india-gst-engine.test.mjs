import test from "node:test";
import assert from "node:assert/strict";
import { determineDomesticSaleTax, determineExportTax, isTaxConfigurationApproved } from "../app/tax/india-gst-engine.mjs";

const verifiedRule = (overrides = {}) => ({
  productCode: "SYN-TURMERIC", hsn: "09103030", classification: "taxable", ratePercent: 5,
  effectiveFrom: "2025-04-01", effectiveTo: "", evidenceReference: "synthetic-rate-source", ...overrides,
});
const policy = (overrides = {}) => ({
  version: 1,
  seller: { registrationType: "regular", gstin: "27ABCDE1234F1Z5", stateCode: "27", verification: { status: "verified", source: "official_gst_search", reference: "synthetic-registration-evidence", verifiedOn: "2026-11-01" } },
  productClassifications: [verifiedRule()],
  export: { status: "verified", mode: "lut_without_igst", reference: "synthetic-export-review", lutReference: "SYN-LUT-1", lutValidFrom: "2026-04-01", lutValidTo: "2027-03-31", igstPaymentPermitted: false, igstPermissionReference: "" },
  approval: { status: "approved", ownerAttested: true, accountantReviewed: true, accountantReference: "synthetic-accountant-review" },
  ...overrides,
});
const input = (overrides = {}) => ({
  configuration: policy(), invoiceType: "GST", salesDate: "2026-11-10", placeOfSupplyStateCode: "27",
  placeOfSupplyBasis: "movement_destination", placeOfSupplyAddress: "Synthetic delivery location",
  lines: [{ productCode: "SYN-TURMERIC", hsn: "wrong-client-value", qty: 1, rate: 100 }],
  products: [{ code: "SYN-TURMERIC", hsn: "09103030", active: true }], ...overrides,
});

test("Maharashtra delivery applies line-wise 2.5% CGST and 2.5% SGST", () => {
  const result = determineDomesticSaleTax(input());
  assert.equal(result.items[0].cgst, 2.5); assert.equal(result.items[0].sgst, 2.5); assert.equal(result.items[0].igst, 0);
  assert.equal(result.gstAmount, 5); assert.equal(result.grandTotal, 105); assert.equal(result.documentType, "GST_TAX_INVOICE");
});

test("Gujarat delivery applies 5% IGST and no CGST/SGST", () => {
  const result = determineDomesticSaleTax(input({ placeOfSupplyStateCode: "24" }));
  assert.equal(result.items[0].igst, 5); assert.equal(result.items[0].cgst, 0); assert.equal(result.items[0].sgst, 0);
});

test("Karnataka delivery applies 5% IGST and no CGST/SGST", () => {
  const result = determineDomesticSaleTax(input({ placeOfSupplyStateCode: "29" }));
  assert.equal(result.items[0].igst, 5); assert.equal(result.items[0].cgst + result.items[0].sgst, 0);
});

test("unregistered retailer status does not bypass tax for a taxable supply", () => {
  const unregisteredBuyer = { registrationType: "unregistered" };
  const result = determineDomesticSaleTax(input({ customerTaxStatus: unregisteredBuyer }));
  assert.equal(result.gstAmount, 5); assert.equal(result.documentType, "GST_TAX_INVOICE");
});

test("registered interstate retailer still receives inter-state IGST where POS differs", () => {
  const result = determineDomesticSaleTax(input({ placeOfSupplyStateCode: "29", customerTaxStatus: "registered" }));
  assert.equal(result.igst, 5); assert.equal(result.cgst, 0); assert.equal(result.sgst, 0);
});

test("exempt and nil-rated supplies use Bill of Supply rather than GST Tax Invoice", () => {
  for (const classification of ["exempt", "nil_rated"]) {
    const configuration = policy({ productClassifications: [verifiedRule({ classification, ratePercent: 0 })] });
    assert.throws(() => determineDomesticSaleTax(input({ configuration })), { code: "BILLING_TYPE_MISMATCH" });
    const result = determineDomesticSaleTax(input({ configuration, invoiceType: "NON_GST" }));
    assert.equal(result.documentType, "BILL_OF_SUPPLY"); assert.equal(result.gstAmount, 0);
  }
});

test("composition seller uses Bill of Supply with no separately collected GST", () => {
  const configuration = policy({ seller: { ...policy().seller, registrationType: "composition" } });
  const result = determineDomesticSaleTax(input({ configuration, invoiceType: "NON_GST" }));
  assert.equal(result.documentType, "BILL_OF_SUPPLY"); assert.equal(result.gstAmount, 0);
  assert.throws(() => determineDomesticSaleTax(input({ configuration, invoiceType: "GST" })), { code: "BILLING_TYPE_MISMATCH" });
});

test("composition seller is blocked for inter-State outward goods supply", () => {
  const configuration = policy({ seller: { ...policy().seller, registrationType: "composition" } });
  assert.throws(() => determineDomesticSaleTax(input({ configuration, invoiceType: "NON_GST", placeOfSupplyStateCode: "24" })), { code: "COMPOSITION_INTERSTATE_GOODS_BLOCKED" });
});

test("regular GST seller cannot use Without GST for a taxable supply", () => {
  assert.throws(() => determineDomesticSaleTax(input({ invoiceType: "NON_GST" })), { code: "TAXABLE_NON_GST_BLOCKED" });
});

test("valid effective LUT export route records zero IGST and supporting references", () => {
  const result = determineExportTax({ configuration: policy(), exportMode: "lut_without_igst", invoiceDate: "2026-11-10",
    product: { code: "SYN-TURMERIC", hsn: "09103030" }, amount: 100, destinationCountry: "Synthetic destination",
    lutReference: "SYN-LUT-1", shippingBillReference: "SYN-SB-1" });
  assert.equal(result.igst, 0); assert.equal(result.mode, "lut_without_igst"); assert.equal(result.shippingBillReference, "SYN-SB-1");
});

test("composition seller export is blocked", () => {
  const configuration = policy({ seller: { ...policy().seller, registrationType: "composition" } });
  assert.throws(() => determineExportTax({ configuration, exportMode: "lut_without_igst", invoiceDate: "2026-11-10",
    product: { code: "SYN-TURMERIC", hsn: "09103030" }, amount: 100, destinationCountry: "Synthetic destination",
    lutReference: "SYN-LUT-1", shippingBillReference: "SYN-SB-1" }), { code: "COMPOSITION_EXPORT_BLOCKED" });
});

test("IGST-paid export requires the explicit permitted configuration and evidence", () => {
  const configuration = policy({ export: { ...policy().export, mode: "igst_paid", igstPaymentPermitted: true, igstPermissionReference: "synthetic-permission" } });
  const result = determineExportTax({ configuration, exportMode: "igst_paid", invoiceDate: "2026-11-10",
    product: { code: "SYN-TURMERIC", hsn: "09103030" }, amount: 100, destinationCountry: "Synthetic destination", shippingBillReference: "SYN-SB-2" });
  assert.equal(result.igst, 5);
  assert.throws(() => determineExportTax({ configuration: policy(), exportMode: "igst_paid", invoiceDate: "2026-11-10",
    product: { code: "SYN-TURMERIC", hsn: "09103030" }, amount: 100, destinationCountry: "Synthetic destination", shippingBillReference: "SYN-SB-2" }), { code: "EXPORT_IGST_NOT_CONFIGURED" });
});

test("missing or invalid seller registration configuration fails closed", () => {
  assert.equal(isTaxConfigurationApproved(policy({ seller: { ...policy().seller, registrationType: "unknown" } })), false);
  assert.throws(() => determineDomesticSaleTax(input({ configuration: policy({ seller: { ...policy().seller, registrationType: "unknown" } }) })), { code: "TAX_POLICY_UNAPPROVED" });
  assert.equal(isTaxConfigurationApproved(policy({ seller: { ...policy().seller, gstin: "invalid" } })), false);
});

test("domestic approval does not require an export route, while export remains independently blocked", () => {
  const unverifiedExport = { status: "unverified", mode: "unconfigured", reference: "", lutReference: "", lutValidFrom: "", lutValidTo: "", igstPaymentPermitted: false, igstPermissionReference: "" };
  const configuration = policy({ export: unverifiedExport });
  assert.equal(isTaxConfigurationApproved(configuration), true);
  assert.equal(determineDomesticSaleTax(input({ configuration })).gstAmount, 5);
  assert.throws(() => determineExportTax({ configuration, exportMode: "lut_without_igst", invoiceDate: "2026-11-10",
    product: { code: "SYN-TURMERIC", hsn: "09103030" }, amount: 100, destinationCountry: "Synthetic destination",
    lutReference: "SYN-LUT-1", shippingBillReference: "SYN-SB-1" }), { code: "EXPORT_TAX_POLICY_UNAPPROVED" });
});

test("an unclassified product remains blocked without disabling configured products", () => {
  const configuration = policy({
    productClassifications: [verifiedRule(), { productCode: "SYN-UNKNOWN", hsn: "unknown", classification: "unclassified" }],
    export: { status: "unverified", mode: "unconfigured", reference: "" },
  });
  assert.equal(isTaxConfigurationApproved(configuration), true);
  assert.equal(determineDomesticSaleTax(input({ configuration })).gstAmount, 5);
  assert.throws(() => determineDomesticSaleTax(input({ configuration, lines: [{ productCode: "SYN-UNKNOWN", qty: 1, rate: 100 }], products: [{ code: "SYN-UNKNOWN", hsn: "unknown", active: true }] })), { code: "TAX_CLASSIFICATION_UNAVAILABLE" });
});

test("missing or invalid Place of Supply is rejected instead of using customer state", () => {
  assert.throws(() => determineDomesticSaleTax(input({ placeOfSupplyStateCode: "" })), { code: "PLACE_OF_SUPPLY_REQUIRED" });
  assert.throws(() => determineDomesticSaleTax(input({ placeOfSupplyStateCode: "00" })), { code: "PLACE_OF_SUPPLY_REQUIRED" });
  assert.throws(() => determineDomesticSaleTax(input({ placeOfSupplyAddress: "" })), { code: "PLACE_OF_SUPPLY_REQUIRED" });
});

test("unknown invoice types and impossible effective dates fail closed", () => {
  assert.throws(() => determineDomesticSaleTax(input({ invoiceType: "OTHER" })), { code: "INVALID_INVOICE_TYPE" });
  const impossibleDatePolicy = policy({ productClassifications: [verifiedRule({ effectiveFrom: "2026-02-30" })] });
  assert.equal(isTaxConfigurationApproved(impossibleDatePolicy), false);
  assert.throws(() => determineDomesticSaleTax(input({ configuration: impossibleDatePolicy })), { code: "TAX_POLICY_UNAPPROVED" });
});

test("a saved transaction tax snapshot is reused without current-policy recalculation", () => {
  const first = determineDomesticSaleTax(input());
  const edited = determineDomesticSaleTax(input({ configuration: null, lines: [{ productCode: "SYN-TURMERIC", qty: 2, rate: 100 }], frozenSnapshot: first.taxSnapshot }));
  assert.equal(edited.gstAmount, 10); assert.equal(edited.igst, 0); assert.equal(edited.taxSnapshot.configurationRevision, null);
  assert.throws(() => determineDomesticSaleTax(input({ configuration: null, salesDate: "2026-11-11", frozenSnapshot: first.taxSnapshot })), { code: "TAX_SNAPSHOT_PROTECTED" });
});
