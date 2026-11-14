import test from "node:test";
import assert from "node:assert/strict";
import { createSettingsRouteHandlers } from "../app/settings/server/settings-routes.mjs";

const req = (url, method = "GET", origin = "http://localhost:3000", body) => new Request(url, {
  method,
  headers: { ...(origin ? { origin } : {}), "content-type": "application/json" },
  ...(body === undefined ? {} : { body }),
});

test("settings writes require same origin and responses are private", async () => {
  let called = false;
  const handlers = createSettingsRouteHandlers({ save: async () => { called = true; return {}; } });
  const response = await handlers.save(req("http://localhost:3000/api/settings/bank", "PUT", "https://attacker.invalid", "{}"), "bank");
  assert.equal(response.status, 403);
  assert.equal(called, false);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
});

test("schema-pending and authentication errors are JSON without exception leakage", async () => {
  const handlers = createSettingsRouteHandlers({
    list: async () => { throw Object.assign(new Error("Settings migration pending."), { code: "SCHEMA_PENDING" }); },
    get: async () => { throw Object.assign(new Error("private details"), { code: "UNAUTHENTICATED" }); },
  });
  const pending = await handlers.list();
  assert.equal(pending.status, 503);
  assert.match(pending.headers.get("content-type"), /application\/json/);
  const unauthorized = await handlers.get(req("http://localhost:3000/api/settings/company"), "company");
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).error, "private details");
});

test("malformed request bodies return JSON 400", async () => {
  let called = false;
  const handlers = createSettingsRouteHandlers({ save: async () => { called = true; } });
  const response = await handlers.save(req("http://localhost:3000/api/settings/company", "PUT", "http://localhost:3000", "{"), "company");
  assert.equal(response.status, 400);
  assert.equal(called, false);
  assert.match((await response.json()).error, /valid JSON/);
});
