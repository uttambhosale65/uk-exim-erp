import test from "node:test";
import assert from "node:assert/strict";
import { requireTradeSchema } from "../app/transactions/server/trade-schema-guard.mjs";

test("trade runtime accepts only when migration 008 is recorded", async () => {
  let queried = "";
  await requireTradeSchema({ query: async (sql, values) => {
    queried = sql;
    assert.deepEqual(values, ["008_verified_stock_baseline_gate.sql"]);
    return { rows: [{ ok: 1 }] };
  } });
  assert.match(queried, /^SELECT 1 FROM public\._schema_migrations/);
});

test("trade runtime fails closed without migration 008 and performs no writes", async () => {
  const statements = [];
  await assert.rejects(
    requireTradeSchema({ query: async (sql) => { statements.push(sql); return { rows: [] }; } }),
    (error) => error.code === "SCHEMA_PENDING" && /migrations are pending/.test(error.message),
  );
  assert.equal(statements.length, 1);
  assert.match(statements[0], /^SELECT /i);
});
