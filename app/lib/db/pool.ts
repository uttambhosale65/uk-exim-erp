import "server-only";

import { Pool } from "pg";
import { parseLocalPostgresUrl, verifyLocalPostgresPool } from "./postgres-target.mjs";
import {
  createSharedDatabaseTargetResolver,
  resolveProductsUiDatabaseTarget,
  verifyConfiguredProductsUiPool,
} from "./products-ui-test.mjs";

let pool: Pool | undefined;
let authPool: Pool | undefined;

export function getLocalDevelopmentDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured for the development database.");

  return parseLocalPostgresUrl(value, "uk_exim_erp_dev", "DATABASE_URL").toString();
}

const getSharedTarget = createSharedDatabaseTargetResolver(
  () => resolveProductsUiDatabaseTarget(),
  () => getLocalDevelopmentDatabaseUrl(),
);

export function getDatabasePool(): Pool {
  if (!pool) {
    const target = getSharedTarget();
    pool = new Pool({
      connectionString: target.connectionString,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 3_000,
    });
  }
  return pool;
}

export function getAuthDatabasePool(): Pool {
  if (!authPool) {
    const target = getSharedTarget();
    authPool = new Pool({
      connectionString: target.connectionString,
      options: "-c search_path=auth,public",
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 3_000,
    });
  }
  return authPool;
}

export async function verifyProductsUiTestDatabasePool(poolToVerify: Pool): Promise<void> {
  await verifyConfiguredProductsUiPool(poolToVerify, getSharedTarget());
}

export async function verifyConfiguredDatabasePool(poolToVerify: Pool): Promise<void> {
  const target = getSharedTarget();
  const database = target.mode === "products-ui-e2e-disposable"
    ? target.databaseName
    : target.mode === "products-ui-test" ? "uk_exim_erp_test" : "uk_exim_erp_dev";
  await verifyLocalPostgresPool(poolToVerify, database);
}
