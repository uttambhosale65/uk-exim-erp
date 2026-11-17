$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "..\..\scripts\windows\runner-common.ps1")

$script:ApprovedState = $true
$script:Scenario = "running"
$script:CheckCalls = 0
$script:PostgresStartCalls = 0
$script:PostgresStartArguments = $null
$script:ProbeReady = $true
$script:LogTail = ""
function Test-ApprovedPostgreSqlInstance($Paths, $PostgreSql) {
  if ($script:Scenario -eq "port-conflict") { throw "Port 5432 is occupied by an unrelated process." }
  if ($script:Scenario -eq "start-transition") {
    $script:CheckCalls++
    return ($script:CheckCalls -gt 1)
  }
  return $script:ApprovedState
}
function Invoke-ERPPostgreSqlCtl($PostgreSql, [string[]] $Arguments) {
  if ($Arguments[0] -eq "start") { $script:PostgresStartCalls++ }
  return [pscustomobject]@{ ExitCode = 0; Output = "synthetic pg_ctl output" }
}
function Invoke-ERPPostgreSqlStart($Paths, $PostgreSql) {
  $script:PostgresStartCalls++
  $script:PostgresStartArguments = @($Paths.DataDirectory, $Paths.PostgreSqlLog, $PostgreSql.PgCtl)
  return [pscustomobject]@{ ExitCode = 0; Output = "synthetic pg_ctl start output" }
}
function Test-PostgreSqlReadyProbe($Paths) { return $script:ProbeReady }
function Get-ERPPostgreSqlLogTail($Paths) { return $script:LogTail }
function Get-ListeningProcessIds([int] $Port) { return @() }

$paths = [pscustomobject]@{
  RuntimeDirectory = Join-Path $env:TEMP ("UKEXIM-pg-test-" + [Guid]::NewGuid().ToString("N"))
  LogDirectory = Join-Path $env:TEMP ("UKEXIM-pg-log-test-" + [Guid]::NewGuid().ToString("N"))
  RunnerLog = Join-Path $env:TEMP ("UKEXIM-pg-test-" + [Guid]::NewGuid().ToString("N") + ".log")
  PostgreSqlLog = Join-Path $env:TEMP ("UKEXIM-pg-test-" + [Guid]::NewGuid().ToString("N") + ".pg.log")
  DataDirectory = Join-Path $env:TEMP "synthetic-empty-postgres-data"
}
$pg = [pscustomobject]@{ PgCtl = "mock-pg_ctl.exe" }

# Already-running exact instance is reused without a second pg_ctl start.
$script:ApprovedState = $true
$started = Ensure-ApprovedPostgreSql $paths $pg
if ($started -or $script:PostgresStartCalls -ne 0) { throw "Running PostgreSQL was not safely reused." }

# A stopped exact cluster is started once and waits for real readiness.
$script:ApprovedState = $false
$script:Scenario = "start-transition"
$script:CheckCalls = 0
$started = Ensure-ApprovedPostgreSql $paths $pg
if (-not $started -or $script:PostgresStartCalls -ne 1) { throw "Stopped PostgreSQL was not started exactly once." }
if ($script:PostgresStartArguments[0] -ne $paths.DataDirectory -or $script:PostgresStartArguments[1] -ne $paths.PostgreSqlLog -or $script:PostgresStartArguments[2] -ne $pg.PgCtl) { throw "The isolated PostgreSQL start did not use the exact approved DEV paths." }

# A port conflict on an otherwise stopped cluster is refused without start.
$script:Scenario = "port-conflict"
$before = $script:PostgresStartCalls
try { Ensure-ApprovedPostgreSql $paths $pg; throw "Expected unrelated port conflict to be refused." }
catch { if ($_.Exception.Message -notlike "*Port 5432 is occupied*") { throw } }
if ($script:PostgresStartCalls -ne $before) { throw "PostgreSQL start was attempted after an unrelated port conflict." }

# PostgreSQL settings are allowlisted and compared to the exact local target.
$script:Config = @{
  data_directory = $paths.DataDirectory
  listen_addresses = "127.0.0.1"
  port = "5432"
  logging_collector = "off"
}
function Get-PostgreSqlConfigValue($Paths, $PostgreSql, [string] $Setting) { return $script:Config[$Setting] }
if (-not (Test-ApprovedPostgreSqlConfiguration $paths $pg)) { throw "Expected exact PostgreSQL configuration to pass." }
$script:Config.listen_addresses = "localhost"
if (-not (Test-ApprovedPostgreSqlConfiguration $paths $pg)) { throw "Expected the existing localhost-only PostgreSQL configuration to pass when runtime listeners are verified separately." }
$script:Config.listen_addresses = "0.0.0.0"
try { Test-ApprovedPostgreSqlConfiguration $paths $pg; throw "Expected non-loopback listen address to be refused." }
catch { if ($_.Exception.Message -notlike "*does not point exclusively*") { throw } }

# Readiness timeout reports a log sharing violation without altering its source.
$script:ProbeReady = $false
$script:LogTail = "could not open file server.log: sharing violation"
try { Wait-PostgreSqlReady $paths $pg 1; throw "Expected failed readiness to stop startup." }
catch { if ($_.Exception.Message -notlike "*sharing violation*") { throw } }

Write-Output "Mocked PostgreSQL startup tests passed (6 scenarios)."
