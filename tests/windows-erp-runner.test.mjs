import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("Windows launcher wrappers resolve helpers relative to this checkout", async () => {
  const start = await read("START-UK-EXIM-ERP.bat");
  const stop = await read("STOP-UK-EXIM-ERP.bat");
  assert.match(start, /%~dp0scripts\\windows\\start-uk-exim-erp\.ps1/i);
  assert.match(stop, /%~dp0scripts\\windows\\stop-uk-exim-erp\.ps1/i);
  assert.match(start, /if not "%RUNNER_EXIT_CODE%"=="0"/i);
  assert.match(start, /pause/i);
  assert.match(stop, /pause/i);
});

test("startup pins development mode, disables test mode, and clears test database selection", async () => {
  const source = await read("scripts/windows/start-uk-exim-erp.ps1");
  assert.match(source, /\$env:NODE_ENV\s*=\s*"development"/);
  assert.match(source, /\$env:UKEXIM_PRODUCTS_UI_TEST_MODE\s*=\s*"0"/);
  assert.match(source, /\$env:TEST_DATABASE_URL\s*=\s*\$null/);
  assert.match(source, /\$env:BETTER_AUTH_URL\s*=\s*"http:\/\/127\.0\.0\.1:3000"/);
  assert.match(source, /--hostname 127\.0\.0\.1 --port 3000/);
  assert.match(source, /http:\/\/127\.0\.0\.1:3000\/login/);
  assert.match(source, /Get-VerifiedERPNextListenerIds 3000/);
  assert.match(source, /Wait-ERPLoginRoute \$loginUrl/);
  assert.match(source, /Start-Process -FilePath \$loginUrl/);
  assert.match(source, /Write-ERPNextRunnerState/);
});

test("launcher requires an actual successful Login page response before opening the browser", async () => {
  const source = await read("scripts/windows/runner-common.ps1");
  assert.match(source, /function Test-ERPLoginRoute/);
  assert.match(source, /AllowAutoRedirect = \$false/);
  assert.match(source, /StatusCode -ne 200/);
  assert.match(source, /Sign in to your account/);
  assert.match(source, /function Wait-ERPLoginRoute/);
  const startup = await read("scripts/windows/start-uk-exim-erp.ps1");
  assert.match(startup, /managed ERP server is running, but its Login page did not return HTTP 200/);
  assert.match(startup, /Next\.js is listening, but the Login page did not return HTTP 200/);
});

test("already-running listener detection verifies Next start-server worker and its project Next CLI ancestor", async () => {
  const helper = await read("scripts/windows/runner-common.ps1");
  const startup = await read("scripts/windows/start-uk-exim-erp.ps1");
  assert.match(helper, /function Test-ERPNextServerWorker/);
  assert.match(helper, /node_modules\\next\\dist\\server\\lib\\start-server\.js/);
  assert.match(helper, /function Test-ERPNextListenerProcessTree/);
  assert.match(helper, /ParentProcessId/);
  assert.match(helper, /function Test-ManagedERPListener/);
  assert.match(startup, /Test-ManagedERPListener \(\[int\]\$portOwners\[0\]\)/);
  assert.doesNotMatch(startup, /Test-ManagedERPProcess \$existing/);
});

test("launcher reports failure and pauses only on error; success exits without a pause", async () => {
  const start = await read("START-UK-EXIM-ERP.bat");
  assert.match(start, /if not "%RUNNER_EXIT_CODE%"=="0" \([\s\S]*?pause[\s\S]*?\)/i);
  assert.match(start, /exit \/b %RUNNER_EXIT_CODE%/i);
});

test("the login route exists directly in the App Router and has no configured base path", async () => {
  const route = await read("app/login/page.tsx");
  const config = await read("next.config.ts");
  const proxy = await read("proxy.ts");
  assert.match(route, /export default async function LoginPage/);
  assert.doesNotMatch(config, /basePath|rewrites|redirects/);
  assert.match(proxy, /pathname === "\/login"/);
});

test("PostgreSQL helper is restricted to the existing local DEV cluster and exact version", async () => {
  const source = await read("scripts/windows/runner-common.ps1");
  assert.match(source, /UKEXIM-ERP\\PostgreSQL\\data/);
  assert.match(source, /postgresql-18\.6-5-windows-x64-binaries\\pgsql\\bin/);
  assert.match(source, /\$Paths\.PostgreSqlBinDirectory "pg_ctl\.exe"/);
  assert.match(source, /\$Paths\.PostgreSqlBinDirectory "postgres\.exe"/);
  assert.match(source, /PostgreSQL\\\) 18\\\.6/);
  assert.match(source, /\$PostgreSql\.PgCtl start -D \$Paths\.DataDirectory -o "-h 127\.0\.0\.1 -p 5432"/);
  assert.match(source, /Get-ListeningProcessIds 5432/);
  assert.match(source, /\$_.LocalAddress -ne "127\.0\.0\.1"/);
  assert.match(source, /not exclusively owned by the approved PostgreSQL data directory/);
  assert.match(source, /-ine \$PostgreSql\.PostgresExe/);
});

test("startup readiness verifies a loopback listener belongs to the launched Next.js process tree", async () => {
  const source = await read("scripts/windows/runner-common.ps1");
  assert.match(source, /function Test-ERPNextProcessDescendant/);
  assert.match(source, /ParentProcessId/);
  assert.match(source, /function Get-VerifiedERPNextListenerIds/);
  assert.match(source, /LocalAddress -ne "127\.0\.0\.1"/);
  assert.match(source, /could not be verified as part of this checkout's Next\.js process tree/);
});

test("stop logic validates the recorded checkout and targets only its recorded PID", async () => {
  const source = await read("scripts/windows/stop-uk-exim-erp.ps1");
  assert.match(source, /Test-ManagedERPProcess/);
  assert.match(source, /processId/);
  assert.match(source, /SIGINT/);
  assert.match(source, /SIGTERM/);
  assert.match(source, /Stop-Process -Id \$processId -Force/);
  assert.doesNotMatch(source, /taskkill\s+\/IM\s+node\.exe/i);
  assert.match(source, /PostgreSQL was left running/);
});

test("module inventory covers all requested modules and distinguishes schema from API integration", async () => {
  const doc = await read("docs/ERP-MODULE-INTEGRATION-STATUS.md");
  for (const moduleName of [
    "Dashboard", "Product Master", "Customer Master", "Supplier Master", "Stock", "Purchase", "Sales",
    "Purchase Return", "Sales Return", "Payments / Receipts", "Expenses", "Reports", "Export / Import",
    "Settings", "User Management",
  ]) assert.ok(doc.includes(moduleName), `missing module inventory row: ${moduleName}`);
  assert.match(doc, /schema exists|schema only/i);
  assert.match(doc, /No purchase API/);
  assert.match(doc, /No sales API/);
});
