import { createHash } from "node:crypto";

export const PHASE9_SOURCE_SHA256 = "A2928CD3E0BDB79CFB64AC264C4E5B0978B40B4BF9071B801A95C2320B8CB7C2";
export const EXPECTED_SOURCE_COUNTS = Object.freeze({ customers: 66, enquiry: 1, quotation: 2, proforma_invoice: 2, order: 2, purchase: 2, reservation: 2, packing: 1, shipment: 1, commercial_invoice: 1, stock: 2 });
export const DOCUMENT_DEFINITIONS = Object.freeze([
  ["uk-exim-export-enquiries", "enquiry", "enquiryNo", "enquiryDate", { customerCode: "customer" }],
  ["uk-exim-export-quotations", "quotation", "quotationNo", "quotationDate", { enquiryNo: "enquiry", customerCode: "customer" }],
  ["uk-exim-export-proforma-invoices", "proforma_invoice", "proformaInvoiceNo", "proformaInvoiceDate", { quotationNo: "quotation", enquiryNo: "enquiry", customerCode: "customer" }],
  ["uk-exim-export-orders", "order", "exportOrderNo", "exportOrderDate", { proformaInvoiceNo: "proforma_invoice", quotationNo: "quotation", enquiryNo: "enquiry", customerCode: "customer" }],
  ["uk-exim-export-purchases", "purchase", "purchaseNo", "purchaseDate", { exportOrderNo: "order", customerCode: "customer" }],
  ["uk-exim-export-reservations", "reservation", "reservationNo", "reservationDate", { exportOrderNo: "order", customerCode: "customer" }],
  ["uk-exim-export-packings", "packing", "packingNo", "packingDate", { exportOrderNo: "order", reservationNo: "reservation", customerCode: "customer" }],
  ["uk-exim-export-shipments", "shipment", "shipmentNo", "shipmentDate", { exportOrderNo: "order", reservationNo: "reservation", packingNo: "packing", commercialInvoiceNo: "commercial_invoice", customerCode: "customer" }],
  ["uk-exim-export-commercial-invoices", "commercial_invoice", "invoiceNo", "invoiceDate", { orderNo: "order", proformaInvoiceNo: "proforma_invoice", quotationNo: "quotation", enquiryNo: "enquiry", shipmentNo: "shipment", customerCode: "customer" }],
]);
export const SETTINGS_DEFINITIONS = Object.freeze([
  ["uk-exim-company-settings", "company"], ["uk-exim-invoice-settings", "invoice"],
  ["uk-exim-bank-settings", "bank"], ["uk-exim-international-settings", "international"],
]);
export const OWNER_REVIEW_IDS = new Set([
  "7d70833c-b14c-4d91-ae35-22d4f1ca67de", "2b23391f-251b-4b45-957b-141b12fd91f8", "45ce45ff-9eb7-43db-ad12-9d57c9f96ca4", "89361c26-7eb0-45de-bf3b-2b816828e655",
  "57003b1c-4ca5-4a7f-ba3b-106666973df6", "d1a2c139-d728-4fc1-bdde-144f65ab98b4", "0a232d05-a65f-4cc5-8682-e3317807d493", "shipment-1791371565322-va5llf", "8d66ccf8-1b78-4805-903c-9aa77823aeef",
]);

function fail(message) { throw new Error(message); }
function ws(text, index) { while (index < text.length && /\s/.test(text[index])) index++; return index; }
function tokenEnd(text, start) {
  const first = text[start];
  if (first === '"') {
    let escaped = false;
    for (let i = start + 1; i < text.length; i++) {
      if (escaped) escaped = false;
      else if (text[i] === "\\") escaped = true;
      else if (text[i] === '"') return i + 1;
    }
    return text.length;
  }
  if (first === "{" || first === "[") {
    const stack = [first === "{" ? "}" : "]"]; let quoted = false, escaped = false;
    for (let i = start + 1; i < text.length; i++) {
      const c = text[i];
      if (quoted) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') quoted = false; continue; }
      if (c === '"') quoted = true;
      else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
      else if (c === "}" || c === "]") { if (stack.pop() !== c) fail("JSON nesting is malformed."); if (!stack.length) return i + 1; }
    }
    return text.length;
  }
  let i = start;
  while (i < text.length && ![",", "]", "}"].includes(text[i]) && !/\s/.test(text[i])) i++;
  return i;
}

