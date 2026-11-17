$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "runner-common.ps1")

function Stop-LegacyDevWithOwnerConfirmation($Paths, $State) {
  $connections = @(Get-ListeningConnections 3000)
  if ($connections.Count -eq 0) { return $false }
  $listenerIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
  foreach ($listenerId in $listenerIds) {
    if (-not (Test-ERPNextLegacyDevListenerTree ([int]$listenerId) $Paths 3000)) {
      throw "Port 3000 includes a listener that is not the exact legacy development server from this checkout. No process was stopped."
    }
  }
  $managerIds = @($listenerIds | ForEach-Object { Get-ERPNextLegacyDevManagerProcessId ([int]$_) $Paths 3000 } | Where-Object { $_ } | Select-Object -Unique)
  if ($managerIds.Count -ne 1) { throw "The legacy development manager could not be identified uniquely. No process was stopped." }
  $managerId = [int]$managerIds[0]
  Write-Host "Found this checkout's legacy Next.js development server (manager PID $managerId)."
  Write-Host "Only that verified server will receive a graceful stop request. PostgreSQL will remain running."
  $confirmation = Read-Host 'Type STOP to confirm stopping this exact UK EXIM ERP process'
  if ($confirmation -cne "STOP") { throw "Confirmation was not entered. No process was stopped." }
  $null = Stop-VerifiedLegacyDevForPresentation $listenerIds $State $Paths 3000 -ExplicitOwnerStop
  if ($State -and [string]$State.stateFile) {
    $statePath = [System.IO.Path]::GetFullPath([string]$State.stateFile)
    if ($statePath -ieq [System.IO.Path]::GetFullPath($Paths.StateFile) -or $statePath -ieq [System.IO.Path]::GetFullPath($Paths.PresentationStateFile)) {
      Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
    }
  }
  Write-Host "Verified legacy UK EXIM development server stopped. PostgreSQL was left running."
  return $true
}

try {
  $paths = Get-ERPProjectPaths
  $state = Read-RunnerState $paths
  if (-not $state) {
    if (Stop-LegacyDevWithOwnerConfirmation $paths $null) { exit 0 }
    Write-Host "No managed UK EXIM ERP server is recorded. No process was stopped."
    Write-Host "PostgreSQL, if running, was left untouched."
    exit 0
  }
  if ([string]$state.projectRoot -ine $paths.ProjectRoot -or [string]$state.mode -notin @("development", "production") -or [bool]$state.testModeDisabled -ne $true) {
    throw "The runner state does not identify this exact DEV checkout in a supported mode. No process was stopped."
  }
  $statePath = if ([string]$state.stateFile) { [System.IO.Path]::GetFullPath([string]$state.stateFile) }
    elseif ([string]$state.mode -eq "production") { [System.IO.Path]::GetFullPath($paths.PresentationStateFile) }
    else { [System.IO.Path]::GetFullPath($paths.StateFile) }
  if ($statePath -ine [System.IO.Path]::GetFullPath($paths.StateFile) -and $statePath -ine [System.IO.Path]::GetFullPath($paths.PresentationStateFile)) {
    throw "Runner state points outside the approved local runtime directory. No process was stopped."
  }

  $processId = [int]$state.processId
  $target = Get-ProcessRecord $processId
  if (-not $target) {
    if ([string]$state.mode -eq "production") {
      $null = Stop-VerifiedERPNextProductionListener $paths 3000
      Remove-Item -LiteralPath $statePath -Force
      Write-Host "Verified UK EXIM Presentation server stopped. PostgreSQL was left running."
      exit 0
    }
    if (Stop-LegacyDevWithOwnerConfirmation $paths $state) { exit 0 }
    Remove-Item -LiteralPath $statePath -Force
    Write-Host "The recorded ERP process is already stopped. Stale runner state was removed."
    Write-Host "PostgreSQL, if running, was left untouched."
    exit 0
  }
  if ([string]$state.nodeExe -ine [string]$target.ExecutablePath -or [string]$state.nextCli -ine $paths.NextCli -or -not (Test-ManagedERPProcess $target $state $paths 3000)) {
    if (Stop-LegacyDevWithOwnerConfirmation $paths $state) { exit 0 }
    throw "The recorded PID no longer matches this checkout's exact Next.js process. No process was stopped."
  }

  Write-Host "Requesting a graceful stop for the verified UK EXIM ERP process (PID $processId)."
  Send-ERPProcessSignal $paths $processId 'SIGINT'
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
      Send-ERPProcessSignal $paths $processId 'SIGTERM'
      for ($attempt = 0; $attempt -lt 10; $attempt++) {
        Start-Sleep -Milliseconds 500
        $target = Get-ProcessRecord $processId
        if (-not $target) { break }
      }
    }
  }

  $target = Get-ProcessRecord $processId
  if ($target) {
    if (-not (Test-ManagedERPProcess $target $state $paths 3000)) {
      throw "The recorded process identity changed after graceful stop requests. No further process action was taken."
    }
    throw "The verified ERP process did not stop after SIGINT and SIGTERM. No force termination was attempted; runner state was retained."
  }

  $deadline = (Get-Date).AddSeconds(5)
  while ((Get-ProcessRecord $processId) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
  if (Get-ProcessRecord $processId) {
    throw "The verified ERP process is still running. Runner state was retained for safe follow-up."
  }
  if ([string]$state.mode -eq "production") {
    $remainingListeners = @(Get-VerifiedERPNextProductionListenerIds $paths 3000)
    if ($remainingListeners.Count -gt 0) {
      $null = Stop-VerifiedERPNextProductionListener $paths 3000
      $remainingListeners = @(Get-VerifiedERPNextProductionListenerIds $paths 3000)
    }
  }
  else {
    $remainingListeners = @(Get-ListeningConnections 3000 | Where-Object {
      Test-ERPNextListenerProcessTree ([int]$_.OwningProcess) $paths 3000 "development"
    })
  }
  if ($remainingListeners.Count -gt 0) {
    throw "The manager stopped, but a verified Next.js listener remains. Runner state was retained; no further process was stopped."
  }
  Remove-Item -LiteralPath $statePath -Force
  Write-Host "UK EXIM ERP has stopped. PostgreSQL was left running and its data was not touched."
  Write-Host "To stop PostgreSQL separately, use the PostgreSQL 18.6 pg_ctl.exe with: stop -D `"$($paths.DataDirectory)`" -m fast -w"
}
catch {
  Write-Host "UK EXIM ERP stop refused or incomplete: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
