import { parseLocalPostgresUrl, verifyLocalPostgresConnection } from "../../app/lib/db/postgres-target.mjs";

const PROVISIONING_DATABASE = "uk_exim_erp_dev";

export function parseOwnerProvisioningDatabaseUrl(connectionString) {
  try {
    return parseLocalPostgresUrl(connectionString, PROVISIONING_DATABASE, "DATABASE_URL");
  } catch {
    throw new Error("Owner provisioning only accepts 127.0.0.1:5432/uk_exim_erp_dev.");
  }
}

export async function verifyOwnerProvisioningDatabaseConnection(client) {
  try { return await verifyLocalPostgresConnection(client, PROVISIONING_DATABASE); }
  catch { throw new Error("Connected PostgreSQL server is not 127.0.0.1:5432/uk_exim_erp_dev."); }
}

export async function getProvisioningCompany(client) {
  const accountState = await client.query(
    `SELECT
       (SELECT count(*)::int FROM auth."user") AS users,
       (SELECT count(*)::int FROM auth.company_memberships WHERE role = 'owner') AS owners`,
  );
  if (accountState.rows[0].users !== 0 || accountState.rows[0].owners !== 0) {
    throw new Error("An authentication account already exists; refusing owner reprovisioning.");
  }

  const companies = await client.query(
    "SELECT id::text FROM public.companies WHERE name = $1 ORDER BY created_at LIMIT 2",
    ["UK EXIM ENTERPRISES"],
  );
  if (companies.rowCount !== 1) {
    throw new Error("Exactly one UK EXIM ENTERPRISES company record must exist before owner provisioning.");
  }
  return companies.rows[0].id;
}
