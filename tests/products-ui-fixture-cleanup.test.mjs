import assert from "node:assert/strict";
import test from "node:test";
import {
  captureProductsUiFixtureArtifactIds,
  cleanupFailedProductsUiFixture,
  cleanupProductsUiFixture,
} from "../scripts/auth/products-ui-fixture-cleanup.mjs";
import { recordProductsUiTestRateLimits } from "../app/product/server/products-ui-test-manifest.mjs";

const companyId = "1e7b6f9d-6b86-4f5d-8fc9-6a62ee3f8465";
const userId = "synthetic-owner-id";
const productId = "30ac5af2-e633-4ae6-a029-f66ebf9c0e23";
const otherProductId = "40ac5af2-e633-4ae6-a029-f66ebf9c0e23";
const fixture = {
  version: 1,
  database: "uk_exim_erp_test",
  companyName: "SYNTHETIC PRODUCTS UI TEST COMPANY",
  status: "preparing",
  companyId,
  userId,
  userEmail: "products-ui-123e4567-e89b-12d3-a456-426614174000@example.invalid",
  username: "synthetic_1234567890abcdef12",
  productIds: [productId],
  accountIds: ["account-fixture"],
  sessionIds: ["session-fixture"],
  verificationIds: ["verification-fixture"],
  rateLimitIds: ["rate-fixture"],
};

function makeClient(seed = {}) {
  const state = {
    companies: [{ id: companyId, name: fixture.companyName }, ...(seed.companies ?? [])],
    users: [{ id: userId, name: "Synthetic Products UI Owner", email: fixture.userEmail, username: fixture.username }],
    memberships: [{ company_id: companyId, user_id: userId, role: "owner" }],
    accounts: [{ id: "account-fixture", userId }],
    sessions: [{ id: "session-fixture", userId }, ...(seed.sessions ?? [])],
    verifications: [{ id: "verification-fixture", identifier: fixture.userEmail }],
    products: [{ id: productId, company_id: companyId }, ...(seed.products ?? [])],
    rateLimits: [{ id: "rate-fixture" }, ...(seed.rateLimits ?? [])],
  };
  const client = {
    released: false,
    queries: [],
    async query(sql, params = []) {
      const text = sql.trim();
      this.queries.push({ text, params });
      const rows = (items) => ({ rows: items, rowCount: items.length });
      if (text.includes("host(inet_server_addr())")) return rows([{ address: "127.0.0.1", port: 5432, database: "uk_exim_erp_test" }]);
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(text)) return rows([]);
      if (text.includes("pg_advisory_xact_lock")) return rows([{ pg_advisory_xact_lock: null }]);
      if (text.includes("fixture:company")) return rows(state.companies.filter((row) => row.id === params[0]));
      if (text.includes("fixture:user")) return rows(state.users.filter((row) => row.id === params[0]));
      if (text.includes("fixture:membership")) return rows(state.memberships.filter((row) => row.user_id === params[0]));
      if (text.includes("fixture:accounts")) return rows(state.accounts.filter((row) => row.userId === params[0]));
      if (text.includes("fixture:sessions")) return rows(state.sessions
        .filter((row) => row.userId === params[0] || (params[1] ?? []).includes(row.id))
        .sort((left, right) => left.id.localeCompare(right.id)));
      if (text.includes("fixture:verifications")) return rows(state.verifications.filter((row) => params[0].includes(row.identifier)));
      if (text.includes("fixture:products")) return rows(state.products.filter((row) => row.company_id === params[0] || params[1].includes(row.id)));
      if (text.includes("fixture:ratelimits")) return rows(state.rateLimits.filter((row) => params[0].includes(row.id)));
      if (text.includes("fixture:unattributed-ratelimits")) {
        return { rows: [{ count: state.rateLimits.filter((row) => !params[0].includes(row.id)).length }], rowCount: 1 };
      }
      if (text.startsWith("DELETE FROM public.products")) {
        state.products = state.products.filter((row) => !(row.company_id === params[0] && params[1].includes(row.id)));
        return rows([]);
      }
      if (text.startsWith('DELETE FROM auth."verification"')) {
        state.verifications = state.verifications.filter((row) => !params[0].includes(row.id));
        return rows([]);
      }
      if (text.startsWith('DELETE FROM auth."session"')) {
        state.sessions = state.sessions.filter((row) => !(row.userId === params[0] && params[1].includes(row.id)));
        return rows([]);
      }
      if (text.startsWith('DELETE FROM auth."rateLimit"')) {
        state.rateLimits = state.rateLimits.filter((row) => !params[0].includes(row.id));
        return rows([]);
      }
      if (text.startsWith("DELETE FROM auth.company_memberships")) {
        state.memberships = state.memberships.filter((row) => !(row.company_id === params[0] && row.user_id === params[1]));
        return rows([]);
      }
      if (text.startsWith('DELETE FROM auth."user"')) {
        state.users = state.users.filter((row) => row.id !== params[0]);
        state.accounts = state.accounts.filter((row) => row.userId !== params[0]);
        state.sessions = state.sessions.filter((row) => row.userId !== params[0]);
        return rows([]);
      }
      if (text.startsWith("DELETE FROM public.companies")) {
        state.companies = state.companies.filter((row) => !(row.id === params[0] && row.name === params[1]));
        return rows([]);
      }
      if (text.includes("verify:company")) return rows(state.companies.filter((row) => row.id === params[0]));
      if (text.includes("verify:user")) return rows(state.users.filter((row) => row.id === params[0]));
      if (text.includes("verify:membership")) return rows(state.memberships.filter((row) => row.user_id === params[0]));
      if (text.includes("verify:accounts")) return rows(state.accounts.filter((row) => row.userId === params[0] || params[1].includes(row.id)));
      if (text.includes("verify:sessions")) return rows(state.sessions.filter((row) => row.userId === params[0] || params[1].includes(row.id)));
      if (text.includes("verify:verifications")) return rows(state.verifications.filter((row) => params[0].includes(row.identifier) || params[1].includes(row.id)));
      if (text.includes("verify:products")) return rows(state.products.filter((row) => params[0].includes(row.id)));
      if (text.includes("verify:ratelimits")) return rows(state.rateLimits.filter((row) => params[0].includes(row.id)));
      throw new Error(`Unexpected mocked query: ${text}`);
    },
    release() { this.released = true; },
  };
  return { client, state, pool: { connect: async () => client } };
}

