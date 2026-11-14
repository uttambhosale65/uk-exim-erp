import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FULL_BACKUP_KEYS } from "../../tools/legacy-product-exporter/export-core.mjs";

export const ENTITY_MIGRATION_MAP = Object.freeze({
  "uk-exim-products": { targets: ["public.products"], status: "already-migrated-read-only-verification-required", phase: 10 },
  "uk-exim-customers": { targets: ["public.customers"], status: "partial-source_record-preservation", phase: 20 },
  "uk-exim-suppliers": { targets: ["public.suppliers"], status: "partial-source_record-preservation", phase: 20 },
  "uk-exim-purchases": { targets: ["public.purchases", "public.purchase_items"], status: "partial-parent-child-mapping", phase: 30 },
  "uk-exim-sales": { targets: ["public.sales", "public.sales_items"], status: "partial-parent-child-mapping", phase: 40 },
  "uk-exim-stock": { targets: ["public.stock_baselines"], status: "blocked-baseline-semantics-and-reconciliation-required", phase: 50 },
  "uk-exim-stock-movements-v1": { targets: ["public.stock_movement_transactions", "public.stock_movements"], status: "blocked-posting-history-reconciliation-required", phase: 60 },
  "uk-exim-stock-movement-journal-v1": { targets: [], status: "blocked-transient-recovery-journal-has-no-target-table", phase: 60 },
  "uk-exim-company-settings": { targets: [], status: "missing-target-schema", phase: 70 },
  "uk-exim-invoice-settings": { targets: [], status: "missing-target-schema", phase: 70 },
  "uk-exim-bank-settings": { targets: [], status: "missing-target-schema", phase: 70 },
  "uk-exim-export-customers": { targets: [], status: "missing-export-schema", phase: 80 },
  "uk-exim-export-enquiries": { targets: [], status: "missing-export-schema", phase: 80 },
  "uk-exim-export-quotations": { targets: [], status: "missing-export-schema", phase: 80 },
  "uk-exim-export-proforma-invoices": { targets: [], status: "missing-export-schema", phase: 80 },
  "uk-exim-export-orders": { targets: [], status: "missing-export-schema", phase: 80 },
  "uk-exim-export-purchases": { targets: [], status: "missing-export-schema", phase: 80 },
  "uk-exim-international-export-stock": { targets: [], status: "missing-separate-export-stock-schema", phase: 80 },
  "uk-exim-export-reservations": { targets: [], status: "missing-export-schema", phase: 80 },
  "uk-exim-export-packings": { targets: [], status: "missing-export-schema", phase: 80 },
  "uk-exim-export-shipments": { targets: [], status: "missing-export-schema", phase: 80 },
  "uk-exim-export-commercial-invoices": { targets: [], status: "missing-export-schema", phase: 80 },
  "uk-exim-international-settings": { targets: [], status: "missing-target-schema", phase: 70 },
  "uk-exim-sales-numbering-v2": { targets: [], status: "missing-target-schema", phase: 70 },
});

const sha256 = (raw) => createHash("sha256").update(raw, "utf8").digest("hex");

function inspectEntry(key, entry) {
  const problems = [];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return { key, present: false, parsed: false, recordCount: null, checksum: null, problems: ["entry-format-invalid"] };
  }
  if (entry.exists === false) {
    if (entry.raw !== null || entry.sha256 !== null) problems.push("missing-entry-has-value-or-checksum");
    return { key, present: false, parsed: false, recordCount: null, checksum: null, problems };
  }
  if (entry.exists !== true || typeof entry.raw !== "string") {
    problems.push("present-entry-must-contain-original-raw-string");
    return { key, present: entry.exists === true, parsed: false, recordCount: null, checksum: null, problems };
  }
  const checksum = sha256(entry.raw);
  if (entry.sha256 !== checksum) problems.push("raw-value-checksum-mismatch");
  let parsed;
  try {
    parsed = JSON.parse(entry.raw);
  } catch {
    problems.push("invalid-json-preserved-but-not-importable");
  }
  const parsedSuccessfully = !problems.includes("invalid-json-preserved-but-not-importable");
  const recordCount = parsedSuccessfully && Array.isArray(parsed) ? parsed.length : null;
  if (entry.parseSucceeded !== parsedSuccessfully) problems.push("parse-status-metadata-mismatch");
  if (entry.recordCount !== recordCount) problems.push("record-count-metadata-mismatch");
  const sourceIds = new Set();
  const businessCodes = new Set();
  if (Array.isArray(parsed)) {
    parsed.forEach((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return;
      if (typeof row.id === "string") {
        if (sourceIds.has(row.id)) problems.push(`duplicate-source-id-at-row-${index + 1}`);
        sourceIds.add(row.id);
      }
      if (typeof row.code === "string") {
        if (businessCodes.has(row.code)) problems.push(`duplicate-source-code-at-row-${index + 1}`);
        businessCodes.add(row.code);
      }
    });
  }
  return { key, present: true, parsed: parsedSuccessfully, recordCount, checksum, problems };
}