export function splitJsonArrayRaw(raw) {
  if (typeof raw !== "string") fail("Backup key is not raw JSON text.");
  let i = ws(raw, 0); if (raw[i] !== "[") fail("Backup value is not a JSON array."); i = ws(raw, i + 1);
  const out = []; if (raw[i] === "]") return out;
  while (i < raw.length) {
    const start = i, end = tokenEnd(raw, start), slice = raw.slice(start, end).trim();
    if (!slice) fail("Backup array contains an empty element."); out.push(slice); i = ws(raw, end);
    if (raw[i] === ",") { i = ws(raw, i + 1); continue; }
    if (raw[i] === "]") { if (raw.slice(i + 1).trim()) fail("Unexpected content follows a backup JSON array."); return out; }
    fail("Backup array delimiter is invalid.");
  }
  fail("Backup JSON array is unterminated.");
}

export function rawObjectField(object, wanted) {
  let i = ws(object, 0); if (object[i] !== "{") fail("Expected a JSON object source record."); i = ws(object, i + 1);
  while (object[i] !== "}" && i < object.length) {
    if (object[i] !== '"') fail("JSON object key is malformed.");
    const endKey = tokenEnd(object, i), key = JSON.parse(object.slice(i, endKey)); i = ws(object, endKey);
    if (object[i] !== ":") fail("JSON object key/value separator is missing.");
    const start = ws(object, i + 1), end = tokenEnd(object, start);
    if (key === wanted) return object.slice(start, end).trim();
    i = ws(object, end); if (object[i] === ",") i = ws(object, i + 1); else if (object[i] !== "}") fail("JSON object delimiter is invalid.");
  }
  return undefined;
}

function keyRaw(backup, key) {
  const entry = backup?.keys?.[key];
  if (!entry?.exists || !entry.parseSucceeded || typeof entry.raw !== "string") fail(`A required source key is absent or invalid: ${key}.`);
  return entry.raw;
}
function recordsFor(backup, key, expected, label) {
  const raw = keyRaw(backup, key); let parsed;
  try { parsed = JSON.parse(raw); } catch { fail(`A source array cannot be parsed: ${label}.`); }
  if (!Array.isArray(parsed) || parsed.length !== expected) fail(`Unexpected source count for ${label}.`);
  const slices = splitJsonArrayRaw(raw);
  if (slices.length !== parsed.length || parsed.some(item => !item || typeof item !== "object" || Array.isArray(item))) fail(`Source record slices are invalid for ${label}.`);
  return parsed.map((record, index) => ({ record, raw: slices[index] }));
}
function text(record, field, required = false) {
  const value = record[field];
  if (required && (typeof value !== "string" || !value.trim())) fail(`A required source identifier is invalid (${field}).`);
  return typeof value === "string" ? value : "";
}
function unique(items, field, label) {
  const seen = new Set();
  for (const { record } of items) { const value = text(record, field, true); if (seen.has(value)) fail(`Duplicate source identifier exists for ${label}.`); seen.add(value); }
}
function rawNumber(item, field) {
  const raw = rawObjectField(item.raw, field), value = item.record[field];
  if (raw === undefined || typeof value !== "number" || !Number.isFinite(value) || value < 0 || !/^(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw)) fail(`An export stock quantity is invalid (${field}).`);
  return raw;
}
function indexBy(items, field, label) {
  const map = new Map(); for (const item of items) { const value = text(item.record, field, true); if (map.has(value)) fail(`Duplicate source identifier exists for ${label}.`); map.set(value, item); } return map;
}

