import "server-only";

import { getDatabasePool } from "./pool";

/** Connectivity check only; this does not read or change ERP business tables. */
export async function checkDevelopmentDatabase(): Promise<{ connected: true }> {
  await getDatabasePool().query("SELECT 1");
  return { connected: true };
}
