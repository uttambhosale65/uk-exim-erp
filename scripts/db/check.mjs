import "./env.mjs";
import pg from "pg";
import { parseLocalDatabaseUrl, verifyLocalDatabaseConnection } from "./migrate-lib.mjs";

const connectionString = parseLocalDatabaseUrl(process.env.DATABASE_URL, "uk_exim_erp_dev");
const pool = new pg.Pool({ connectionString: connectionString.toString(), max: 1 });

try {
  const result = await verifyLocalDatabaseConnection(pool, "uk_exim_erp_dev");
  console.log(`Connected to ${result.name} on ${result.address}:${result.port} (PostgreSQL ${result.version}).`);
} finally {
  await pool.end();
}
