import assert from "node:assert/strict";
import test from "node:test";
import {
  parseLocalPostgresUrl,
  verifyLocalPostgresConnection,
} from "../app/lib/db/postgres-target.mjs";

const devUrl = "postgresql://synthetic:placeholder@127.0.0.1:5432/uk_exim_erp_dev";
const testUrl = "postgresql://synthetic:placeholder@127.0.0.1:5432/uk_exim_erp_test";

test("common connection guard accepts exact DEV and TEST targets", () => {
  assert.equal(parseLocalPostgresUrl(devUrl, "uk_exim_erp_dev").pathname, "/uk_exim_erp_dev");
  assert.equal(parseLocalPostgresUrl(testUrl, "uk_exim_erp_test").pathname, "/uk_exim_erp_test");
});

test("common connection guard rejects malformed, wrong-host, wrong-port and wrong-database URLs", () => {
  for (const value of [
    "not-a-url",
    devUrl.replace("127.0.0.1", "localhost"),
    devUrl.replace("127.0.0.1", "[::1]"),
    devUrl.replace("127.0.0.1", "192.0.2.10"),
    devUrl.replace(":5432/", ":5433/"),
    devUrl.replace("uk_exim_erp_dev", "uk_exim_erp_test"),
  ]) {
    assert.throws(() => parseLocalPostgresUrl(value, "uk_exim_erp_dev"));
  }
});

test("common connection guard rejects query overrides for host, hostaddr, port and database", () => {
  for (const override of [
    "host=192.0.2.10",
    "hostaddr=192.0.2.10",
    "port=6543",
    "dbname=production",
    "database=production",
  ]) {
    assert.throws(() => parseLocalPostgresUrl(`${devUrl}?${override}`, "uk_exim_erp_dev"), /query parameters/);
  }
});

test("common connection guard rejects fragments and whitespace-padded connection strings", () => {
  assert.throws(() => parseLocalPostgresUrl(`${devUrl}#remote`, "uk_exim_erp_dev"));
  assert.throws(() => parseLocalPostgresUrl(` ${devUrl}`, "uk_exim_erp_dev"));
});

test("connected identity requires exact address, port and database", async () => {
  const verifiedClient = {
    async query(sql) {
      assert.match(sql, /host\(inet_server_addr\(\)\)/);
      assert.match(sql, /inet_server_port\(\)/);
      return { rows: [{ address: "127.0.0.1", port: 5432, database: "uk_exim_erp_test", version: "18.6" }] };
    },
  };
  assert.deepEqual(await verifyLocalPostgresConnection(verifiedClient, "uk_exim_erp_test"), {
    address: "127.0.0.1", port: 5432, database: "uk_exim_erp_test", version: "18.6",
  });

  for (const identity of [
    { address: "192.0.2.10", port: 5432, database: "uk_exim_erp_test", version: "18.6" },
    { address: "127.0.0.1", port: 5433, database: "uk_exim_erp_test", version: "18.6" },
    { address: "127.0.0.1", port: 5432, database: "uk_exim_erp_dev", version: "18.6" },
  ]) {
    await assert.rejects(
      verifyLocalPostgresConnection({ async query() { return { rows: [identity] }; } }, "uk_exim_erp_test"),
      /must be exactly/,
    );
  }
});
