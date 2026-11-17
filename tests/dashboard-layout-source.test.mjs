import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Domestic dashboard retains all seven KPIs, both charts, and accessible ticker layout", async () => {
  const source = await readFile(new URL("../app/ERPWorkspace.tsx", import.meta.url), "utf8");
  for (const label of ["Products", "Customers", "Suppliers", "Current Stock", "All-time Sales", "All-time Purchase", "Pending Payments"]) assert.ok(source.includes(`title="${label}"`), `missing KPI ${label}`);
  assert.match(source, /gridTemplateColumns:\s*"repeat\(4, minmax\(0, 1fr\)\)"/);
  assert.match(source, /className="dashboard-chart-layout"/);
  assert.match(source, /MonthlyStockMovementGraph/);
  assert.match(source, /MonthlySalesPurchaseGraph/);
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
  for (const text of ["UK EXIM ENTERPRISES", "UTTAM HALDI", "वाईच्या कुशीतील उत्तम सातारी हळद", "Delivering Indian purity across continents"]) assert.ok(source.includes(text));
});

test("Monthly stock movement chart keeps a larger plot and an unwrapped readable legend", async () => {
  const source = await readFile(new URL("../app/ERPWorkspace.tsx", import.meta.url), "utf8");
  const chart = source.slice(source.indexOf("function MonthlyStockMovementGraph("));
  assert.match(chart, /const height = 270;/);
  assert.match(source, /grid-template-columns: minmax\(300px, 0\.65fr\) minmax\(0, 1\.35fr\)/);
  assert.match(chart, /minWidth: 0/);
  assert.match(chart, /gridTemplateColumns: "minmax\(0, 1fr\)"/);
  assert.match(chart, /flexWrap: "nowrap"/);
  assert.match(chart, /whiteSpace: "nowrap"/);
  assert.match(chart, /height="auto"/);
  assert.match(chart, /Quantity \(KG\)/);
  assert.match(chart, /aria-label=\{`\$\{item\.label\}.*KG`\}/s);
});

test("Domestic PostgreSQL sales and purchase reports paginate and never fall back to LocalStorage", async () => {
  const sales = await readFile(new URL("../app/components/customer/sales/SalesReport.tsx", import.meta.url), "utf8");
  const purchases = await readFile(new URL("../app/components/customer/purchase/PurchaseReport.tsx", import.meta.url), "utf8");
  assert.match(sales, /\/api\/sales\?limit=200&offset=/);
  assert.match(purchases, /\/api\/purchases\?limit=200&offset=/);
  assert.match(sales, /GST Register/);
  assert.match(sales, /Without GST Register/);
  assert.match(sales, /Verified Outstanding/);
  assert.match(sales, /Historical imported sales balances are unverified and excluded/);
  assert.doesNotMatch(sales, /localStorage\s*\./i);
  assert.doesNotMatch(purchases, /localStorage\s*\./i);
  const stock = await readFile(new URL("../app/transactions/client/StockPostgresMaster.tsx", import.meta.url), "utf8");
  assert.match(stock, /api\/stock\/current/);
  assert.match(stock, /api\/stock\/ledger/);
  assert.match(stock, /Movement from/);
  assert.match(stock, /no LocalStorage fallback/i);
  assert.doesNotMatch(stock, /localStorage\s*\./i);
});
