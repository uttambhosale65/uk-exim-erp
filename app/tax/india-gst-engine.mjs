const STATE_CODE = /^(0[1-9]|[1-2][0-9]|3[0-8])$/;
const CLASSIFICATIONS = new Set(["taxable", "nil_rated", "exempt", "non_gst", "unclassified"]);
const POS_BASES = new Set([
  "movement_destination",
  "third_party_bill_to",
  "no_movement_location",
  "installation_site",
  "onboard_location",
  "other_statutory_rule",
]);

export function taxError(code, message) {
  return Object.assign(new Error(message), { code });
}

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const money = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw taxError("INVALID_TAX_INPUT", `${label} is invalid.`);
  return number;
};

export function isValidIndianStateCode(value) {
  return typeof value === "string" && STATE_CODE.test(value);
}

function registrationIsVerified(seller) {
  return seller?.registrationType === "regular" || seller?.registrationType === "composition";
}

export function isTaxConfigurationApproved(configuration) {
  const seller = configuration?.seller;
  const verification = seller?.verification;
  const approval = configuration?.approval;
  const exportRule = configuration?.export;
  const gstin = typeof seller?.gstin === "string" ? seller.gstin.trim().toUpperCase() : "";

  if (approval?.status !== "approved" || approval?.ownerAttested !== true
    || approval?.accountantReviewed !== true || !approval?.accountantReference?.trim()) return false;
  if (!registrationIsVerified(seller) || !isValidIndianStateCode(seller.stateCode)) return false;
  if (!/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin) || gstin.slice(0, 2) !== seller.stateCode) return false;
  if (verification?.status !== "verified"
    || !["official_gst_search", "registration_certificate"].includes(verification.source)
    || !verification.reference?.trim() || !verification.verifiedOn) return false;
  if (!exportRule || typeof exportRule !== "object" || Array.isArray(exportRule)) return false;
  const rules = configuration?.productClassifications;
  return Array.isArray(rules)
    && rules.some((rule) => validClassificationRule(rule))
    && rules.every((rule) => validClassificationRule(rule) || validUnclassifiedRule(rule));
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validClassificationRule(rule) {
  return rule && typeof rule.productCode === "string" && rule.productCode.trim()
    && typeof rule.hsn === "string" && rule.hsn.trim()
    && CLASSIFICATIONS.has(rule.classification) && rule.classification !== "unclassified"
    && validDate(rule.effectiveFrom) && (!rule.effectiveTo || validDate(rule.effectiveTo))
    && (!rule.effectiveTo || rule.effectiveTo >= rule.effectiveFrom)
    && typeof rule.evidenceReference === "string" && rule.evidenceReference.trim()
    && (rule.classification !== "taxable"
      ? Number(rule.ratePercent) === 0
      : Number.isFinite(Number(rule.ratePercent)) && Number(rule.ratePercent) > 0 && Number(rule.ratePercent) <= 100);
}

function validUnclassifiedRule(rule) {
  return rule?.classification === "unclassified"
    && typeof rule.productCode === "string" && Boolean(rule.productCode.trim());
}

function requireApprovedPolicy(configuration, date) {
  if (!isTaxConfigurationApproved(configuration)) {
    throw taxError("TAX_POLICY_UNAPPROVED", "Sales posting is blocked until seller registration, product classifications, the accountant-approved tax matrix, and export treatment are verified.");
  }
  if (!validDate(date)) throw taxError("INVALID_TAX_INPUT", "Sales date is invalid for effective tax rules.");
}

function ruleFor(configuration, product, date) {
  const matches = configuration.productClassifications.filter((rule) =>
    rule.productCode === product.code && rule.hsn === product.hsn
      && rule.effectiveFrom <= date && (!rule.effectiveTo || rule.effectiveTo >= date));
  if (matches.length !== 1 || !validClassificationRule(matches[0])) {
    throw taxError("TAX_CLASSIFICATION_UNAVAILABLE", `An effective verified tax classification is not configured for product ${product.code}.`);
  }
  return matches[0];
}

function resolveDocumentAndTax({ invoiceType, seller, rule, placeOfSupplyStateCode }) {
  if (!CLASSIFICATIONS.has(rule.classification) || rule.classification === "unclassified") {
    throw taxError("TAX_CLASSIFICATION_UNAVAILABLE", "The product tax classification is unresolved.");
  }
  if (seller.registrationType === "composition") {
    if (invoiceType !== "NON_GST") throw taxError("BILLING_TYPE_MISMATCH", "A composition seller must issue a Bill of Supply and cannot collect GST separately.");
    return { documentType: "BILL_OF_SUPPLY", rate: 0, component: "none" };
  }
  if (rule.classification === "taxable") {
    if (invoiceType !== "GST") throw taxError("TAXABLE_NON_GST_BLOCKED", "A regular GST-registered seller cannot issue a Without GST invoice for a taxable supply.");
    return {
      documentType: "GST_TAX_INVOICE",
      rate: Number(rule.ratePercent),
      component: seller.stateCode === placeOfSupplyStateCode ? "intra_state" : "inter_state",
    };
  }
  if (invoiceType === "GST") throw taxError("BILLING_TYPE_MISMATCH", "Nil-rated and exempt supplies require a Bill of Supply, not a GST Tax Invoice.");
  return rule.classification === "non_gst"
    ? { documentType: "COMMERCIAL_INVOICE", rate: 0, component: "none" }
    : { documentType: "BILL_OF_SUPPLY", rate: 0, component: "none" };
}

