import "server-only";

import { Pool } from "pg";

let pool: Pool | undefined;

function getLocalDevelopmentUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured for the development database.");

  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const loopback = (url.protocol === "postgres:" || url.protocol === "postgresql:")
    && (host === "127.0.0.1" || host === "[::1]");
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!loopback || database !== "uk_exim_erp_dev") {
    throw new Error("ERP database access is restricted to local database 'uk_exim_erp_dev'.");
  }
  return url.toString();
}

export function getDatabasePool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getLocalDevelopmentUrl(),
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 3_000,
    });
  }
  return pool;
}
