import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, webcrypto } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  getRawProductBackup,
  createFullErpBackup,
  FULL_BACKUP_KEYS,
  inspectLegacyProductValue,
  LEGACY_PRODUCT_STORAGE_KEY,
  sha256Hex,
} from "./export-core.mjs";

function fakeStorage(raw) {
  const calls = [];
  return {
    calls,
    getItem(key) {
      calls.push(["getItem", key]);
      return raw;
    },
    setItem(...args) { calls.push(["setItem", ...args]); },
    removeItem(...args) { calls.push(["removeItem", ...args]); },
    clear(...args) { calls.push(["clear", ...args]); },
  };
}

test("valid JSON product array is recognized and counted with one scoped read", () => {
  const storage = fakeStorage('[{"id":"p1"},{"id":"p2"}]');
  const result = inspectLegacyProductValue(storage);
  assert.equal(result.exists, true);
  assert.equal(result.parseSucceeded, true);
  assert.equal(result.isProductArray, true);
  assert.equal(result.productCount, 2);
  assert.deepEqual(storage.calls, [["getItem", LEGACY_PRODUCT_STORAGE_KEY]]);
});

test("missing key is reported without a product count", () => {
  const storage = fakeStorage(null);
  const result = inspectLegacyProductValue(storage);
  assert.deepEqual(result, {
    exists: false,
    parseSucceeded: false,
    isProductArray: false,
    productCount: null,
    raw: null,
  });
  assert.deepEqual(storage.calls, [["getItem", LEGACY_PRODUCT_STORAGE_KEY]]);
  assert.throws(() => getRawProductBackup(result), /No valid legacy product array/);
});

test("invalid JSON is reported and cannot be exported", () => {
  const storage = fakeStorage("[{invalid json");
  const result = inspectLegacyProductValue(storage);
  assert.equal(result.exists, true);
  assert.equal(result.parseSucceeded, false);
  assert.equal(result.isProductArray, false);
  assert.equal(result.productCount, null);
  assert.equal(result.raw, "[{invalid json");
  assert.throws(() => getRawProductBackup(result), /No valid legacy product array/);
});

test("valid JSON that is not an array is rejected as a product catalog", () => {
  const result = inspectLegacyProductValue(fakeStorage('{"id":"not-an-array"}'));
  assert.equal(result.exists, true);
  assert.equal(result.parseSucceeded, true);
  assert.equal(result.isProductArray, false);
  assert.equal(result.productCount, null);
  assert.throws(() => getRawProductBackup(result), /No valid legacy product array/);
});

test("empty product array is valid with count zero", () => {
  const result = inspectLegacyProductValue(fakeStorage("[]"));
  assert.equal(result.exists, true);
  assert.equal(result.parseSucceeded, true);
  assert.equal(result.isProductArray, true);
  assert.equal(result.productCount, 0);
});

test("download payload preserves the exact original raw text", () => {
  const raw = '[ {"name":"Haldi"} ,\r\n {"name":"Turmeric"} ]  ';
  const result = inspectLegacyProductValue(fakeStorage(raw));
  assert.equal(getRawProductBackup(result), raw);
});

test("checksum is SHA-256 of the original raw value", async () => {
  const raw = '[{"id":"legacy"}]';
  const expected = createHash("sha256").update(raw, "utf8").digest("hex");
  assert.equal(await sha256Hex(raw, webcrypto), expected);
});

