$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "runner-common.ps1")

try {
  $paths = Get-ERPProjectPaths
  $state = Read-RunnerState $paths
  if (-not $state) {
    Write-Host "No managed UK EXIM ERP server is recorded. No process was stopped."
    Write-Host "PostgreSQL, if running, was left untouched."
    exit 0
  }
  if ([string]$state.projectRoot -ine $paths.ProjectRoot -or [string]$state.mode -ne "development" -or [bool]$state.testModeDisabled -ne $true) {
    throw "The runner state does not identify this exact development checkout. No process was stopped."
  }

  $processId = [int]$state.processId
  $target = Get-ProcessRecord $processId
  if (-not $target) {
    Remove-Item -LiteralPath $paths.StateFile -Force
    Write-Host "The recorded ERP process is already stopped. Stale runner state was removed."
    Write-Host "PostgreSQL, if running, was left untouched."
    exit 0
  }
  if ([string]$state.nodeExe -ine [string]$target.ExecutablePath -or [string]$state.nextCli -ine $paths.NextCli -or -not (Test-ManagedERPProcess $target $state $paths 3000)) {
    throw "The recorded PID no longer matches this checkout's exact Next.js development process. No process was stopped."
  }

  Write-Host "Requesting a graceful stop for the verified UK EXIM ERP process (PID $processId)."
  & $paths.NodeExe -e 'process.kill(Number(process.argv[1]), "SIGINT")' "$processId" 2>$null
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    $target = Get-ProcessRecord $processId
    if (-not $target) { break }
    if (-not (Test-ManagedERPProcess $target $state $paths 3000)) {
      throw "The recorded process identity changed while stopping. No further process action was taken."
    }
  }

  if ($target) {
    $target = Get-ProcessRecord $processId
    if ($target) {
      if (-not (Test-ManagedERPProcess $target $state $paths 3000)) {
        throw "The recorded process identity changed before the termination fallback. No process was force-stopped."
      }
      & $paths.NodeExe -e 'process.kill(Number(process.argv[1]), "SIGTERM")' "$processId" 2>$null
      for ($attempt = 0; $attempt -lt 10; $attempt++) {
        Start-Sleep -Milliseconds 500
        $target = Get-ProcessRecord $processId
        if (-not $target) { break }
      }
    }
  }

  if ($target) {
    $target = Get-ProcessRecord $processId
    if ($target) {
      if (-not (Test-ManagedERPProcess $target $state $paths 3000)) {
        throw "The recorded process identity changed before the final fallback. No process was force-stopped."
      }
      Stop-Process -Id $processId -Force -ErrorAction Stop
    }
  }

  $deadline = (Get-Date).AddSeconds(5)
  while ((Get-ProcessRecord $processId) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
  if (Get-ProcessRecord $processId) {
    throw "The verified ERP process is still running. Runner state was retained for safe follow-up."
  }
  Remove-Item -LiteralPath $paths.StateFile -Force
  Write-Host "UK EXIM ERP has stopped. PostgreSQL was left running and its data was not touched."
  Write-Host "To stop PostgreSQL separately, use the PostgreSQL 18.6 pg_ctl.exe with: stop -D `"$($paths.DataDirectory)`" -m fast -w"
}
catch {
  Write-Host "UK EXIM ERP stop refused or incomplete: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
