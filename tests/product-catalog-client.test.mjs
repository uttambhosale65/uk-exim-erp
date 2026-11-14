import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createProductCatalogClient } from "../app/product/product-catalog-client.mjs";
import {
  getProductCatalogSnapshot,
  setProductCatalogSnapshot,
} from "../app/product/product-catalog-cache.mjs";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
  };
}

test("list uses the authenticated same-origin API and accepts an empty catalog without fallback", async () => {
  const calls = [];
  const client = createProductCatalogClient(async (...args) => {
    calls.push(args);
    return jsonResponse({ products: [] });
  });

  assert.deepEqual(await client.list(), []);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/api/products");
  assert.deepEqual(calls[0][1], {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });
});

test("list preserves database product fields and stock mappings as returned", async () => {
  const mappings = [
    ["P0001", "P0006"], ["P0002", "P0006"], ["P0003", "P0006"],
    ["P0004", "P0006"], ["P0005", "P0006"], ["P0006", "P0006"], ["P0007", "P0007"],
  ];
  const source = mappings.map(([code, stockBaseCode], index) => ({
    id: `synthetic-${index}`,
    code,
    name: index === 0 ? "Haldi packet " : `Synthetic product ${code}`,
    category: "Synthetic",
    hsn: "091030",
    gst: "5%",
    unit: index < 5 ? "Pkt" : "KG",
    netWeight: index < 5 ? 500 : 1,
    stockBaseCode,
    purchase: 20,
    sale: 25,
    mrp: 30,
    baseCost: 20,
    packingCost: 0,
    otherCharges: 0,
    totalCost: 20,
    stock: 4,
    minimumStock: 0,
    active: true,
  }));
  const client = createProductCatalogClient(async () => jsonResponse({ products: source }));
  assert.deepEqual(await client.list(), source);
});

test("create, update and deactivate use the existing Product API routes", async () => {
  const calls = [];
  const saved = { id: "p1", code: "P0001", name: "Haldi", stockBaseCode: "P0006" };
  const client = createProductCatalogClient(async (...args) => {
    calls.push(args);
    return jsonResponse({ product: saved });
  });
  const input = { ...saved };

  assert.deepEqual(await client.save(input, false), saved);
  assert.deepEqual(await client.save(input, true), saved);
  assert.deepEqual(await client.deactivate("p/1"), saved);
  assert.equal(calls[0][0], "/api/products");
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[1][0], "/api/products/p1");
  assert.equal(calls[1][1].method, "PATCH");
  assert.equal(calls[2][0], "/api/products/p%2F1");
  assert.equal(calls[2][1].method, "DELETE");
  assert.ok(calls.every((call) => call[1].credentials === "same-origin"));
});

test("API failures and invalid payloads fail closed", async () => {
  const denied = createProductCatalogClient(async () => jsonResponse({ error: "Unauthorized" }, 401));
  await assert.rejects(denied.list(), /Unauthorized/);

  const invalid = createProductCatalogClient(async () => jsonResponse({ products: "legacy" }));
  await assert.rejects(invalid.list(), /response is invalid/);
});

test("synchronous compatibility reads use only the PostgreSQL-fed memory snapshot", () => {
  const originalWindow = globalThis.window;
  let storageRead = false;
  globalThis.window = { localStorage: { getItem() { storageRead = true; throw new Error("must not read LocalStorage"); } } };
  try {
    setProductCatalogSnapshot([]);
    assert.deepEqual(getProductCatalogSnapshot(), []);
    const products = [{ id: "p1", code: "P0001" }];
    setProductCatalogSnapshot(products);
    products[0].code = "changed outside snapshot";
    assert.equal(getProductCatalogSnapshot()[0].code, "P0001");
    assert.equal(storageRead, false);
  } finally {
    setProductCatalogSnapshot([]);
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("all Product Master entry points share the same API-backed catalog and legacy key is not read", async () => {
  const productStorage = await readFile(new URL("../app/product/components/ProductStorage.ts", import.meta.url), "utf8");
  const productRoute = await readFile(new URL("../app/product/ProductPageClient.tsx", import.meta.url), "utf8");
  const erpRoute = await readFile(new URL("../app/erp/page.tsx", import.meta.url), "utf8");
  const productPage = await readFile(new URL("../app/product/page.tsx", import.meta.url), "utf8");
  const catalogProvider = await readFile(new URL("../app/product/useProductCatalog.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(productStorage, /localStorage|uk-exim-products/);
  assert.match(productRoute, /<ProductMaster\s*\/>/);
  assert.match(erpRoute, /<ProductCatalogProvider allowEmpty>/);
  assert.match(productPage, /<ProductCatalogProvider allowEmpty>/);
  assert.match(catalogProvider, /client\.list\(\)/);
  assert.match(catalogProvider, /No LocalStorage fallback was used/);

  for (const route of [
    "../app/purchase/page.tsx",
    "../app/sales/page.tsx",
    "../app/stock/page.tsx",
    "../app/international/export/enquiry/page.tsx",
    "../app/international/export/proforma/page.tsx",
    "../app/international/export/purchase/page.tsx",
    "../app/international/export/quotation/page.tsx",
    "../app/international/export/reservation/page.tsx",
  ]) {
    const source = await readFile(new URL(route, import.meta.url), "utf8");
    assert.match(source, /ProductCatalogProvider/, `${route} must hydrate the shared catalog before mounting consumers`);
  }
});