export function buildPhase9Plan(backup) {
  if (backup?.format !== "UK-EXIM-ERP-FULL-RAW-BACKUP" || backup.formatVersion !== 1 || backup.keyCount !== 24) fail("The source is not the expected 24-key raw ERP backup.");
  const customers = recordsFor(backup, "uk-exim-export-customers", 66, "Export Customers");
  unique(customers, "id", "Export Customer IDs"); unique(customers, "code", "Export Customer codes");
  const customerByCode = new Map();
  for (const item of customers) {
    text(item.record, "name", true);
    if (!["Active", "Inactive"].includes(item.record.status)) fail("An Export Customer status is invalid.");
    customerByCode.set(item.record.code, item);
    // Source not flagged by a heuristic is not proof of authenticity; retain all as review-only until affirmatively verified.
    item.reviewStatus = "review_required";
    item.directReview = OWNER_REVIEW_IDS.has(item.record.id);
  }
  const docs = new Map(), indexes = new Map();
  for (const [key, kind, numberField, dateField, referenceFields] of DOCUMENT_DEFINITIONS) {
    const items = recordsFor(backup, key, EXPECTED_SOURCE_COUNTS[kind], kind);
    unique(items, "id", `${kind} IDs`);
    const byNumber = indexBy(items, numberField, `${kind} document numbers`);
    docs.set(kind, items); indexes.set(kind, { byNumber, numberField, dateField, referenceFields });
    for (const item of items) {
      item.kind = kind; item.number = text(item.record, numberField, true); item.date = text(item.record, dateField);
      item.currency = text(item.record, "currency"); item.status = text(item.record, "status"); item.references = [];
      item.reviewStatus = "review_required"; item.directReview = OWNER_REVIEW_IDS.has(item.record.id); item.unresolvedReferences = 0;
    }
  }
  for (const [, kind, , , referenceFields] of DOCUMENT_DEFINITIONS) {
    for (const item of docs.get(kind)) for (const [field, targetKind] of Object.entries(referenceFields)) {
      const value = item.record[field]; if (value === undefined || value === null || value === "") continue;
      if (typeof value !== "string") { item.unresolvedReferences++; continue; }
      const target = targetKind === "customer" ? customerByCode.get(value) : indexes.get(targetKind)?.byNumber.get(value);
      if (!target) { item.unresolvedReferences++; continue; }
      item.references.push({ field, targetKind, target });
    }
  }
  const stockItems = recordsFor(backup, "uk-exim-international-export-stock", 2, "Export Stock");
  unique(stockItems, "id", "Export Stock IDs");
  const purchases = indexes.get("purchase").byNumber;
  for (const item of stockItems) {
    text(item.record, "productCode", true); text(item.record, "unit", true);
    if (!["Opening Stock", "Purchase"].includes(item.record.source)) fail("An Export Stock source is invalid.");
    item.numerics = Object.fromEntries(["availableQty", "reservedQty", "packedQty", "loadedQty", "shippedQty"].map(field => [field, rawNumber(item, field)]));
    item.productCode = item.record.productCode; item.lotBatchNo = text(item.record, "lotBatchNo"); item.unit = item.record.unit;
    item.stockSource = item.record.source === "Opening Stock" ? "opening" : "purchase"; item.purchaseReference = text(item.record, "purchaseReference");
    item.reviewStatus = "review_required"; item.directReview = OWNER_REVIEW_IDS.has(item.record.id);
    item.unresolvedReference = item.stockSource === "purchase" && (!item.purchaseReference || !purchases.has(item.purchaseReference));
  }
  const settings = SETTINGS_DEFINITIONS.map(([sourceKey, key]) => {
    const raw = keyRaw(backup, sourceKey); let value;
    try { value = JSON.parse(raw); } catch { fail(`A settings source object cannot be parsed (${key}).`); }
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`A settings source is not an object (${key}).`);
    return { sourceKey, key, raw, value };
  });
  const docsList = [...docs.values()].flat();
  const all = [...customers, ...docsList, ...stockItems];
  return {
    customers, docs, documents: docsList, stockItems, settings, customerByCode, indexes,
    sourceCounts: { customers: customers.length, documents: docsList.length, stock: stockItems.length, settings: settings.length },
    directReviewCount: all.filter(item => item.directReview).length,
    reviewCount: all.filter(item => item.reviewStatus === "review_required").length,
    unresolvedReferences: docsList.reduce((sum, item) => sum + item.unresolvedReferences, 0) + stockItems.filter(item => item.unresolvedReference).length,
  };
}
export function verifySourceHash(raw) { return createHash("sha256").update(raw, "utf8").digest("hex").toUpperCase(); }
