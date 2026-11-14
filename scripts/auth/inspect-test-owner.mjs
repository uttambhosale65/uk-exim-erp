import "../db/env.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { parseProductsUiTestDatabaseUrl, PRODUCTS_UI_TEST_COMPANY_NAME, verifyProductsUiTestDatabase } from "../../app/lib/db/products-ui-test.mjs";

if (process.env.NODE_ENV !== "development" || process.env.UKEXIM_PRODUCTS_UI_TEST_MODE !== "1") {
  throw new Error("Test-owner inspection requires explicit development TEST mode.");
}
const url = parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL).toString();
const manifest = JSON.parse(await readFile(path.resolve(".local-test/products-ui-fixture.json"), "utf8"));
if (manifest.database !== "uk_exim_erp_test" || manifest.status !== "ready"
  || manifest.companyName !== PRODUCTS_UI_TEST_COMPANY_NAME
  || !manifest.username?.startsWith("synthetic_") || !manifest.userEmail?.endsWith("@example.invalid")) {
  throw new Error("The exact ready synthetic TEST fixture manifest is required.");
}
const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await verifyProductsUiTestDatabase(client);
  const identity = await client.query(`SELECT host(inet_server_addr()) AS address,
      inet_server_port() AS port,current_database() AS database,version() AS version`);
  await client.query("BEGIN READ ONLY");
  const company = await client.query("SELECT count(*)::int AS n FROM public.companies WHERE id=$1 AND name=$2", [manifest.companyId, PRODUCTS_UI_TEST_COMPANY_NAME]);
  const user = await client.query('SELECT count(*)::int AS n FROM auth."user" WHERE id=$1 AND username=$2 AND email=$3', [manifest.userId, manifest.username, manifest.userEmail]);
  const credential = await client.query(`SELECT count(*)::int AS accounts,
      count(*) FILTER (WHERE password IS NOT NULL AND password <> '')::int AS hashes
      FROM auth."account" WHERE "userId"=$1 AND "providerId"='credential'`, [manifest.userId]);
  const membership = await client.query("SELECT count(*)::int AS memberships,count(*) FILTER (WHERE role='owner')::int AS owners FROM auth.company_memberships WHERE user_id=$1 AND company_id=$2", [manifest.userId, manifest.companyId]);
  const sessions = await client.query('SELECT count(*)::int AS n FROM auth."session" WHERE "userId"=$1', [manifest.userId]);
  await client.query("ROLLBACK");
  const report = {
    database: identity.rows[0].database,
    address: identity.rows[0].address,
    port: Number(identity.rows[0].port),
    postgresVersion: identity.rows[0].version.match(/^PostgreSQL\s+([\d.]+)/)?.[1] ?? "verified",
    manifestStatus: manifest.status,
    syntheticCompanyMatchesManifest: Number(company.rows[0].n),
    userMatchesManifest: Number(user.rows[0].n),
    credentialAccountCount: Number(credential.rows[0].accounts),
    passwordHashPresent: Number(credential.rows[0].hashes) === 1,
    companyMembershipCount: Number(membership.rows[0].memberships),
    ownerMembershipCount: Number(membership.rows[0].owners),
    sessionCount: Number(sessions.rows[0].n),
    operation: "READ ONLY",
  };
  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.end();
}
