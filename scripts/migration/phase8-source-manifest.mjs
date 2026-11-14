import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE = "C:/Users/ADMIN/Documents/UK-EXIM-ERP-Backups/UK-EXIM-ERP-Full-Backup-2026-11-12.json";
const OUTPUT = path.join(ROOT, ".local-test", "phase8-source-to-database-manifest.json");
const OWNER_REVIEW_IDS = new Set([
  "7d70833c-b14c-4d91-ae35-22d4f1ca67de", "2b23391f-251b-4b45-957b-141b12fd91f8",
  "45ce45ff-9eb7-43db-ad12-9d57c9f96ca4", "89361c26-7eb0-45de-bf3b-2b816828e655",
  "57003b1c-4ca5-4a7f-ba3b-106666973df6", "d1a2c139-d728-4fc1-bdde-144f65ab98b4",
  "0a232d05-a65f-4cc5-8682-e3317807d493", "shipment-1791371565322-va5llf",
  "8d66ccf8-1b78-4805-903c-9aa77823aeef",
]);
const DEFINITIONS = [
  ["uk-exim-export-customers", "export_customers", null, []],
  ["uk-exim-export-enquiries", "export_documents:enquiry", "enquiryNo", ["customerCode"]],
  ["uk-exim-export-quotations", "export_documents:quotation", "quotationNo", ["enquiryNo", "customerCode"]],
  ["uk-exim-export-proforma-invoices", "export_documents:proforma_invoice", "proformaInvoiceNo", ["quotationNo", "enquiryNo", "customerCode"]],
  ["uk-exim-export-orders", "export_documents:order", "exportOrderNo", ["proformaInvoiceNo", "quotationNo", "enquiryNo", "customerCode"]],
  ["uk-exim-export-purchases", "export_documents:purchase", "purchaseNo", ["exportOrderNo", "customerCode"]],
  ["uk-exim-export-reservations", "export_documents:reservation", "reservationNo", ["exportOrderNo", "customerCode"]],
  ["uk-exim-export-packings", "export_documents:packing", "packingNo", ["exportOrderNo", "reservationNo", "customerCode"]],
  ["uk-exim-export-shipments", "export_documents:shipment", "shipmentNo", ["exportOrderNo", "reservationNo", "packingNo", "commercialInvoiceNo", "customerCode"]],
  ["uk-exim-export-commercial-invoices", "export_documents:commercial_invoice", "invoiceNo", ["orderNo", "proformaInvoiceNo", "quotationNo", "enquiryNo", "shipmentNo", "customerCode"]],
  ["uk-exim-international-export-stock", "export_stock", null, ["purchaseReference"]],
];
const SETTINGS = [
  ["uk-exim-company-settings", "company"], ["uk-exim-invoice-settings", "invoice"],
  ["uk-exim-bank-settings", "bank"], ["uk-exim-international-settings", "international"],
];
const fingerprint = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const parseKey = (backup, key) => {
  const entry = backup.keys?.[key];
  if (!entry?.exists || !entry.parseSucceeded || typeof entry.raw !== "string") throw new Error(`Source backup key ${key} is unavailable or invalid.`);
  return { value: JSON.parse(entry.raw), raw: entry.raw };
};

