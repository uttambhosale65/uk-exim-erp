import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("Windows launcher wrappers use the in-checkout helpers and remain quiet only on success", async () => {
  const start = await read("START-UK-EXIM-ERP.bat");
  const stop = await read("STOP-UK-EXIM-ERP.bat");
  assert.match(start, /%~dp0scripts\\windows\\start-uk-exim-erp\.ps1/i);
  assert.match(stop, /%~dp0scripts\\windows\\stop-uk-exim-erp\.ps1/i);
  assert.match(start, /if not "%RUNNER_EXIT_CODE%"=="0"[\s\S]*?pause/i);
  assert.match(start, /exit \/b %RUNNER_EXIT_CODE%/i);
  assert.match(await read("scripts/windows/stop-uk-exim-erp.ps1"), /PostgreSQL, if running, was left untouched/);
});

test("launcher explicitly pins DEV production settings and excludes TEST selection", async () => {
  const source = await read("scripts/windows/runner-common.ps1");
  assert.match(source, /function Set-ERPPresentationEnvironment/);
  assert.match(source, /NODE_ENV = "production"/);
  assert.match(source, /UKEXIM_PRESENTATION_MODE = "1"/);
  assert.match(source, /UKEXIM_PRODUCTS_UI_TEST_MODE = "0"/);
  assert.match(source, /\$env:DATABASE_URL = \$null/);
  assert.match(source, /\$env:TEST_DATABASE_URL = \$null/);
  assert.match(source, /BETTER_AUTH_URL = "http:\/\/localhost:3000"/);
  assert.match(source, /HOSTNAME = "127\.0\.0\.1"/);
  assert.match(source, /function Test-ERPDevDatabase/);
  assert.match(source, /Connected to uk_exim_erp_dev on 127\\\.0\\\.0\\\.1:5432/);
});

