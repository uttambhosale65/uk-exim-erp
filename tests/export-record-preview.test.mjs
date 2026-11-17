import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Export Customer preview places the customer's legal company name above profile details", async () => {
  const source = await readFile(new URL("../app/international/export/ExportRecordPreview.tsx", import.meta.url), "utf8");

  assert.match(source, /kind === "customers" && typeof record\.name === "string"/);
  assert.match(source, /className="export-preview-company-title">\{customerCompanyName\}<\/h1>/);
  assert.match(source, /<p className="export-preview-subtitle">\{TITLES\[kind\]\}<\/p>/);
  assert.match(source, /export-preview-company-title\{font-size:25px;font-weight:800/);
  assert.match(source, /export-preview-fields.*section\.entries\.map/s);
});

test("other Export document previews keep their existing document title", async () => {
  const source = await readFile(new URL("../app/international/export/ExportRecordPreview.tsx", import.meta.url), "utf8");

  assert.match(source, /<h1 id="export-preview-title">\{TITLES\[kind\]\}<\/h1>/);
});