test("cleanup deletes owned session and manifest-listed rate-limit IDs, then verifies absence", async () => {
  const { client, state, pool } = makeClient();
  let manifestRemoved = false;
  await cleanupFailedProductsUiFixture(pool, fixture, async () => { manifestRemoved = true; });
  assert.equal(manifestRemoved, true);
  assert.deepEqual(state.rateLimits, []);
  assert.deepEqual(state.accounts, []);
  assert.deepEqual(state.sessions, []);
  assert.deepEqual(state.verifications, []);
  assert.equal(state.companies.length, 0);
  assert.equal(client.released, true);
});

test("setup does not claim shared rate-limit buckets as fixture-owned", async () => {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes("host(inet_server_addr())")) {
        return { rows: [{ address: "127.0.0.1", port: 5432, database: "uk_exim_erp_test" }] };
      }
      if (sql.includes('FROM auth."account"')) return { rows: [] };
      if (sql.includes('FROM auth."session"')) return { rows: [] };
      if (sql.includes('FROM auth."verification"')) return { rows: [] };
      throw new Error("Unexpected mock query");
    },
  };
  const artifacts = await captureProductsUiFixtureArtifactIds(client, fixture);
  assert.deepEqual(artifacts.rateLimitIds, []);
  assert.equal(queries.some(({ sql }) => sql.includes('FROM auth."rateLimit"')), false);
});

test("unattributed rate-limit rows are preserved while fixture cleanup proceeds", async () => {
  const { client, state, pool } = makeClient();
  state.rateLimits.push({ id: "unrecorded-rate", key: "shared-ip|/sign-in/username" });
  let manifestRemoved = false;
  await cleanupFailedProductsUiFixture(pool, fixture, async () => { manifestRemoved = true; });
  assert.equal(manifestRemoved, true);
  assert.equal(state.companies.length, 0);
  assert.deepEqual(state.rateLimits, [{ id: "unrecorded-rate", key: "shared-ip|/sign-in/username" }]);
  assert.equal(client.queries.some(({ text }) => text === 'DELETE FROM auth."rateLimit" WHERE id = ANY($1::text[])'), true);
  assert.equal(client.released, true);
});

test("cleanup safely handles zero browser-created sessions", async () => {
  const { client, state } = makeClient();
  state.sessions = [];
  const outcome = await cleanupProductsUiFixture(client, { ...fixture, sessionIds: [] }, { allowIncomplete: true });
  assert.equal(outcome.alreadyAbsent, false);
  assert.deepEqual(state.sessions, []);
});

