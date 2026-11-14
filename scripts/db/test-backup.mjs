import "./env.mjs";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { verifyLocalPostgresConnection } from "../../app/lib/db/postgres-target.mjs";
import { parseProductsUiTestDatabaseUrl } from "../../app/lib/db/products-ui-test.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const LOCAL_DIR = path.join(ROOT, ".local-test");
const PG_BIN = "C:/Users/ADMIN/Downloads/postgresql-18.6-5-windows-x64-binaries/pgsql/bin";
const DUMP = path.join(PG_BIN, "pg_dump.exe");
const RESTORE = path.join(PG_BIN, "pg_restore.exe");

function requiredEnvironment() {
  if (process.env.NODE_ENV !== "development" || process.env.UKEXIM_PRODUCTS_UI_TEST_MODE !== "1"
    || process.env.UKEXIM_E2E_DISPOSABLE_MODE !== undefined) {
    throw new Error("Persistent TEST backup requires development TEST mode and must run outside disposable app mode.");
  }
  return parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL);
}

function run(executable, args, env, { capture = false } = {}) {
  const result = spawnSync(executable, args, { env, encoding: "utf8", windowsHide: true, stdio: "pipe", maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw new Error(`${path.basename(executable)} could not run (${result.error.code || "process error"}).`);
  if (result.status !== 0) {
    let message = String(result.stderr || "").trim();
    for (const secret of [env.PGPASSWORD, env.TEST_DATABASE_URL].filter(Boolean)) message = message.replaceAll(String(secret), "[REDACTED]");
    message = message.replace(/(?:postgres|postgresql):\/\/[^\s]+/gi, "[connection URL redacted]").slice(0, 1000);
    throw new Error(`${path.basename(executable)} exited with code ${result.status}${message ? `: ${message}` : "."}`);
  }
  return capture ? String(result.stdout || "") : "";
}

const source = requiredEnvironment();
const sourceText = source.toString();
const client = new pg.Client({ connectionString: sourceText });
let target;
try {
  await client.connect();
  target = await verifyLocalPostgresConnection(client, "uk_exim_erp_test");
  if (target.version !== "18.6" || target.address !== "127.0.0.1" || Number(target.port) !== 5432) {
    throw new Error("Persistent TEST backup source identity is not the verified local PostgreSQL 18.6 instance.");
  }
  await client.query("BEGIN READ ONLY");
  const migrationRows = await client.query("SELECT name FROM public._schema_migrations ORDER BY name");
  if (!migrationRows.rowCount || migrationRows.rows[0].name !== "001_initial_foundation.sql") {
    throw new Error("Persistent TEST migration history is unavailable or unexpected; backup refused.");
  }
  const tableRows = await client.query(`SELECT table_schema,table_name FROM information_schema.tables
    WHERE table_schema IN ('public','auth') AND table_type='BASE TABLE' ORDER BY table_schema,table_name`);
  await client.query("ROLLBACK");
  if (!tableRows.rows.some((row) => row.table_schema === "public" && row.table_name === "companies")
    || !tableRows.rows.some((row) => row.table_schema === "auth" && row.table_name === "user")) {
    throw new Error("Persistent TEST is missing expected company/auth tables; backup refused.");
  }
  await stat(DUMP);
  await stat(RESTORE);
  await mkdir(LOCAL_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const file = path.join(LOCAL_DIR, `uk-exim-test-${stamp}-${randomUUID().slice(0, 8)}.dump`);
  const partial = `${file}.partial`;
  const env = { ...process.env, PGPASSWORD: decodeURIComponent(source.password) };
  const args = ["--host=127.0.0.1", "--port=5432", `--username=${decodeURIComponent(source.username)}`,
    "--dbname=uk_exim_erp_test", "--format=custom", "--no-owner", "--no-privileges", `--file=${partial}`];
  try {
    run(DUMP, args, env);
    const dumpStat = await stat(partial);
    if (!dumpStat.isFile() || dumpStat.size < 1024) throw new Error("Native TEST backup output is unexpectedly small or missing.");
    const listing = run(RESTORE, ["--list", partial], env, { capture: true });
    for (const expected of ["TABLE public companies", "TABLE public products", "TABLE auth user", "TABLE public _schema_migrations"]) {
      if (!listing.includes(expected)) throw new Error(`Native TEST backup integrity list is missing required object ${expected}.`);
    }
    const digest = createHash("sha256").update(await readFile(partial)).digest("hex");
    const finalStat = await stat(partial);
    const finalPath = file;
    const { rename } = await import("node:fs/promises");
    await rename(partial, finalPath);
    console.log(JSON.stringify({ result: "PASS", database: "uk_exim_erp_test", address: target.address,
      port: target.port, version: target.version, backupFile: path.relative(ROOT, finalPath), sizeBytes: finalStat.size,
      sha256: digest, migrationCount: migrationRows.rowCount, tableCount: tableRows.rowCount,
      integrity: "pg_restore --list passed; required public/auth/migration entries present", persistentTestWrites: false,
      devDatabaseConnected: false }));
  } catch (error) {
    await unlink(partial).catch(() => {});
    throw error;
  }
} finally {
  await client.end().catch(() => {});
}
