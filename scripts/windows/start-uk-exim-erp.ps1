$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "runner-common.ps1")

try {
  $paths = Get-ERPProjectPaths
  $state = Read-RunnerState $paths
  $loginUrl = "http://127.0.0.1:3000/login"
  $portConnections = @(Get-ListeningConnections 3000)
  $portOwners = @($portConnections | Select-Object -ExpandProperty OwningProcess -Unique)

  if ($portOwners.Count -gt 0) {
    if ($portOwners.Count -eq 1) {
      if (Test-ManagedERPListener ([int]$portOwners[0]) $state $paths 3000) {
        if (@($portConnections | Where-Object { [string]$_.LocalAddress -ne "127.0.0.1" }).Count -gt 0) {
          throw "The managed ERP process has a listener outside 127.0.0.1. No browser was opened and no process was stopped."
        }
        $postgres = Find-PostgreSql18Ctl $paths
        $postgresStarted = Ensure-ApprovedPostgreSql $paths $postgres
        if ($postgresStarted) { Write-Host "Started the existing local PostgreSQL 18.6 DEV instance." }
        if (-not (Wait-ERPLoginRoute $loginUrl)) {
          throw "The managed ERP server is running, but its Login page did not return HTTP 200 with the expected login content. No browser was opened. Logs are preserved under $($paths.RuntimeDirectory)."
        }
        Start-Process -FilePath $loginUrl -ErrorAction Stop
        Write-Host "UK EXIM ERP is already running. Opened the Login page: $loginUrl"
        exit 0
      }
    }
    $ownerSummary = foreach ($ownerId in $portOwners) {
      $owner = Get-ProcessRecord ([int]$ownerId)
      if ($owner) { "$($owner.Name) (PID $ownerId)" } else { "Unknown process (PID $ownerId)" }
    }
    throw "Port 3000 is occupied by $($ownerSummary -join ', '). No process was stopped and the ERP was not started."
  }

  $postgres = Find-PostgreSql18Ctl $paths
  if (Ensure-ApprovedPostgreSql $paths $postgres) {
    Write-Host "Started the existing local PostgreSQL 18.6 DEV instance."
  }
  else {
    Write-Host "The existing local PostgreSQL 18.6 DEV instance is already running."
  }

  $env:NODE_ENV = "development"
  $env:UKEXIM_PRODUCTS_UI_TEST_MODE = "0"
  $env:TEST_DATABASE_URL = $null
  # Better Auth trusts the configured base URL. Match it to this launcher's exact loopback origin.
  $env:BETTER_AUTH_URL = "http://127.0.0.1:3000"
  $env:PORT = "3000"
  $null = New-Item -ItemType Directory -Path $paths.RuntimeDirectory -Force
  $arguments = '"{0}" dev --hostname 127.0.0.1 --port 3000' -f $paths.NextCli
  $server = Start-Process -FilePath $paths.NodeExe -ArgumentList $arguments `
    -WorkingDirectory $paths.ProjectRoot -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $paths.StdoutLog -RedirectStandardError $paths.StderrLog

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    $listeners = @(Get-VerifiedERPNextListenerIds 3000 ([int]$server.Id) $paths)
    if ($listeners.Count -gt 0) {
      $ready = $true
      break
    }
    $server.Refresh()
    if ($server.HasExited) { break }
  }
  if (-not $ready) {
    throw "Next.js did not create a verified listener on 127.0.0.1:3000. No unrelated process was stopped. Logs are preserved under $($paths.RuntimeDirectory)."
  }

  Write-ERPNextRunnerState $paths ([int]$server.Id) $env:BETTER_AUTH_URL

  if (-not (Wait-ERPLoginRoute $loginUrl)) {
    throw "Next.js is listening, but the Login page did not return HTTP 200 with the expected login content. The verified runner state and logs are preserved under $($paths.RuntimeDirectory)."
  }

  Start-Process -FilePath $loginUrl -ErrorAction Stop

  Write-Host "UK EXIM ERP Login page opened: $loginUrl"
  Write-Host "Products UI test mode is explicitly disabled. PostgreSQL was restricted to the existing local DEV data directory."
}
catch {
  Write-Host "UK EXIM ERP startup stopped: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