export function reconcileFullBackup(backup) {
  const blockers = [];
  if (!backup || typeof backup !== "object" || Array.isArray(backup)
    || backup.format !== "UK-EXIM-ERP-FULL-RAW-BACKUP" || backup.formatVersion !== 1
    || !backup.keys || typeof backup.keys !== "object" || Array.isArray(backup.keys)) {
    return { ready: false, blockers: ["backup-envelope-invalid"], keys: [], dependencyOrder: [] };
  }
  const actualKeys = Object.keys(backup.keys).sort();
  const expectedKeys = [...FULL_BACKUP_KEYS].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) blockers.push("backup-key-inventory-mismatch");
  if (backup.keyCount !== FULL_BACKUP_KEYS.length) blockers.push("backup-key-count-mismatch");
  if (backup.origin !== "http://localhost:3000") blockers.push("backup-origin-does-not-match-original-erp-origin");
  if (typeof backup.timestamp !== "string" || !Number.isFinite(Date.parse(backup.timestamp))) blockers.push("backup-timestamp-invalid-or-missing");

  const keys = FULL_BACKUP_KEYS.map((key) => {
    const inspection = inspectEntry(key, backup.keys[key]);
    const mapping = ENTITY_MIGRATION_MAP[key];
    for (const problem of inspection.problems) blockers.push(`${key}:${problem}`);
    if (!inspection.present) blockers.push(`${key}:source-key-missing`);
    if (mapping.status.startsWith("missing-") || mapping.status.startsWith("blocked-")) blockers.push(`${key}:${mapping.status}`);
    if (key === "uk-exim-products") blockers.push("products:reported-seven-dev-products-must-be-read-only-reconciled-and-never-reinserted");
    return { ...inspection, targets: mapping.targets, mappingStatus: mapping.status, phase: mapping.phase };
  });

  blockers.push("target-dev-database-not-connected-or-queried-by-this-db-free-preflight");
  blockers.push("company-identity-and-target-collision-checks-pending-read-only-dev-review");
  blockers.push("foreign-key-date-numeric-total-and-stock-reconciliation-require-entity-specific-approved-contracts");
  return {
    ready: false,
    mode: "read-only-source-preflight",
    databaseConnection: "not-performed",
    writesPerformed: false,
    sourceTimestamp: backup.timestamp ?? null,
    sourceOrigin: backup.origin ?? null,
    keys,
    dependencyOrder: ["products (reconcile only)", "customers and suppliers", "purchases and purchase_items", "sales and sales_items", "stock baseline and movements (separate approved reconciliation)", "settings and export schema work"],
    blockers: [...new Set(blockers)],
  };
}

export async function readAndReconcileBackup(filename) {
  const raw = await readFile(filename, "utf8");
  let backup;
  try {
    backup = JSON.parse(raw);
  } catch {
    throw new Error("Backup envelope is not valid JSON.");
  }
  return reconcileFullBackup(backup);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes("--apply")) {
    console.error("--apply is not implemented. This utility is a read-only source preflight only.");
    process.exitCode = 2;
  } else if (args.length !== 1) {
    console.error("Usage: node scripts/migration/legacy-erp-preflight.mjs <full-backup.json>");
    process.exitCode = 2;
  } else {
    try {
      const report = await readAndReconcileBackup(args[0]);
      console.log(JSON.stringify(report, null, 2));
      if (!report.ready) process.exitCode = 1;
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