test("cleanup safely handles one browser-created session absent from the manifest", async () => {
  const { client, state } = makeClient();
  const outcome = await cleanupProductsUiFixture(client, { ...fixture, sessionIds: [] }, { allowIncomplete: true });
  assert.equal(outcome.alreadyAbsent, false);
  assert.deepEqual(state.sessions, []);
});

test("cleanup safely handles multiple browser-created sessions absent from the manifest", async () => {
  const { client, state } = makeClient({
    sessions: [
      { id: "browser-session-1", userId },
      { id: "browser-session-2", userId },
    ],
  });
  const outcome = await cleanupProductsUiFixture(client, { ...fixture, sessionIds: [] }, { allowIncomplete: true });
  assert.equal(outcome.alreadyAbsent, false);
  assert.deepEqual(state.sessions, []);
});

test("cleanup rejects a manifest-listed session owned by another user and rolls back", async () => {
  const { client, state, pool } = makeClient({
    sessions: [{ id: "foreign-session", userId: "unrelated-user" }],
  });
  let manifestRemoved = false;
  await assert.rejects(
    cleanupFailedProductsUiFixture(pool, { ...fixture, sessionIds: ["foreign-session"] }, async () => { manifestRemoved = true; }),
    /session belongs to a different user/,
  );
  assert.equal(manifestRemoved, false);
  assert.equal(client.queries.some(({ text }) => text === "ROLLBACK"), true);
  assert.equal(state.companies.length, 1);
  assert.equal(state.users.length, 1);
  assert.equal(state.sessions.length, 2);
});

test("unrecorded exact-owner sessions are deleted with a user-scoped predicate", async () => {
  const { client, state } = makeClient({ sessions: [{ id: "browser-session", userId }] });
  await cleanupProductsUiFixture(client, { ...fixture, sessionIds: [] }, { allowIncomplete: true });
  const deletion = client.queries.find(({ text }) => text.startsWith('DELETE FROM auth."session"'));
  assert.deepEqual(deletion.params, [userId, ["browser-session", "session-fixture"]]);
  assert.deepEqual(state.sessions, []);
});

test("only rate-limit IDs explicitly listed in the fixture manifest are deleted", async () => {
  const { client, state } = makeClient({
    rateLimits: [{ id: "shared-rate-limit" }, { id: "another-shared-limit" }],
  });
  const manifest = { ...fixture, rateLimitIds: ["rate-fixture"] };
  const result = await cleanupProductsUiFixture(client, manifest, { allowIncomplete: true });
  assert.deepEqual(state.rateLimits, [{ id: "shared-rate-limit" }, { id: "another-shared-limit" }]);
  assert.equal(result.preservedUnattributedRateLimitCount, 2);
});

test("test-mode auth rate-limit tracking does not infer ownership from request paths", async () => {
  await recordProductsUiTestRateLimits({
    connect() { throw new Error("rate-limit tracking must not query PostgreSQL"); },
  }, new Request("http://localhost/api/auth/sign-in/username"));
});

test("cleanup preserves another company's product and unrelated company", async () => {
  const otherCompanyId = "5e7b6f9d-6b86-4f5d-8fc9-6a62ee3f8465";
  const { client, state } = makeClient({
    companies: [{ id: otherCompanyId, name: "UNRELATED SYNTHETIC COMPANY" }],
    products: [{ id: otherProductId, company_id: otherCompanyId }],
  });
  await cleanupProductsUiFixture(client, fixture, { allowIncomplete: true });
  assert.deepEqual(state.companies, [{ id: otherCompanyId, name: "UNRELATED SYNTHETIC COMPANY" }]);
  assert.deepEqual(state.products, [{ id: otherProductId, company_id: otherCompanyId }]);
});

test("cleanup verifies account, session and verification absence and is idempotent", async () => {
  const { client, state } = makeClient();
  const first = await cleanupProductsUiFixture(client, { ...fixture, status: "ready" });
  const second = await cleanupProductsUiFixture(client, { ...fixture, status: "ready" });
  assert.equal(first.alreadyAbsent, false);
  assert.equal(second.alreadyAbsent, true);
  assert.deepEqual(state.accounts, []);
  assert.deepEqual(state.sessions, []);
  assert.deepEqual(state.verifications, []);
});
