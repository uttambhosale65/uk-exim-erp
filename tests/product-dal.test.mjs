import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import test from "node:test";
import { parseLocalDatabaseUrl, verifyLocalDatabaseConnection } from "../scripts/db/migrate-lib.mjs";
import { createProductDAL } from "../app/product/server/product-dal.mjs";
import { createProductRouteHandlers } from "../app/product/server/product-routes.mjs";

dotenv.config({ path: ".env.local", quiet: true });

const testUrl = parseLocalDatabaseUrl(process.env.TEST_DATABASE_URL, "uk_exim_erp_test");
if (testUrl.hostname !== "127.0.0.1" || testUrl.port !== "5432") {
  throw new Error("Product tests require TEST_DATABASE_URL at 127.0.0.1:5432/uk_exim_erp_test.");
}

const pool = new pg.Pool({ connectionString: testUrl.toString(), max: 4 });

test("Product API and DAL perform isolated synthetic PostgreSQL CRUD safely", async (t) => {
  const identityClient = await pool.connect();
  try {
    const identity = await verifyLocalDatabaseConnection(identityClient, "uk_exim_erp_test");
    const portResult = await identityClient.query("SELECT inet_server_port() AS port");
    if (identity.address !== "127.0.0.1" || Number(portResult.rows[0].port) !== 5432) {
      throw new Error("Connected product test database is not the approved local test endpoint.");
    }
  } finally {
    identityClient.release();
  }

  const companyA = randomUUID();
  const companyB = randomUUID();
  const productAId = randomUUID();
  const productBId = randomUUID();
  const productCode = `SYN-${randomUUID()}`;
  let activeCompanyId = companyA;
  let authenticated = true;
  let companiesCreated = false;

  const productDAL = createProductDAL({
    getOwnerContext: async () => authenticated
      ? { company: { company_id: activeCompanyId } }
      : null,
    database: pool,
  });
  const handlers = createProductRouteHandlers(productDAL);
  const ownerOrigin = "http://localhost:3000";

  const jsonRequest = (path, method, body, origin = ownerOrigin) => new Request(`${ownerOrigin}${path}`, {
    method,
    headers: {
      ...(origin ? { origin } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const productInput = (id, code, overrides = {}) => ({
    id,
    code,
    name: "Synthetic turmeric product",
    category: "Synthetic",
    hsn: "TEST-HSN",
    gst: "5%",
    unit: "Gram",
    netWeight: 12.34,
    stockBaseCode: code,
    purchase: 5.67,
    sale: 12.34,
    mrp: 15.00,
    baseCost: 1.11,
    packingCost: 0.22,
    otherCharges: 0.03,
    totalCost: 999.99,
    stock: 4.25,
    minimumStock: 0.5,
    active: true,
    ...overrides,
  });

  try {
    await t.test("unauthenticated API requests are rejected", async () => {
      authenticated = false;
      assert.equal((await handlers.list(new Request(`${ownerOrigin}/api/products`))).status, 401);
      assert.equal((await handlers.get(new Request(`${ownerOrigin}/api/products/x`), productAId)).status, 401);
      assert.equal((await handlers.create(jsonRequest("/api/products", "POST", productInput(productAId, productCode)))).status, 401);
      assert.equal((await handlers.update(jsonRequest(`/api/products/${productAId}`, "PATCH", productInput(productAId, productCode)), productAId)).status, 401);
      assert.equal((await handlers.deactivate(jsonRequest(`/api/products/${productAId}`, "DELETE"), productAId)).status, 401);
      authenticated = true;
    });

    await t.test("same-origin writes are required", async () => {
      const response = await handlers.create(jsonRequest("/api/products", "POST", productInput(productAId, productCode), "https://attacker.example"));
      assert.equal(response.status, 403);
    });

    await pool.query(
      "INSERT INTO public.companies (id, name) VALUES ($1, $2), ($3, $4)",
      [companyA, "Synthetic Product Test A", companyB, "Synthetic Product Test B"],
    );
    companiesCreated = true;

    await t.test("invalid fields and browser-supplied company IDs are rejected", async () => {
      const badProduct = productInput(productAId, productCode, { sale: -1 });
      assert.equal((await handlers.create(jsonRequest("/api/products", "POST", badProduct))).status, 400);
      const badPacket = productInput(productAId, productCode, { unit: "Pkt", stockBaseCode: "" });
      assert.equal((await handlers.create(jsonRequest("/api/products", "POST", badPacket))).status, 400);
      const forgedCompany = productInput(productAId, productCode, { company_id: companyB });
      assert.equal((await handlers.create(jsonRequest("/api/products", "POST", forgedCompany))).status, 400);
      assert.equal((await handlers.list(new Request(`${ownerOrigin}/api/products`))).status, 200);
      assert.deepEqual((await (await handlers.list(new Request(`${ownerOrigin}/api/products`))).json()).products, []);
    });

    await t.test("create and detail read preserve field mappings and numeric precision", async () => {
      const createResponse = await handlers.create(jsonRequest(
        "/api/products",
        "POST",
        productInput(productAId, productCode),
      ));
      assert.equal(createResponse.status, 201);
      const { product: created } = await createResponse.json();
      assert.equal(created.id, productAId);
      assert.equal(created.code, productCode);
      assert.equal(created.totalCost, 1.36, "totalCost is calculated from its three components");
      assert.equal(created.stock, 4.25);
      assert.equal(created.netWeight, 12.34);

      const persisted = await pool.query(
        "SELECT sale::text, total_cost::text, stock::text FROM public.products WHERE company_id = $1 AND id = $2",
        [companyA, productAId],
      );
      assert.deepEqual(persisted.rows[0], { sale: "12.34", total_cost: "1.36", stock: "4.25" });

      const detailResponse = await handlers.get(new Request(`${ownerOrigin}/api/products/${productAId}`), productAId);
      assert.equal(detailResponse.status, 200);
      assert.equal((await detailResponse.json()).product.id, productAId);
    });

    await t.test("duplicate codes are rejected within a company and rolled back", async () => {
      const duplicate = await handlers.create(jsonRequest(
        "/api/products",
        "POST",
        productInput(randomUUID(), productCode),
      ));
      assert.equal(duplicate.status, 409);
      const rows = await pool.query("SELECT count(*)::int AS count FROM public.products WHERE company_id = $1 AND code = $2", [companyA, productCode]);
      assert.equal(rows.rows[0].count, 1);
    });

    await t.test("updates preserve product identity, code and stock quantity", async () => {
      const update = productInput(productAId, productCode, {
        name: "Synthetic updated product",
        sale: 13.45,
        mrp: 16.00,
        stock: 999.99,
      });
      const response = await handlers.update(jsonRequest(`/api/products/${productAId}`, "PATCH", update), productAId);
      assert.equal(response.status, 200);
      const { product: updated } = await response.json();
      assert.equal(updated.id, productAId);
      assert.equal(updated.code, productCode);
      assert.equal(updated.name, "Synthetic updated product");
      assert.equal(updated.sale, 13.45);
      assert.equal(updated.stock, 4.25);

      const changedCode = productInput(productAId, `${productCode}-EDITED`);
      assert.equal((await handlers.update(jsonRequest(`/api/products/${productAId}`, "PATCH", changedCode), productAId)).status, 400);
    });

    await t.test("company scope prevents cross-company list, read, update and deactivate", async () => {
      activeCompanyId = companyB;
      assert.deepEqual((await productDAL.listProducts()), []);
      assert.equal(await productDAL.getProduct(productAId), null);
      assert.equal(await productDAL.updateProduct(productAId, productInput(productAId, productCode)), null);
      assert.equal(await productDAL.deactivateProduct(productAId), null);

      const secondCompanyProduct = productInput(productBId, productCode, { name: "Other tenant synthetic product" });
      const createdB = await productDAL.createProduct(secondCompanyProduct);
      assert.equal(createdB.code, productCode, "the same code is allowed in a different company scope");
      activeCompanyId = companyA;
      assert.equal((await productDAL.getProduct(productAId)).active, true);
    });

    await t.test("delete follows existing soft-deactivation behavior", async () => {
      activeCompanyId = companyA;
      const response = await handlers.deactivate(jsonRequest(`/api/products/${productAId}`, "DELETE"), productAId);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).product.active, false);
      assert.equal((await productDAL.getProduct(productAId)).active, false);
    });
  } finally {
    if (companiesCreated) {
      const companyIds = [companyA, companyB];
      await pool.query("DELETE FROM public.products WHERE company_id = ANY($1::uuid[])", [companyIds]);
      await pool.query("DELETE FROM public.companies WHERE id = ANY($1::uuid[])", [companyIds]);
      const leftover = await pool.query(
        "SELECT (SELECT count(*)::int FROM public.companies WHERE id = ANY($1::uuid[])) AS companies, (SELECT count(*)::int FROM public.products WHERE company_id = ANY($1::uuid[])) AS products",
        [companyIds],
      );
      assert.deepEqual(leftover.rows[0], { companies: 0, products: 0 });
    }
    await pool.end();
  }
});
