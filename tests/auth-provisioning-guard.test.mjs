import assert from "node:assert/strict";
import test from "node:test";
import {
  parseOwnerProvisioningDatabaseUrl,
  verifyOwnerProvisioningDatabaseConnection,
} from "../scripts/auth/provisioning-guard.mjs";

const allowedUrl = "postgresql://test-user:test-password@127.0.0.1:5432/uk_exim_erp_dev";

test("owner provisioning accepts only the exact local development URL", () => {
  const url = parseOwnerProvisioningDatabaseUrl(allowedUrl);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "5432");
  assert.equal(url.pathname, "/uk_exim_erp_dev");
});

test("owner provisioning rejects a non-approved port", () => {
  assert.throws(
    () => parseOwnerProvisioningDatabaseUrl(allowedUrl.replace(":5432/", ":5433/")),
    /only accepts 127\.0\.0\.1:5432\/uk_exim_erp_dev/,
  );
});

test("owner provisioning rejects IPv6 loopback", () => {
  assert.throws(
    () => parseOwnerProvisioningDatabaseUrl("postgresql://test-user:test-password@[::1]:5432/uk_exim_erp_dev"),
    /only accepts 127\.0\.0\.1:5432\/uk_exim_erp_dev/,
  );
});

test("owner provisioning rejects alternate IPv4 spellings", () => {
  for (const host of ["127.1", "2130706433", "127.000.000.001"]) {
    assert.throws(
      () => parseOwnerProvisioningDatabaseUrl(`postgresql://test-user:test-password@${host}:5432/uk_exim_erp_dev`),
      /only accepts 127\.0\.0\.1:5432\/uk_exim_erp_dev/,
    );
  }
});

test("owner provisioning rejects localhost and other remote hosts", () => {
  for (const host of ["localhost", "192.0.2.10", "database.example.invalid"]) {
    assert.throws(
      () => parseOwnerProvisioningDatabaseUrl(`postgresql://test-user:test-password@${host}:5432/uk_exim_erp_dev`),
      /only accepts 127\.0\.0\.1:5432\/uk_exim_erp_dev/,
    );
  }
});

test("owner provisioning rejects a different database name", () => {
  assert.throws(
    () => parseOwnerProvisioningDatabaseUrl(allowedUrl.replace("uk_exim_erp_dev", "uk_exim_erp_test")),
    /only accepts 127\.0\.0\.1:5432\/uk_exim_erp_dev/,
  );
});

test("owner provisioning verifies the actual connected server identity", async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /inet_server_port\(\)/);
      return {
        rows: [{ address: "127.0.0.1", port: 5432, database: "uk_exim_erp_dev", version: "18.6" }],
      };
    },
  };
  assert.deepEqual(await verifyOwnerProvisioningDatabaseConnection(client), {
    address: "127.0.0.1",
    port: 5432,
    database: "uk_exim_erp_dev",
    version: "18.6",
  });
});

test("owner provisioning rejects mismatched connected server identities", async (t) => {
  const mismatches = [
    { address: "::1", port: 5432, database: "uk_exim_erp_dev", version: "18.6" },
    { address: "192.0.2.10", port: 5432, database: "uk_exim_erp_dev", version: "18.6" },
    { address: "127.0.0.1", port: 5433, database: "uk_exim_erp_dev", version: "18.6" },
    { address: "127.0.0.1", port: 5432, database: "uk_exim_erp_test", version: "18.6" },
  ];
  for (const identity of mismatches) {
    await t.test(JSON.stringify({ address: identity.address, port: identity.port, database: identity.database }), async () => {
      const client = { async query() { return { rows: [identity] }; } };
      await assert.rejects(
        verifyOwnerProvisioningDatabaseConnection(client),
        /Connected PostgreSQL server is not 127\.0\.0\.1:5432\/uk_exim_erp_dev/,
      );
    });
  }
});
