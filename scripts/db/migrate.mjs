import "./env.mjs";
import pg from "pg";
import {
  parseLocalDatabaseUrl,
  readMigrations,
  runMigrations,
  verifyLocalDatabaseConnection,
} from "./migrate-lib.mjs";

if (process.env.NODE_ENV === "production") {
  throw new Error("Development migrations are disabled when NODE_ENV=production.");
}

const connectionString = parseLocalDatabaseUrl(process.env.DATABASE_URL, "uk_exim_erp_dev");
const client = new pg.Client({ connectionString: connectionString.toString() });

try {
  await client.connect();
  await verifyLocalDatabaseConnection(client, "uk_exim_erp_dev");
  await runMigrations(client, await readMigrations());
  console.log("Local development migrations are current.");
} finally {
  await client.end();
}