const rawBackup = await readFile(SOURCE, "utf8");
const backup = JSON.parse(rawBackup);
if (backup.format !== "UK-EXIM-ERP-FULL-RAW-BACKUP" || backup.formatVersion !== 1 || backup.keyCount !== 24) throw new Error("The verified 24-key ERP backup format was not found.");
const recordsByKind = new Map();
for (const [key, , numberField] of DEFINITIONS) {
  const { value } = parseKey(backup, key);
  if (!Array.isArray(value)) throw new Error(`Source ${key} is not an array.`);
  recordsByKind.set(key, { numberField, records: value });
}
const settingsRecords = SETTINGS.map(([key, targetKey]) => {
  const { value } = parseKey(backup, key);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Settings source ${key} is not an object.`);
  return { sourceKey: key, targetKey, sourceRecordHash: fingerprint(value), fieldNames: Object.keys(value).sort(), targetStatus: "not_imported_dev_schema_pending" };
});
const indexes = new Map();
for (const [key, { numberField, records }] of recordsByKind) {
  const numbers = new Set(records.map(record => numberField ? record[numberField] : record.code).filter(Boolean));
  indexes.set(key, numbers);
}
const findTargetKey = reference => {
  if (reference === "customerCode") return "uk-exim-export-customers";
  if (["enquiryNo"].includes(reference)) return "uk-exim-export-enquiries";
  if (["quotationNo"].includes(reference)) return "uk-exim-export-quotations";
  if (["proformaInvoiceNo"].includes(reference)) return "uk-exim-export-proforma-invoices";
  if (["exportOrderNo", "orderNo"].includes(reference)) return "uk-exim-export-orders";
  if (reference === "reservationNo") return "uk-exim-export-reservations";
  if (reference === "packingNo") return "uk-exim-export-packings";
  if (["commercialInvoiceNo", "invoiceNo"].includes(reference)) return "uk-exim-export-commercial-invoices";
  if (reference === "shipmentNo") return "uk-exim-export-shipments";
  if (reference === "purchaseReference") return "uk-exim-export-purchases";
  return null;
};
const entities = [];
let verifiedReferenceCount = 0, unresolvedReferenceCount = 0;
for (const [sourceKey, target, numberField, referenceFields] of DEFINITIONS) {
  const { records } = recordsByKind.get(sourceKey);
  const recordsOut = records.map(record => {
    const refs = [];
    for (const field of referenceFields) {
      const value = record[field];
      if (typeof value !== "string" || !value.trim()) continue;
      const targetKey = findTargetKey(field);
      const valid = targetKey ? indexes.get(targetKey)?.has(value) === true : null;
      if (valid === true) verifiedReferenceCount++;
      if (valid === false || valid === null) unresolvedReferenceCount++;
      refs.push({ field, targetKey, match: valid === true ? "source_match" : valid === false ? "missing_source_match" : "target_mapping_unverified" });
    }
    const reviewRequired = OWNER_REVIEW_IDS.has(String(record.id));
    return {
      sourceId: typeof record.id === "string" ? record.id : null,
      sourceCodeOrDocumentNumber: typeof record.code === "string" ? record.code : numberField && typeof record[numberField] === "string" ? record[numberField] : null,
      sourceDate: numberField && typeof record[`${numberField.replace(/No$/, "Date")}`] === "string" ? record[`${numberField.replace(/No$/, "Date")}`] : null,
      sourceRecordHash: fingerprint(record),
      sourceFieldNames: Object.keys(record).sort(),
      references: refs,
      ownerReview: reviewRequired ? "required_flagged_not_confirmed_invalid" : "no_existing_flag_requires_independent_source_review",
      target,
      targetStatus: "not_imported_dev_schema_activation_pending",
    };
  });
  entities.push({ sourceKey, target, sourceCount: records.length, sourceRecords: recordsOut });
}
const manifest = {
  format: "UK-EXIM-PHASE-8-SOURCE-TO-DATABASE-MANIFEST",
  version: 1,
  sourcePath: SOURCE,
  sourceBackupSha256: createHash("sha256").update(rawBackup).digest("hex"),
  sourceBackupKeys: backup.keyCount,
  generatedAt: new Date().toISOString(),
  databaseWritesPerformed: false,
  devDatabaseConnected: false,
  persistentTestDatabaseConnected: false,
  records: entities,
  settings: settingsRecords,
  totals: {
    exportCustomers: recordsByKind.get("uk-exim-export-customers").records.length,
    exportDocuments: entities.filter(entity => entity.target.startsWith("export_documents:")).reduce((total, entity) => total + entity.sourceCount, 0),
    exportStock: recordsByKind.get("uk-exim-international-export-stock").records.length,
    ownerReviewFlagged: OWNER_REVIEW_IDS.size,
    verifiedReferences: verifiedReferenceCount,
    unresolvedReferences: unresolvedReferenceCount,
    settingsObjects: settingsRecords.length,
  },
  importPolicy: "No source values were written. Existing DEV export/settings schema activation, source reconciliation and owner review remain separate prerequisites.",
};
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "w" });
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT), sourceBackupSha256: manifest.sourceBackupSha256,
  sourceKeyCount: manifest.sourceBackupKeys, totals: manifest.totals, databaseWritesPerformed: false }));
