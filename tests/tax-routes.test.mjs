import test from "node:test";
import assert from "node:assert/strict";
import { createTaxConfigurationRouteHandlers } from "../app/tax/server/tax-routes.mjs";

const request = (url, origin, body) => new Request(url, {
  method: "PUT", headers: { origin, "content-type": "application/json" }, body,
});

test("tax configuration writes require same-origin requests", async () => {
  let saved = false;
  const handlers = createTaxConfigurationRouteHandlers({ save: async () => { saved = true; } });
  const response = await handlers.save(request("http://localhost:3000/api/tax/configuration", "https://untrusted.invalid", "{}"));
  assert.equal(response.status, 403);
  assert.equal(saved, false);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
});

test("tax configuration schema pending and invalid JSON return safe JSON errors", async () => {
  const handlers = createTaxConfigurationRouteHandlers({
    get: async () => { throw Object.assign(new Error("private database details"), { code: "SCHEMA_PENDING" }); },
    save: async () => { throw Object.assign(new Error("Request body must be valid JSON."), { code: "INVALID_TAX_CONFIGURATION" }); },
  });
  const unavailable = await handlers.get();
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error, "Tax configuration storage is unavailable until migration 014 is applied.");
  const invalid = await handlers.save(request("http://localhost:3000/api/tax/configuration", "http://localhost:3000", "{"));
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, "Tax configuration is invalid.");
});