test("Presentation Mode builds only missing or stale output and starts the existing production script", async () => {
  const startup = await read("scripts/windows/start-uk-exim-erp.ps1");
  const common = await read("scripts/windows/runner-common.ps1");
  const config = await read("next.config.ts");
  const packageJson = JSON.parse(await read("package.json"));
  assert.match(startup, /Test-ERPProductionBuildFresh/);
  assert.match(startup, /Invoke-ERPnpmScript \$paths "build"/);
  assert.match(startup, /Invoke-ERPnpmScript/);
  assert.match(startup, /next-presentation-host\.mjs/);
  assert.match(startup, /Write-ERPNextRunnerState \$paths \(\[int\]\$server\.Id\) \$env:BETTER_AUTH_URL "production"/);
  assert.match(startup, /UKEXIM_ERP_STDOUT_LOG/);
  assert.match(common, /function Test-ERPProductionBuildFresh/);
  assert.match(config, /UKEXIM_PRESENTATION_MODE === "1"/);
  assert.match(config, /"\.next-presentation"/);
  assert.match(await read(".gitignore"), /\/\.next-presentation\//);
  assert.match(packageJson.scripts.start, /--hostname 127\.0\.0\.1 --port 3000/);
});

test("database and server checks are read-only and precede browser launch", async () => {
  const startup = await read("scripts/windows/start-uk-exim-erp.ps1");
  const common = await read("scripts/windows/runner-common.ps1");
  assert.match(startup, /Ensure-ApprovedPostgreSql/);
  assert.match(startup, /Wait-PostgreSqlReady/);
  assert.match(startup, /Test-ERPDevDatabase/);
  assert.match(startup, /Wait-ERPLoginRoute \$loginUrl/);
  assert.match(startup, /Start-Process -FilePath \$loginUrl/);
  assert.ok(startup.indexOf("Test-ERPDevDatabase") < startup.indexOf("Start-Process -FilePath $loginUrl"));
  assert.match(common, /function Test-ERPLoginRoute/);
  assert.match(common, /AllowAutoRedirect = \$false/);
  assert.match(common, /StatusCode -ne 200/);
  assert.match(common, /Sign in to your account/);
  assert.match(common, /function Wait-ERPLoginRoute/);
  assert.match(common, /@\("build", "start", "db:check"\)/);
  assert.doesNotMatch(startup, /npm run db:migrate|npm run db:test/i);
});

test("existing server reuse is exact-project and state constrained; unrelated listeners are never stopped", async () => {
  const startup = await read("scripts/windows/start-uk-exim-erp.ps1");
  const common = await read("scripts/windows/runner-common.ps1");
  assert.match(common, /function Test-ERPNextServerWorker/);
  assert.match(common, /node_modules\\next\\dist\\server\\lib\\start-server\.js/);
  assert.match(common, /function Test-ERPNextListenerProcessTree/);
  assert.match(common, /function Get-ERPNextListenerMode/);
  assert.match(common, /function Get-ERPNextManagerProcessId/);
  assert.match(common, /function Test-ERPNextLegacyDevListenerTree/);
  assert.match(common, /TEST mode is disabled/);
  assert.match(startup, /Get-ERPNextVerifiedMode/);
  assert.match(startup, /databaseName -cne "uk_exim_erp_dev"/);
  assert.match(startup, /No process was stopped and no duplicate ERP was started/);
  assert.doesNotMatch(startup, /Stop-Process|taskkill/i);
});

test("PostgreSQL guard verifies exact installation, cluster, config and unique external startup log", async () => {
  const source = await read("scripts/windows/runner-common.ps1");
  assert.match(source, /postgresql-18\.6-5-windows-x64-binaries\\pgsql\\bin/);
  assert.match(source, /UKEXIM-ERP\\PostgreSQL\\data/);
  assert.match(source, /function Test-ApprovedPostgreSqlConfiguration/);
  assert.match(source, /listen_addresses/);
  assert.match(source, /logging_collector/);
  assert.ok(source.includes('PostgreSQL\\) 18\\.6'));
  assert.match(source, /-h 127\.0\.0\.1 -p 5432/);
  assert.match(source, /postgresql-start-\$runId\.log/);
  assert.match(source, /function Enter-ERPRunnerMutex/);
  assert.match(source, /function Invoke-ERPPostgreSqlStart/);
  assert.match(source, /RedirectStandardOutput \$Paths\.PostgreSqlCtlStdoutLog/);
  assert.match(source, /RedirectStandardError \$Paths\.PostgreSqlCtlStderrLog/);
  assert.match(source, /Invoke-ERPPostgreSqlStart \$Paths \$PostgreSql/);
  assert.match(source, /postmaster\.pid/);
  assert.match(source, /No other cluster will be used/);
  assert.doesNotMatch(source, /Remove-Item[^\n]*postmaster\.pid/i);
});

test("logging is unique per run and diagnostic output is sanitized", async () => {
  const source = await read("scripts/windows/runner-common.ps1");
  assert.match(source, /launcher-\$runId\.log/);
  assert.match(source, /next-presentation-\$runId\.stdout\.log/);
  assert.match(source, /next-presentation-\$runId\.stderr\.log/);
  assert.match(source, /function ConvertTo-SafeDiagnosticText/);
  assert.match(source, /REDACTED POSTGRESQL URL/);
  assert.match(source, /sharing violation/);
  assert.match(source, /data directory was preserved/);
});

test("Presentation output relay redacts credentials before appending logs", async () => {
  const { sanitizeDiagnosticText } = await import("../scripts/windows/next-presentation-host.mjs");
  const sanitized = sanitizeDiagnosticText(
    "DATABASE_URL=postgres://owner:very-secret@127.0.0.1/db password=hidden token=abc?session=xyz",
  );
  assert.doesNotMatch(sanitized, /very-secret|hidden|abc|xyz/);
  assert.match(sanitized, /REDACTED/);
  const relay = await read("scripts/windows/next-presentation-host.mjs");
  assert.match(relay, /appendSanitized/);
  assert.match(relay, /sanitizeDiagnosticText\(text\)/);
});

test("safe Stop handles only exact recorded Next.js processes and leaves PostgreSQL running", async () => {
  const source = await read("scripts/windows/stop-uk-exim-erp.ps1");
  const common = await read("scripts/windows/runner-common.ps1");
  assert.match(source, /Test-ManagedERPProcess/);
  assert.match(source, /state\.mode.*production/);
  assert.match(source, /SIGINT/);
  assert.match(source, /SIGTERM/);
  assert.match(common, /function Send-ERPProcessSignal/);
  assert.match(common, /process\.kill\(Number\(process\.argv\[1\]\),String\.fromCharCode/);
  assert.match(common, /SIGNAL_SENT/);
  assert.doesNotMatch(source, /Stop-Process -Id \$processId -Force/);
  assert.match(source, /PostgreSQL was left running/);
  assert.match(source, /Type STOP to confirm stopping this exact UK EXIM ERP process/);
  assert.match(source, /Test-ERPNextLegacyDevListenerTree/);
  assert.doesNotMatch(source, /taskkill\s+\/IM\s+node\.exe/i);
  assert.match(source, /Stop-VerifiedERPNextProductionListener/);
  assert.match(common, /function Get-VerifiedERPNextProductionListenerIds/);
  assert.match(common, /function Stop-VerifiedERPNextProductionListener/);
  assert.match(common, /this checkout's exact loopback Next\.js Presentation server/);
});

test("login route and App Router assumptions match current source", async () => {
  const route = await read("app/login/page.tsx");
  const config = await read("next.config.ts");
  assert.match(route, /export default async function LoginPage/);
  assert.match(route, /Sign in to your account/);
  assert.doesNotMatch(config, /basePath|rewrites|redirects/);
});
