$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "runner-common.ps1")

$mutex = $null
$paths = $null
try {
  $paths = Get-ERPProjectPaths
  $mutex = Enter-ERPRunnerMutex
  $null = New-Item -ItemType Directory -Path $paths.RuntimeDirectory -Force
  $null = New-Item -ItemType Directory -Path $paths.LogDirectory -Force
  Write-ERPRunnerLog $paths "Startup check began for the approved project checkout."

  if (-not (Test-Path -LiteralPath (Join-Path $paths.ProjectRoot "node_modules") -PathType Container)) {
    throw "Project dependencies are missing. Ask the technical maintainer to restore this checkout's npm dependencies; the launcher did not install anything."
  }

  $postgres = Find-PostgreSql18Ctl $paths
  $postgresStarted = Ensure-ApprovedPostgreSql $paths $postgres
  if ($postgresStarted) {
    Write-Host "Local PostgreSQL DEV started. No database or business records were created or changed."
    Write-ERPRunnerLog $paths "Started approved PostgreSQL 18.6 DEV cluster with a unique external log file."
  }
  else {
    Write-Host "Local PostgreSQL DEV is already running safely."
    Write-ERPRunnerLog $paths "Reusing approved PostgreSQL 18.6 DEV cluster."
  }
  $null = Wait-PostgreSqlReady $paths $postgres

  Set-ERPPresentationEnvironment
  $dbCheck = Test-ERPDevDatabase $paths
  Write-Host "Verified DEV database: uk_exim_erp_dev at 127.0.0.1:5432 (PostgreSQL 18.6)."
  Write-ERPRunnerLog $paths "Read-only DEV database identity check passed."

  $loginUrl = "http://localhost:3000/login"
  $connections = @(Get-ListeningConnections 3000)
  $listenerIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
  if ($listenerIds.Count -gt 0) {
    $allLegacyDev = $true
    foreach ($listenerId in $listenerIds) {
      if (-not (Test-ERPNextLegacyDevListenerTree ([int]$listenerId) $paths 3000)) { $allLegacyDev = $false; break }
    }
    $hasNonLoopback = @($connections | Where-Object { [string]$_.LocalAddress -ne "127.0.0.1" }).Count -gt 0
    if ($allLegacyDev -and $hasNonLoopback) {
      $legacyState = Read-RunnerState $paths "development"
      Write-ERPRunnerLog $paths "Found exact-checkout legacy Next dev server on a non-loopback listener. Checking runner ownership and TEST-disabled state before any transition."
      $null = Stop-VerifiedLegacyDevForPresentation $listenerIds $legacyState $paths 3000
      $connections = @(Get-ListeningConnections 3000)
      if ($connections.Count -gt 0) { throw "The legacy server released its own listener, but port 3000 was claimed again. No other process was stopped." }
    }
    else {
      $verifiedModes = @()
      foreach ($listenerId in $listenerIds) {
        $mode = Get-ERPNextVerifiedMode ([int]$listenerId) $paths 3000
        if (-not $mode) {
          $owner = Get-ProcessRecord ([int]$listenerId)
          $ownerName = if ($owner) { "$($owner.Name) PID $listenerId" } else { "unknown PID $listenerId" }
          throw "Port 3000 is occupied by $ownerName or is not bound exclusively to 127.0.0.1. No process was stopped and no duplicate ERP was started."
        }
        $verifiedModes += $mode
      }
      if (@($verifiedModes | Select-Object -Unique).Count -ne 1) {
        throw "Port 3000 listeners do not belong to one consistent ERP mode. No process was stopped and no duplicate was started."
      }
      $existingMode = $verifiedModes[0]
      $state = Read-RunnerState $paths $existingMode
      if (-not $state -or -not (Test-ManagedERPListener ([int]$listenerIds[0]) $state $paths 3000) -or
          [string]$state.authBaseUrl -cne "http://localhost:3000" -or
          [string]$state.databaseName -cne "uk_exim_erp_dev" -or
          [string]$state.databaseAddress -cne "127.0.0.1" -or [int]$state.databasePort -ne 5432) {
        throw "A UK EXIM Next.js process is using port 3000, but its runner state does not prove this launcher's localhost/DEV configuration. No process was stopped."
      }
      if (-not (Wait-ERPLoginRoute $loginUrl)) {
        throw "The verified ERP process did not serve the expected Login page with HTTP 200. No browser was opened. Logs: $($paths.LogDirectory)"
      }
      Start-Process -FilePath $loginUrl -ErrorAction Stop
      $modeLabel = if ($existingMode -eq "production") { "Presentation Mode" } else { "Development Mode" }
      Write-Host "UK EXIM ERP $modeLabel is already running. Login page opened: $loginUrl"
      Write-ERPRunnerLog $paths "Reused verified $existingMode server; login readiness passed; browser opened."
      exit 0
    }
  }

  if (-not (Test-ERPProductionBuildFresh $paths)) {
    Write-Host "Preparing the Presentation Mode production build..."
    Write-ERPRunnerLog $paths "Presentation build missing or stale; running the existing npm build script."
    $build = Invoke-ERPnpmScript $paths "build"
    if ($build.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $paths.PresentationBuildId -PathType Leaf)) {
      throw "The Presentation Mode build failed. The old build was not started. Safe diagnostic logs: $($paths.LogDirectory)"
    }
  }
  else {
    Write-ERPRunnerLog $paths "Presentation build is current; no build was run."
  }

  $env:UKEXIM_ERP_STDOUT_LOG = $paths.StdoutLog
  $env:UKEXIM_ERP_STDERR_LOG = $paths.StderrLog
  $outputRelay = Join-Path $paths.ProjectRoot "scripts\windows\next-presentation-host.mjs"
  $server = Start-Process -FilePath $paths.NodeExe `
    -ArgumentList ('"{0}" "{1}"' -f $outputRelay, $paths.NpmCli) `
    -WorkingDirectory $paths.ProjectRoot -WindowStyle Hidden -PassThru
  $env:UKEXIM_ERP_STDOUT_LOG = $null
  $env:UKEXIM_ERP_STDERR_LOG = $null

  # Persist this exact run-owned host before readiness discovery. If the
  # readiness guard later refuses an unexpected listener, the STOP helper can
  # still identify and gracefully stop only the host created above.
  Write-ERPNextRunnerState $paths ([int]$server.Id) $env:BETTER_AUTH_URL "production"
  $statePath = $paths.PresentationStateFile
  $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
  $state | Add-Member -NotePropertyName databaseName -NotePropertyValue "uk_exim_erp_dev" -Force
  $state | Add-Member -NotePropertyName databaseAddress -NotePropertyValue "127.0.0.1" -Force
  $state | Add-Member -NotePropertyName databasePort -NotePropertyValue 5432 -Force
  $state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8

  $managerId = [int]$server.Id
  $listenerIds = @()
  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    Start-Sleep -Seconds 1
    $connections = @(Get-ListeningConnections 3000)
    if ($connections.Count -gt 0) {
      if (@($connections | Where-Object { [string]$_.LocalAddress -ne "127.0.0.1" }).Count -gt 0) {
        throw "The new ERP process opened a listener outside 127.0.0.1. It was not trusted; no unrelated process was stopped."
      }
      $listenerIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
      $managerIds = @()
      foreach ($listenerId in $listenerIds) {
        $foundManager = Get-ERPNextManagerProcessId ([int]$listenerId) $paths 3000 "production"
        if (-not $foundManager) { throw "Port 3000 became occupied, but its listener could not be tied to this production Next.js process. No process was stopped." }
        $managerIds += $foundManager
      }
      if (@($managerIds | Select-Object -Unique).Count -ne 1) { throw "The production server exposed inconsistent process ownership. No browser was opened." }
      $managerId = [int]$managerIds[0]
      break
    }
    $server.Refresh()
    if ($server.HasExited) { break }
  }
  if (-not $managerId) {
    $tail = ""
    foreach ($log in @($paths.StdoutLog, $paths.StderrLog)) {
      if (Test-Path -LiteralPath $log) { $tail += (Get-Content -LiteralPath $log -Tail 30 -ErrorAction SilentlyContinue) -join "`n" }
    }
    $tail = ConvertTo-SafeDiagnosticText $tail
    if ([string]::IsNullOrWhiteSpace($tail)) { $tail = "No application output was captured." }
    Write-ERPRunnerLog $paths "Production Next.js readiness failed: $tail"
    throw "Presentation Mode did not start. No unknown process was stopped. Safe diagnostic logs: $($paths.LogDirectory)"
  }

  if ($managerId -ne [int]$server.Id) {
    throw "The verified Presentation Mode manager did not match the process created by this startup run. The managed server state was retained for safe shutdown."
  }

  if (-not (Wait-ERPLoginRoute $loginUrl)) {
    throw "Presentation Mode is listening, but Login did not return HTTP 200 with the expected page content. Server remains available for diagnosis; no browser was opened. Logs: $($paths.LogDirectory)"
  }

  Start-Process -FilePath $loginUrl -ErrorAction Stop
  Write-Host "UK EXIM ERP Presentation Mode is running. Login page opened: $loginUrl"
  Write-Host "DEV database and Login route verified. TEST mode is disabled."
  Write-ERPRunnerLog $paths "Presentation Mode started; DEV identity and login readiness passed; browser opened."
}
catch {
  $message = ConvertTo-SafeDiagnosticText $_.Exception.Message
  if ($paths) { Write-ERPRunnerLog $paths "Startup failed: $message" }
  Write-Host "UK EXIM ERP could not start: $message" -ForegroundColor Red
  exit 1
}
finally {
  if ($mutex) {
    try { $mutex.ReleaseMutex() } catch { }
    $mutex.Dispose()
  }
}
