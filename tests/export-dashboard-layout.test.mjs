import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HEURISTIC_CUSTOMER_CODES, HEURISTIC_DOCUMENT_IDS } from "../app/international/export/review-flags.mjs";

test("International Export Dashboard presents all 11 source-backed module counts and review states", async () => {
  const panel = await readFile(new URL("../app/dashboard/BusinessSummaryPanel.tsx", import.meta.url), "utf8");
  const dal = await readFile(new URL("../app/dashboard/business-summary-dal.mjs", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../app/ERPWorkspace.tsx", import.meta.url), "utf8");

  const cards = panel.slice(panel.indexOf("const EXPORT_CARDS"), panel.indexOf("const EXPORT_DOCUMENTS"));
  assert.equal((cards.match(/page: "export-[a-z-]+"/g) ?? []).length, 11);
  for (const label of ["Export Customers", "Enquiries", "Quotations", "Proforma Invoices", "Export Orders", "Export Purchases", "Export Stock", "Reservations", "Packing", "Shipments", "Commercial Invoices"]) {
    assert.ok(panel.includes(`label: "${label}"`), `missing KPI ${label}`);
  }
  for (const text of ["Total source records", "Owner-verified operational records", "Review-pending records", "Heuristic-flagged records", "Export pipeline overview"]) assert.ok(panel.includes(text));
  for (const text of ["Export Document Centre", "Draft", "Issued", "Evidence pending: Not tracked", "quick actions", "CHA Document Pack · unavailable"]) assert.ok(panel.includes(text));
  assert.match(panel, /verified\(item\.verified\) \+ pending\(item\.pending\)/);
  assert.match(panel, /@media \(max-width: 1100px\)/);
  assert.match(panel, /@media \(max-width: 700px\)/);
  assert.match(workspace, /<BusinessSummaryPanel view="export"/);
  assert.match(dal, /WHERE company_id=\$1/);
  assert.match(dal, /heuristicCustomerCount/);
  assert.match(dal, /heuristicDocumentCount/);
  assert.match(panel, /review hints, not evidence that records are invalid/);
  assert.equal(HEURISTIC_CUSTOMER_CODES.length, 4);
  assert.equal(HEURISTIC_DOCUMENT_IDS.length, 5);
});