test("exporter source only reads LocalStorage and has no write or delete calls", async () => {
  const source = await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "export.js"), "utf8");
  const core = await readFile(new URL("./export-core.mjs", import.meta.url), "utf8");
  assert.equal((source.match(/window\.localStorage/g) ?? []).length, 1);
  assert.match(source, /createFullErpBackup\(window\.localStorage/);
  assert.doesNotMatch(source, /\.(?:setItem|removeItem|clear)\s*\(/);
  assert.doesNotMatch(core, /\.(?:setItem|removeItem|clear)\s*\(/);
});

test("standalone server binds exactly the approved loopback address and port", async () => {
  const source = await readFile(new URL("./server.mjs", import.meta.url), "utf8");
  assert.match(source, /const HOST = "127\.0\.0\.1"/);
  assert.match(source, /const PORT = 3000/);
  assert.match(source, /server\.listen\(PORT, HOST/);
  assert.doesNotMatch(source, /\.listen\(PORT\s*\)/);
});

test("full backup reads each identified key exactly once and preserves raw text", async () => {
  const values = new Map([
    ["uk-exim-products", '[ {"id":"p1"} ]  '],
    ["uk-exim-stock", "not-json"],
  ]);
  const calls = [];
  const storage = {
    getItem(key) {
      calls.push(key);
      return values.get(key) ?? null;
    },
    setItem() { assert.fail("write attempted"); },
    removeItem() { assert.fail("remove attempted"); },
    clear() { assert.fail("clear attempted"); },
  };
  const backup = await createFullErpBackup(storage, {
    origin: "http://localhost:3000",
    timestamp: "2026-11-13T00:00:00.000Z",
    cryptoProvider: webcrypto,
  });

  assert.deepEqual(calls, FULL_BACKUP_KEYS);
  assert.equal(backup.keyCount, 24);
  assert.equal(backup.keys["uk-exim-products"].raw, '[ {"id":"p1"} ]  ');
  assert.equal(backup.keys["uk-exim-products"].recordCount, 1);
  assert.equal(backup.keys["uk-exim-stock"].parseSucceeded, false);
  assert.equal(backup.keys["uk-exim-stock"].raw, "not-json");
  assert.equal(backup.keys["uk-exim-stock"].sha256, createHash("sha256").update("not-json").digest("hex"));
  assert.equal(backup.keys["uk-exim-sales"].exists, false);
  assert.equal(backup.keys["uk-exim-sales"].raw, null);
});

test("full backup serializes metadata and every raw value without parsing/reformatting it", async () => {
  const raw = '{\n  "items": [1, 2]\n}\t';
  const backup = await createFullErpBackup({ getItem: (key) => key === FULL_BACKUP_KEYS[0] ? raw : null }, {
    timestamp: "2026-11-13T00:00:00.000Z",
    cryptoProvider: webcrypto,
  });
  const serialized = JSON.stringify(backup);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.timestamp, "2026-11-13T00:00:00.000Z");
  assert.equal(parsed.origin, "http://localhost:3000");
  assert.equal(parsed.keys[FULL_BACKUP_KEYS[0]].raw, raw);
  assert.equal(parsed.keys[FULL_BACKUP_KEYS[0]].recordCount, null);
});

test("full exporter source contains only reads and requires explicit download", async () => {
  const source = await readFile(new URL("./export.js", import.meta.url), "utf8");
  const core = await readFile(new URL("./export-core.mjs", import.meta.url), "utf8");
  assert.match(source, /window\.location\.origin !== EXPECTED_ORIGIN/);
  assert.match(source, /elements\.download\.addEventListener\("click"/);
  assert.match(source, /createFullErpBackup\(window\.localStorage/);
  assert.doesNotMatch(source, /\.(?:setItem|removeItem|clear)\s*\(/);
  assert.doesNotMatch(core, /\.(?:setItem|removeItem|clear)\s*\(/);
  assert.doesNotMatch(source, /localStorage\.(?:length|key)\b/);
});

test("explicit full-backup inventory matches the current source backup key list", async () => {
  const source = await readFile(new URL("../../app/utils/ERPBackup.ts", import.meta.url), "utf8");
  const declared = [...source.matchAll(/^\s+"(uk-exim-[a-z0-9-]+)",?\s*$/gm)].map((match) => match[1]);
  assert.deepEqual(FULL_BACKUP_KEYS, declared);
});
