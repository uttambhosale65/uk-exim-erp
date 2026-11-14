import assert from "node:assert/strict";
import test from "node:test";
import {
  parseLocalDatabaseUrl,
  runMigrations,
  verifyLocalDatabaseConnection,
} from "../scripts/db/migrate-lib.mjs";

test("database target guard accepts only the named loopback database", () => {
  assert.equal(
    parseLocalDatabaseUrl("postgresql://test:secret@127.0.0.1:5432/uk_exim_erp_dev", "uk_exim_erp_dev").hostname,
    "127.0.0.1",
  );
  assert.throws(() => parseLocalDatabaseUrl("postgres://test:secret@[::1]:5432/uk_exim_erp_dev", "uk_exim_erp_dev"), /exactly 127\.0\.0\.1/);
  assert.throws(() => parseLocalDatabaseUrl("postgresql://x@localhost:5432/uk_exim_erp_dev", "uk_exim_erp_dev"), /exactly 127\.0\.0\.1/);
  assert.throws(() => parseLocalDatabaseUrl("https://x@127.0.0.1:5432/uk_exim_erp_dev", "uk_exim_erp_dev"), /exactly 127\.0\.0\.1/);
  assert.throws(() => parseLocalDatabaseUrl("postgresql://x@127.0.0.1:5432/production", "uk_exim_erp_dev"), /exactly 127\.0\.0\.1/);
  assert.throws(() => parseLocalDatabaseUrl("postgresql://x@127.0.0.1:5433/uk_exim_erp_dev", "uk_exim_erp_dev"), /exactly 127\.0\.0\.1/);
  for (const override of ["host=192.0.2.1", "hostaddr=192.0.2.1", "port=6432", "dbname=production"]) {
    assert.throws(() => parseLocalDatabaseUrl(`postgresql://x@127.0.0.1:5432/uk_exim_erp_dev?${override}`, "uk_exim_erp_dev"), /query parameters/);
  }
});

test("connected database identity normalizes inet CIDR addresses and accepts IPv4 loopback", async () => {
  let queryText;
  const localDb = {
    async query(sql) {
      queryText = sql;
      // PostgreSQL host(inet_server_addr()) strips the /32 host mask returned by inet_server_addr()::text.
      return { rows: [{ database: "uk_exim_erp_dev", address: "127.0.0.1", port: 5432, version: "18.6" }] };
    },
  };
  assert.deepEqual(
    await verifyLocalDatabaseConnection(localDb, "uk_exim_erp_dev"),
    { name: "uk_exim_erp_dev", address: "127.0.0.1", port: 5432, version: "18.6" },
  );
  assert.match(queryText, /host\(inet_server_addr\(\)\) AS address/);
});

test("connected database identity rejects IPv6 loopback", async () => {
  const ipv6LoopbackDb = {
    async query() {
      return { rows: [{ name: "uk_exim_erp_dev", address: "::1", version: "18.6" }] };
    },
  };
  await assert.rejects(verifyLocalDatabaseConnection(ipv6LoopbackDb, "uk_exim_erp_dev"), /exactly 127\.0\.0\.1/);
});

test("connected database identity rejects a wrong database name", async () => {
  const wrongDatabase = {
    async query() {
      return { rows: [{ database: "uk_exim_erp_test", address: "127.0.0.1", port: 5432, version: "18.6" }] };
    },
  };
  await assert.rejects(verifyLocalDatabaseConnection(wrongDatabase, "uk_exim_erp_dev"), /must be exactly/);
});

test("connected database identity rejects remote server addresses", async () => {
  const remoteServer = {
    async query() {
      return { rows: [{ database: "uk_exim_erp_dev", address: "192.0.2.1", port: 5432, version: "18.6" }] };
    },
  };
  await assert.rejects(verifyLocalDatabaseConnection(remoteServer, "uk_exim_erp_dev"), /must be exactly/);
});

test("cutover UTC and Asia/Calcutta timestamps compare by instant", () => {
  const utcCutover = Date.parse("2026-11-05T18:30:00.000Z");
  const istCutover = Date.parse("2026-11-06T00:00:00.000+05:30");
  const beforeCutover = Date.parse("2026-11-05T18:29:59.999Z");

  assert.equal(utcCutover, istCutover);
  assert.ok(utcCutover >= istCutover);
  assert.ok(beforeCutover < istCutover);
});

test("migration runner commits a synthetic migration and skips an identical rerun", async () => {
  const statements = [];
  const appliedRows = [];
  const fakeClient = {
    async query(sql, values = []) {
      statements.push(sql.trim());
      if (sql.includes("SELECT name, checksum FROM _schema_migrations")) {
        return { rows: appliedRows.map(({ name, checksum }) => ({ name, checksum })) };
      }
      if (sql.includes("INSERT INTO _schema_migrations")) {
        appliedRows.push({ name: values[0], checksum: values[1] });
      }
      return { rows: [] };
    },
  };
  const migrations = [{ name: "001_synthetic.sql", sql: "CREATE TABLE synthetic_fixture (id text PRIMARY KEY);" }];

  const first = await runMigrations(fakeClient, migrations);
  assert.deepEqual(first, { applied: 1, current: 1 });
  assert.ok(statements.includes("BEGIN"));
  assert.ok(statements.includes("COMMIT"));

  const beforeSecondRun = statements.length;
  const second = await runMigrations(fakeClient, migrations);
  assert.deepEqual(second, { applied: 0, current: 1 });
  assert.equal(statements.slice(beforeSecondRun).includes(migrations[0].sql), false);
});

test("migration runner rejects a changed applied migration checksum", async () => {
  const fakeClient = {
    async query(sql) {
      if (sql.includes("SELECT name, checksum FROM _schema_migrations")) {
        return { rows: [{ name: "001_fixture.sql", checksum: "old-checksum" }] };
      }
      return { rows: [] };
    },
  };
  await assert.rejects(
    runMigrations(fakeClient, [{ name: "001_fixture.sql", sql: "SELECT 2;" }]),
    /checksum changed/,
  );
});

test("migration runner rejects an applied migration missing from the checkout", async () => {
  const fakeClient = {
    async query(sql) {
      if (sql.includes("SELECT name, checksum FROM _schema_migrations")) {
        return { rows: [{ name: "001_removed.sql", checksum: "previously-applied" }] };
      }
      return { rows: [] };
    },
  };
  await assert.rejects(runMigrations(fakeClient, []), /missing from the repository/);
});

test("migration runner refuses an untracked non-empty database", async () => {
  const statements = [];
  const fakeClient = {
    async query(sql) {
      statements.push(sql.trim());
      if (sql.includes("to_regclass")) return { rows: [{ migration_table: null }] };
      if (sql.includes("information_schema.tables")) return { rows: [{ has_tables: true }] };
      return { rows: [] };
    },
  };
  await assert.rejects(runMigrations(fakeClient, []), /non-empty database/);
  assert.equal(statements.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS _schema_migrations")), false);
});
