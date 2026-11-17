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
  NpmCli = "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"
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

# Production Presentation Mode has its own exact CLI/worker lineage.
$script:MockProcessRecords["217904"] = [pscustomobject]@{
  ProcessId = 217904
  ParentProcessId = 700
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = "`"$nodeExe`" `"$($paths.NextCli)`" start --hostname 127.0.0.1 --port 3000"
}
$script:MockProcessRecords["218064"] = [pscustomobject]@{
  ProcessId = 218064
  ParentProcessId = 217904
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = "`"$nodeExe`" `"$worker`""
}
$prodState = [pscustomobject]@{
  projectRoot = $projectRoot
  processId = 217904
  port = 3000
  mode = "production"
  testModeDisabled = $true
}
Assert-True (Test-ManagedERPListener 218064 $prodState $paths 3000) "The Presentation Mode worker and exact production Next CLI ancestor must be accepted."
Assert-True ((Get-ERPNextListenerMode 218064 $paths 3000) -eq "production") "The listener must be classified as Presentation Mode."
Assert-True ((Get-ERPNextManagerProcessId 218064 $paths 3000 "production") -eq 217904) "The exact production Next CLI PID must be identified as the stop manager."
Assert-False (Test-ManagedERPListener 218064 $state $paths 3000) "A production worker must not be accepted under development runner state."

# Windows npm.cmd inserts cmd.exe between the npm process and Next's node
# process. The exact Presentation host + npm CLI + command wrapper must be
# verified together before the manager is accepted or signalled.
$script:MockProcessRecords["410000"] = [pscustomobject]@{
  ProcessId = 410000
  ParentProcessId = 400
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = "`"$nodeExe`" `"$projectRoot\scripts\windows\next-presentation-host.mjs`" `"$($paths.NpmCli)`""
}
$script:MockProcessRecords["410001"] = [pscustomobject]@{
  ProcessId = 410001
  ParentProcessId = 410000
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = "`"$nodeExe`" `"$($paths.NpmCli)`" run start"
}
$script:MockProcessRecords["410002"] = [pscustomobject]@{
  ProcessId = 410002
  ParentProcessId = 410001
  Name = "cmd.exe"
  ExecutablePath = Join-Path $env:WINDIR "System32\cmd.exe"
  CommandLine = "$env:WINDIR\system32\cmd.exe /d /s /c next start --hostname 127.0.0.1 --port 3000"
}
$script:MockProcessRecords["410003"] = [pscustomobject]@{
  ProcessId = 410003
  ParentProcessId = 410002
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = "`"$nodeExe`" `"$worker`""
}
$presentationState = [pscustomobject]@{
  projectRoot = $projectRoot
  processId = 410000
  port = 3000
  mode = "production"
  testModeDisabled = $true
}
Assert-True (Test-ERPNextListenerProcessTree 410003 $paths 3000 "production") "The exact Presentation host, npm CLI, cmd.exe wrapper and worker chain must be accepted."
Assert-True ((Get-ERPNextListenerMode 410003 $paths 3000) -eq "production") "The wrapped listener must be classified as Presentation Mode."
Assert-True ((Get-ERPNextManagerProcessId 410003 $paths 3000 "production") -eq 410000) "The Presentation host must be selected as the graceful-stop manager."
Assert-True (Test-ManagedERPProcess $script:MockProcessRecords["410000"] $presentationState $paths 3000) "A state-recorded exact Presentation host must pass managed-process verification."
Assert-True (Test-ERPNextProcessDescendant 410003 410000 $paths 3000 "production") "The verified listener must be tied to its Presentation host for safe stop checks."
$script:MockProcessRecords["410002"].CommandLine = "$env:WINDIR\system32\cmd.exe /d /s /c next start --hostname 192.0.2.1 --port 3000"
Assert-False (Test-ERPNextListenerProcessTree 410003 $paths 3000 "production") "A Presentation wrapper bound to a remote address must be rejected."
$script:MockProcessRecords["410002"].CommandLine = "$env:WINDIR\system32\cmd.exe /d /s /c next start --hostname 127.0.0.1 --port 3001"
Assert-False (Test-ERPNextListenerProcessTree 410003 $paths 3000 "production") "A Presentation wrapper on another port must be rejected."
$script:MockProcessRecords["410002"].CommandLine = "$env:WINDIR\system32\cmd.exe /d /s /c next start --hostname 127.0.0.1 --port 3000"
$script:MockProcessRecords["410000"].CommandLine = "`"$nodeExe`" C:\other-app\scripts\windows\next-presentation-host.mjs `"$($paths.NpmCli)`""
Assert-False (Test-ERPNextListenerProcessTree 410003 $paths 3000 "production") "A Presentation host from another checkout must be rejected."
$script:MockProcessRecords["410000"].CommandLine = "`"$nodeExe`" `"$projectRoot\scripts\windows\next-presentation-host.mjs`" `"$($paths.NpmCli)`""

# The Windows npm shim may express the Next CLI through node_modules\.bin\..\next.
$shimCommand = "`"$nodeExe`" `"$projectRoot\node_modules\.bin\\..\next\dist\bin\next`" start --hostname 127.0.0.1 --port 3000"
$script:MockProcessRecords["410004"] = [pscustomobject]@{
  ProcessId = 410004
  ParentProcessId = 400
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = $shimCommand
}
Assert-True (Test-ERPNextProcess $script:MockProcessRecords["410004"] $paths 3000 "production") "The exact checkout's normalized .bin\\..\\next path must be accepted."

$script:MockProcessRecords["218065"] = [pscustomobject]@{
  ProcessId = 218065
  ParentProcessId = 217904
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = "`"$nodeExe`" C:\other-checkout\node_modules\next\dist\server\lib\start-server.js"
}
Assert-False (Test-ManagedERPListener 218065 $prodState $paths 3000) "A worker from another checkout must be rejected."

# Older npm-run-dev instances use the project's node_modules\.bin shim and may
# omit explicit host/port arguments. Recognize that exact tree for safe upgrade.
$legacyCommand = "`"$nodeExe`" `"$projectRoot\node_modules\.bin\\..\next\dist\bin\next`" dev"
$script:MockProcessRecords["310100"] = [pscustomobject]@{
  ProcessId = 310100
  ParentProcessId = 900
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = $legacyCommand
}
$script:MockProcessRecords["310101"] = [pscustomobject]@{
  ProcessId = 310101
  ParentProcessId = 310100
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = "`"$nodeExe`" `"$worker`""
}
Assert-True (Test-ERPNextLegacyDevListenerTree 310101 $paths 3000) "The exact project's legacy npm-run-dev process tree must be recognized for protected transition."
Assert-True ((Get-ERPNextLegacyDevManagerProcessId 310101 $paths 3000) -eq 310100) "The legacy Next development manager PID must be resolved through exact lineage."
$script:MockProcessRecords["310102"] = [pscustomobject]@{
  ProcessId = 310102
  ParentProcessId = 900
  Name = "node.exe"
  ExecutablePath = $nodeExe
  CommandLine = '"C:\other-app\node_modules\.bin\..\next\dist\bin\next" dev'
}
Assert-False (Test-ERPNextLegacyDevManager $script:MockProcessRecords["310102"] $paths 3000) "A same-named Next process from another checkout must not be treated as owned."

Write-Output "Presentation Mode process detection tests: PASS"
