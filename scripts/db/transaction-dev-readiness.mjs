import "./env.mjs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = fileURLToPath(new URL("../../", import.meta.url));
const expected = ["001_initial_foundation.sql", "002_auth_foundation.sql", "003_customer_master.sql", "004_supplier_master.sql", "005_transactional_trade_stock_ledger.sql", "006_immutable_stock_movement_events.sql", "007_stock_baseline_source_snapshot.sql", "008_verified_stock_baseline_gate.sql", "009_historical_transaction_protection.sql", "010_stock_baseline_provenance_and_effective_date.sql"];
const url = new URL(process.env.DATABASE_URL || "");
if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" || url.port !== "5432"
  || decodeURIComponent(url.pathname.slice(1)) !== "uk_exim_erp_dev" || url.search || url.hash) {
  throw new Error("Readiness inspection is restricted to 127.0.0.1:5432/uk_exim_erp_dev.");
}
const client = new pg.Client({ connectionString: url.toString() });
try {
  await client.connect();
  await client.query("BEGIN READ ONLY");
  const identity = (await client.query(`SELECT current_database() AS database,host(inet_server_addr()) AS address,
    inet_server_port() AS port,current_setting('server_version') AS version,
    (SELECT rolcreatedb OR rolsuper FROM pg_roles WHERE rolname=current_user) AS can_create_database`)).rows[0];
  if (identity.database !== "uk_exim_erp_dev" || identity.address !== "127.0.0.1" || Number(identity.port) !== 5432) throw new Error("Connected database identity is not approved local DEV.");
  const applied = await client.query("SELECT name,checksum FROM public._schema_migrations WHERE name=ANY($1::text[])", [expected]);
  const migrationStatus = [];
  for (const name of expected) {
    const sql = await readFile(path.join(root, "db", "migrations", name), "utf8");
    const checksum = createHash("sha256").update(sql, "utf8").digest("hex");
    const row = applied.rows.find((item) => item.name === name);
    migrationStatus.push({ name, applied: Boolean(row), checksumMatches: Boolean(row && row.checksum === checksum) });
  }
  const tables = ["products", "customers", "suppliers", "purchases", "purchase_items", "sales", "sales_items", "stock_baselines", "stock_movement_transactions", "stock_movements", "stock_movement_events"];
  const counts = {};
  for (const table of tables) {
    const presence = await client.query("SELECT to_regclass($1) IS NOT NULL AS present", [`public.${table}`]);
    counts[table] = presence.rows[0].present ? Number((await client.query(`SELECT count(*)::int AS count FROM public.${table}`)).rows[0].count) : null;
  }
  await client.query("ROLLBACK");
  console.log(JSON.stringify({ identity: { database: identity.database, address: identity.address, port: Number(identity.port), version: identity.version }, canCreateDatabase: identity.can_create_database, migrationStatus, rowCounts: counts, operation: "READ ONLY; transaction rolled back" }, null, 2));
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
