$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "..\..\scripts\windows\runner-common.ps1")

function Assert-Equal($Expected, $Actual, [string] $Message) {
  if ($Expected -ne $Actual) { throw "$Message Expected '$Expected', received '$Actual'." }
}

function Assert-Throws([scriptblock] $Action, [string] $ExpectedText) {
  try { & $Action; throw "Expected an error containing '$ExpectedText'." }
  catch {
    if ($_.Exception.Message -notlike "*$ExpectedText*") { throw }
  }
}

# Mock the Windows cmdlet to prove that a successful API response is preferred.
function Get-NetTCPConnection {
  return [pscustomobject]@{ LocalAddress = "127.0.0.1"; LocalPort = 3000; OwningProcess = 4321 }
}
$connections = @(Get-ListeningConnections 3000)
Assert-Equal 4321 $connections[0].OwningProcess "Get-NetTCPConnection owner"

# Force the fallback and supply synthetic netstat output; no real port is queried.
function Get-NetTCPConnection { throw "mock CIM failure" }
function Invoke-NetstatOutput {
  return @(
    "Active Connections",
    "  Proto  Local Address          Foreign Address        State           PID",
    "  TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       9876",
    "  TCP    [::1]:3000             [::]:0                 LISTENING       9877"
  )
}
$connections = @(Get-ListeningConnections 3000)
Assert-Equal 2 $connections.Count "Fallback listener count"
Assert-Equal "127.0.0.1" $connections[0].LocalAddress "Fallback IPv4 address"
Assert-Equal 9876 $connections[0].OwningProcess "Fallback IPv4 owner"
Assert-Equal "::1" $connections[1].LocalAddress "Fallback IPv6 address"
Assert-Equal 9877 $connections[1].OwningProcess "Fallback IPv6 owner"

# A successful fallback with no listener means the port is free.
function Invoke-NetstatOutput { return @("Active Connections", "  Proto  Local Address          Foreign Address        State           PID") }
$connections = @(Get-ListeningConnections 3000)
Assert-Equal 0 $connections.Count "No-listener result"

# A listener without a PID cannot be treated as free.
function Invoke-NetstatOutput {
  return @("TCP 127.0.0.1:3000 0.0.0.0:0 LISTENING")
}
Assert-Throws { Get-ListeningConnections 3000 } "without a valid owning PID"

# Mock a parent-child Node process tree for Next.js readiness verification.
$mockPaths = [pscustomobject]@{
  NodeExe = "C:\Node\node.exe"
  NextCli = "C:\ERP\node_modules\next\dist\bin\next"
}
$mockProcesses = @{
  "100" = [pscustomobject]@{ ProcessId = 100; ParentProcessId = 10; Name = "node.exe"; ExecutablePath = $mockPaths.NodeExe; CommandLine = '"C:\Node\node.exe" "C:\ERP\node_modules\next\dist\bin\next" dev --hostname 127.0.0.1 --port 3000' }
  "200" = [pscustomobject]@{ ProcessId = 200; ParentProcessId = 100; Name = "node.exe"; ExecutablePath = $mockPaths.NodeExe; CommandLine = '"C:\Node\node.exe" next-server' }
  "300" = [pscustomobject]@{ ProcessId = 300; ParentProcessId = 10; Name = "node.exe"; ExecutablePath = $mockPaths.NodeExe; CommandLine = 'unrelated node process' }
}
function Get-ProcessRecord([int] $ProcessId) { return $mockProcesses[[string]$ProcessId] }
if (-not (Test-ERPNextProcessDescendant 200 100 $mockPaths 3000)) { throw "Next child process was not accepted." }
if (Test-ERPNextProcessDescendant 300 100 $mockPaths 3000) { throw "Unrelated process was incorrectly accepted." }
function Get-ListeningConnections([int] $Port) {
  return @([pscustomobject]@{ LocalAddress = "127.0.0.1"; LocalPort = $Port; OwningProcess = 200 })
}
$verifiedIds = @(Get-VerifiedERPNextListenerIds 3000 100 $mockPaths)
Assert-Equal 200 $verifiedIds[0] "Verified listener PID"
function Get-ListeningConnections([int] $Port) {
  return @([pscustomobject]@{ LocalAddress = "127.0.0.1"; LocalPort = $Port; OwningProcess = 300 })
}
Assert-Throws { Get-VerifiedERPNextListenerIds 3000 100 $mockPaths } "could not be verified as part of this checkout's Next.js process tree"

Write-Output "Port inspection and readiness mocked tests passed (8 scenarios)."