function calculateLine(item, rule, taxMode) {
  const qty = money(item.qty, "Sales quantity");
  const rate = money(item.rate, "Sales unit price");
  if (qty <= 0) throw taxError("INVALID_TAX_INPUT", "Sales quantity must be greater than zero.");
  const amount = round2(qty * rate);
  const gstAmount = taxMode.rate ? round2(amount * taxMode.rate / 100) : 0;
  const cgst = taxMode.component === "intra_state" ? round2(gstAmount / 2) : 0;
  const sgst = taxMode.component === "intra_state" ? round2(gstAmount - cgst) : 0;
  const igst = taxMode.component === "inter_state" ? gstAmount : 0;
  return {
    ...item,
    qty,
    rate,
    hsn: rule.hsn,
    gst: taxMode.rate,
    amount,
    taxableAmount: amount,
    gstAmount,
    cgst,
    sgst,
    igst,
    grandTotal: round2(amount + gstAmount),
  };
}

export function determineDomesticSaleTax({ configuration, invoiceType, salesDate, placeOfSupplyStateCode, placeOfSupplyBasis, placeOfSupplyAddress, lines, products, frozenSnapshot }) {
  if (invoiceType !== "GST" && invoiceType !== "NON_GST") {
    throw taxError("INVALID_INVOICE_TYPE", "Select either GST Tax Invoice or Without GST Invoice.");
  }
  if (frozenSnapshot) {
    if (frozenSnapshot.version !== 1 || !frozenSnapshot.seller
      || !["regular", "composition"].includes(frozenSnapshot.seller.registrationType)
      || !isValidIndianStateCode(frozenSnapshot.seller.stateCode)
      || !Array.isArray(frozenSnapshot.lines)) {
      throw taxError("TAX_SNAPSHOT_INVALID", "The saved tax decision is invalid; invoice editing is blocked for review.");
    }
    if (frozenSnapshot.invoiceType !== invoiceType) throw taxError("TAX_SNAPSHOT_PROTECTED", "The billing option cannot change while editing an invoice with a saved tax decision.");
  } else {
    requireApprovedPolicy(configuration, salesDate);
  }
  if (!isValidIndianStateCode(placeOfSupplyStateCode) || !POS_BASES.has(placeOfSupplyBasis)
    || typeof placeOfSupplyAddress !== "string" || !placeOfSupplyAddress.trim()) {
    throw taxError("PLACE_OF_SUPPLY_REQUIRED", "A legally determined Place of Supply state, basis, and delivery/location address are required.");
  }
  if (!Array.isArray(lines) || !lines.length || !Array.isArray(products)) {
    throw taxError("INVALID_TAX_INPUT", "Sales lines and verified product records are required.");
  }
  if (frozenSnapshot) {
    if (frozenSnapshot.salesDate !== salesDate
      || frozenSnapshot.placeOfSupplyStateCode !== placeOfSupplyStateCode
      || frozenSnapshot.placeOfSupplyBasis !== placeOfSupplyBasis
      || frozenSnapshot.placeOfSupplyAddress !== placeOfSupplyAddress) {
      throw taxError("TAX_SNAPSHOT_PROTECTED", "The saved tax decision and Place of Supply cannot be changed while editing this invoice.");
    }
  }
  const productMap = new Map(products.map((product) => [product.code, product]));
  const seller = frozenSnapshot?.seller || configuration.seller;
  if (seller.registrationType === "composition" && seller.stateCode !== placeOfSupplyStateCode) {
    throw taxError("COMPOSITION_INTERSTATE_GOODS_BLOCKED", "Inter-State outward supply of goods is not available under the configured composition scheme; verify the seller's current registration status before proceeding.");
  }
  const oldRules = new Map((frozenSnapshot?.lines || []).map((line) => [line.productCode, line.rule]));
  const calculated = lines.map((line) => {
    const product = productMap.get(line.productCode);
    if (!product || product.active === false) throw taxError("REFERENCE_NOT_FOUND", "A selected product is unavailable or inactive in this company.");
    if (typeof product.hsn !== "string" || !product.hsn.trim()) throw taxError("TAX_CLASSIFICATION_UNAVAILABLE", `Product ${product.code} has no verified HSN in the company Product Master.`);
    const rule = frozenSnapshot ? oldRules.get(product.code) : ruleFor(configuration, product, salesDate);
    if (!rule || rule.hsn !== product.hsn) throw taxError("TAX_SNAPSHOT_PROTECTED", `No matching saved tax rule exists for product ${product.code}; tax policy cannot be silently changed during edit.`);
    const taxMode = resolveDocumentAndTax({ invoiceType, seller: frozenSnapshot?.seller || configuration.seller, rule, placeOfSupplyStateCode });
    const result = calculateLine({ ...line, productCode: product.code }, rule, taxMode);
    return { ...result, rule, documentType: taxMode.documentType };
  });
  const documentTypes = [...new Set(calculated.map((line) => line.documentType))];
  if (documentTypes.length !== 1) throw taxError("MIXED_TAX_DOCUMENTS", "Items requiring different statutory document types must be invoiced separately.");
  const linesForSave = calculated.map((line) => Object.fromEntries(
    Object.entries(line).filter(([key]) => key !== "rule" && key !== "documentType"),
  ));
  const total = (key) => round2(linesForSave.reduce((sum, line) => sum + Number(line[key] || 0), 0));
  const snapshot = frozenSnapshot ? { ...frozenSnapshot } : {
    version: 1,
    salesDate,
    invoiceType,
    documentType: documentTypes[0],
    seller: {
      gstin: configuration.seller.gstin.toUpperCase(),
      registrationType: configuration.seller.registrationType,
      stateCode: configuration.seller.stateCode,
    },
    placeOfSupplyStateCode,
    placeOfSupplyBasis,
    placeOfSupplyAddress: placeOfSupplyAddress.trim(),
    configurationRevision: configuration.revision ?? null,
    lines: calculated.map((line) => ({
      productCode: line.productCode,
      hsn: line.hsn,
      classification: line.rule.classification,
      rule: {
        productCode: line.rule.productCode,
        hsn: line.rule.hsn,
        classification: line.rule.classification,
        ratePercent: Number(line.rule.ratePercent),
        effectiveFrom: line.rule.effectiveFrom,
        effectiveTo: line.rule.effectiveTo || null,
        evidenceReference: line.rule.evidenceReference,
      },
    })),
  };
  return {
    items: linesForSave,
    taxableAmount: total("taxableAmount"),
    gstAmount: total("gstAmount"),
    cgst: total("cgst"),
    sgst: total("sgst"),
    igst: total("igst"),
    grandTotal: total("grandTotal"),
    documentType: documentTypes[0],
    taxSnapshot: snapshot,
  };
}

