import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLocalPostgresUrl, verifyLocalPostgresConnection } from "../../app/lib/db/postgres-target.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const MIGRATIONS_DIRECTORY = path.join(PROJECT_ROOT, "db", "migrations");
const LOCK_KEY = 0x554b4558;

export function parseLocalDatabaseUrl(connectionString, expectedDatabase) {
  return parseLocalPostgresUrl(connectionString, expectedDatabase, "Database URL");
}

export async function verifyLocalDatabaseConnection(client, expectedDatabase) {
  const identity = await verifyLocalPostgresConnection(client, expectedDatabase);
  return { name: identity.database, address: identity.address, port: identity.port, version: identity.version };
}

export function checksumMigration(sql) {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

export async function readMigrations(directory = MIGRATIONS_DIRECTORY) {
  const names = (await readdir(directory))
    .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
    .sort();

  return Promise.all(names.map(async (name) => ({
    name,
    sql: await readFile(path.join(directory, name), "utf8"),
  })));
}

export async function runMigrations(client, migrations) {
  let newlyApplied = 0;
  await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
  try {
    const migrationTable = await client.query(
      "SELECT to_regclass('public._schema_migrations') AS migration_table",
    );
    if (!migrationTable.rows[0]?.migration_table) {
      const existingTables = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         ) AS has_tables`,
      );
      if (existingTables.rows[0]?.has_tables) {
        throw new Error("Refusing to initialize migrations in a non-empty database.");
      }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const appliedResult = await client.query(
      "SELECT name, checksum FROM _schema_migrations ORDER BY name",
    );
    const applied = new Map(appliedResult.rows.map(({ name, checksum }) => [name, checksum]));
    const migrationNames = new Set(migrations.map(({ name }) => name));

    for (const name of applied.keys()) {
      if (!migrationNames.has(name)) {
        throw new Error(`Applied migration is missing from the repository: ${name}`);
      }
    }

    for (const migration of migrations) {
      const checksum = checksumMigration(migration.sql);
      if (applied.has(migration.name)) {
        if (applied.get(migration.name) !== checksum) {
          throw new Error(`Applied migration checksum changed: ${migration.name}`);
        }
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO _schema_migrations (name, checksum) VALUES ($1, $2)",
          [migration.name, checksum],
        );
        await client.query("COMMIT");
        applied.set(migration.name, checksum);
        newlyApplied += 1;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    return { applied: newlyApplied, current: applied.size };
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
  }
}
