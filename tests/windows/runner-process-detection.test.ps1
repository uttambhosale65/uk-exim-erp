$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "..\..\scripts\windows\runner-common.ps1")

$script:MockProcessRecords = @{}
function Get-ProcessRecord([int] $ProcessId) {
  return $script:MockProcessRecords[[string]$ProcessId]
}

function Get-ListeningConnections([int] $Port) {
  if ($Port -ne 3000) { return @() }
  return @([pscustomobject]@{ LocalAddress = "127.0.0.1"; LocalPort = 3000; OwningProcess = 118064 })
}

function Assert-True([bool] $Condition, [string] $Message) {
  if (-not $Condition) { throw $Message }
}

function Assert-False([bool] $Condition, [string] $Message) {
  if ($Condition) { throw $Message }
}

$projectRoot = "C:\Users\ADMIN\Documents\UK-EXIM-ERP\uk-exim-erp"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$paths = [pscustomobject]@{
  ProjectRoot = $projectRoot
  NodeExe = $nodeExe
  NextCli = Join-Path $projectRoot "node_modules\next\dist\bin\next"
}
$worker = Join-Path $projectRoot "node_modules\next\dist\server\lib\start-server.js"
$script:MockProcessRecords["117904"] = [pscustomobject]@{
  ProcessId = 117904
  ParentProcessId = 900
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = "`"$nodeExe`" `"$($paths.NextCli)`" dev --hostname 127.0.0.1 --port 3000"
}
$script:MockProcessRecords["118064"] = [pscustomobject]@{
  ProcessId = 118064
  ParentProcessId = 117904
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = "`"$nodeExe`" `"$worker`""
}
$state = [pscustomobject]@{
  projectRoot = $projectRoot
  processId = 999999 # Deliberately unrelated: discovery follows verified ancestry, not a fixed PID.
  port = 3000
  mode = "development"
  testModeDisabled = $true
}

$simulatedPortOwner = @(Get-ListeningConnections 3000 | Select-Object -ExpandProperty OwningProcess -Unique)
Assert-True ($simulatedPortOwner.Count -eq 1 -and $simulatedPortOwner[0] -eq 118064) "The simulated port 3000 listener must resolve to the start-server.js worker PID."
Assert-True (Test-ManagedERPListener ([int]$simulatedPortOwner[0]) $state $paths 3000) "Expected the exact start-server.js listener and verified next dev ancestor to be accepted."

$script:MockProcessRecords["118065"] = [pscustomobject]@{
  ProcessId = 118065
  ParentProcessId = 900
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = "`"$nodeExe`" C:\other-app\server.js"
}
Assert-False (Test-ManagedERPListener 118065 $state $paths 3000) "An unrelated Node listener must be rejected."

$wrongParent = $script:MockProcessRecords["117904"]
$script:MockProcessRecords["117904"] = [pscustomobject]@{
  ProcessId = $wrongParent.ProcessId
  ParentProcessId = $wrongParent.ParentProcessId
  Name = $wrongParent.Name
  ExecutablePath = $wrongParent.ExecutablePath
  CommandLine = "`"$nodeExe`" C:\other-app\node_modules\next\dist\bin\next dev --hostname 127.0.0.1 --port 3000"
}
Assert-False (Test-ManagedERPListener 118064 $state $paths 3000) "A start-server worker with an unrelated Next parent must be rejected."
$script:MockProcessRecords["117904"] = $wrongParent

$testModeState = [pscustomobject]@{
  projectRoot = $projectRoot
  processId = 117904
  port = 3000
  mode = "development"
  testModeDisabled = $false
}
Assert-False (Test-ManagedERPListener 118064 $testModeState $paths 3000) "A process without the TEST-mode-disabled state marker must be rejected."

Write-Output "Next.js existing-server process detection tests: PASS"