export function determineExportTax({ configuration, exportMode, invoiceDate, product, amount, destinationCountry, lutReference, shippingBillReference }) {
  requireApprovedPolicy(configuration, invoiceDate);
  if (configuration.seller.registrationType === "composition") {
    throw taxError("COMPOSITION_EXPORT_BLOCKED", "Export goods supply is blocked under the configured composition scheme; verify the seller's current registration status before proceeding.");
  }
  const policy = configuration.export;
  if (policy.status !== "verified" || !policy.reference?.trim() || !destinationCountry?.trim()) {
    throw taxError("EXPORT_TAX_POLICY_UNAPPROVED", "Verified export tax configuration and destination are required.");
  }
  const rule = ruleFor(configuration, product, invoiceDate);
  if (rule.classification !== "taxable") throw taxError("EXPORT_CLASSIFICATION_UNAVAILABLE", "Export tax treatment for this product classification is unresolved.");
  const taxableAmount = round2(money(amount, "Export taxable amount"));
  if (exportMode === "lut_without_igst") {
    if (policy.mode !== exportMode || !policy.lutReference?.trim() || !validDate(policy.lutValidFrom)
      || !validDate(policy.lutValidTo) || invoiceDate < policy.lutValidFrom || invoiceDate > policy.lutValidTo
      || lutReference !== policy.lutReference || !shippingBillReference?.trim()) {
      throw taxError("EXPORT_LUT_INVALID", "A valid, effective LUT and export shipping-bill reference are required for this route.");
    }
    return { taxableAmount, igst: 0, taxAmount: 0, mode: exportMode, hsn: rule.hsn, rate: Number(rule.ratePercent), lutReference, shippingBillReference, destinationCountry };
  }
  if (exportMode === "igst_paid") {
    if (policy.mode !== exportMode || policy.igstPaymentPermitted !== true || !policy.igstPermissionReference?.trim()
      || !shippingBillReference?.trim()) {
      throw taxError("EXPORT_IGST_NOT_CONFIGURED", "IGST-paid export is blocked until permitted status and supporting approval are configured.");
    }
    const igst = round2(taxableAmount * Number(rule.ratePercent) / 100);
    return { taxableAmount, igst, taxAmount: igst, mode: exportMode, hsn: rule.hsn, rate: Number(rule.ratePercent), shippingBillReference, destinationCountry };
  }
  throw taxError("EXPORT_TAX_POLICY_UNAPPROVED", "An approved export tax route must be selected.");
}

export const TAX_CLASSIFICATIONS = Object.freeze([...CLASSIFICATIONS]);
export const PLACE_OF_SUPPLY_BASES = Object.freeze([...POS_BASES]);
