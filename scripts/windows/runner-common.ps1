function Get-ERPProjectPaths {
  $root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
  $nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $nodeCommand) {
    throw "Node.js was not found on PATH. The ERP was not started."
  }

  $nextCli = Join-Path $root "node_modules\next\dist\bin\next"
  if (-not (Test-Path -LiteralPath $nextCli -PathType Leaf)) {
    throw "The repository-local Next.js CLI is missing. Install the project dependencies before starting the ERP."
  }

  $rootBytes = [System.Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant())
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $rootHash = [System.BitConverter]::ToString($sha.ComputeHash($rootBytes)).Replace("-", "").Substring(0, 12)
  }
  finally {
    $sha.Dispose()
  }

  $runtimeDirectory = Join-Path $env:TEMP "UK-EXIM-ERP-$rootHash"
  return [pscustomobject]@{
    ProjectRoot = $root
    NodeExe = [System.IO.Path]::GetFullPath($nodeCommand.Source)
    NextCli = [System.IO.Path]::GetFullPath($nextCli)
    PostgreSqlBinDirectory = Join-Path $env:USERPROFILE "Downloads\postgresql-18.6-5-windows-x64-binaries\pgsql\bin"
    DataDirectory = Join-Path $env:LOCALAPPDATA "UKEXIM-ERP\PostgreSQL\data"
    RuntimeDirectory = $runtimeDirectory
    StateFile = Join-Path $runtimeDirectory "next-dev.json"
    StdoutLog = Join-Path $runtimeDirectory "next-dev.stdout.log"
    StderrLog = Join-Path $runtimeDirectory "next-dev.stderr.log"
    PostgreSqlLog = Join-Path $runtimeDirectory "postgresql.log"
  }
}

function Invoke-NetstatOutput {
  $netstatExe = Join-Path $env:SystemRoot "System32\netstat.exe"
  if (-not (Test-Path -LiteralPath $netstatExe -PathType Leaf)) {
    throw "Windows netstat.exe was not found."
  }
  $output = @(& $netstatExe -ano -p tcp 2>&1)
  if ($LASTEXITCODE -ne 0) {
    throw "netstat.exe returned exit code $LASTEXITCODE."
  }
  return $output
}

function ConvertFrom-NetstatListeningOutput([string[]] $Lines, [int] $Port) {
  $connections = @()
  $knownTcpStates = @("ESTABLISHED", "SYN_SENT", "SYN_RECEIVED", "FIN_WAIT_1", "FIN_WAIT_2", "CLOSE_WAIT", "CLOSED", "CLOSING", "LAST_ACK", "TIME_WAIT", "LISTENING")
  foreach ($line in $Lines) {
    $columns = ([string]$line).Trim() -split "\s+"
    if ($columns.Count -lt 4 -or $columns[0] -ine "TCP") { continue }
    if ($columns[1] -notmatch "^(?<address>.+):(?<port>\d+)$") { continue }
    if ([int]$Matches.port -ne $Port) { continue }
    $stateIndex = 3
    if ($columns[$stateIndex] -notin $knownTcpStates) {
      throw "netstat returned an unrecognized TCP state for local port $Port; ownership could not be established."
    }
    if ($columns[$stateIndex] -ne "LISTENING") { continue }
    $processId = 0
    if ($columns.Count -lt 5 -or -not [int]::TryParse($columns[4], [ref]$processId) -or $processId -le 0) {
      throw "netstat reported a listener on port $Port without a valid owning PID."
    }
    $localAddress = $Matches.address
    if ($localAddress.StartsWith("[") -and $localAddress.EndsWith("]")) {
      $localAddress = $localAddress.Substring(1, $localAddress.Length - 2)
    }
    $connections += [pscustomobject]@{
      LocalAddress = $localAddress
      LocalPort = $Port
      OwningProcess = $processId
    }
  }
  return $connections
}

function Get-NetstatListeningConnections([int] $Port) {
  return @(ConvertFrom-NetstatListeningOutput (Invoke-NetstatOutput) $Port)
}

function Get-ListeningConnections([int] $Port) {
  $netTcpError = $null
  try {
    return @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
  }
  catch {
    $netTcpError = $_.Exception.Message
  }
  try {
    return @(Get-NetstatListeningConnections $Port)
  }
  catch {
    throw "Could not safely inspect TCP port $Port. Get-NetTCPConnection failed ($netTcpError); netstat fallback failed ($($_.Exception.Message)). No process was started or stopped."
  }
}

function Get-ListeningProcessIds([int] $Port) {
  return @(Get-ListeningConnections $Port | Select-Object -ExpandProperty OwningProcess -Unique)
}

function Get-ProcessRecord([int] $ProcessId) {
  return Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
}

function Test-ERPNextProcess($ProcessRecord, $Paths, [int] $Port = 3000) {
  if (-not $ProcessRecord -or $ProcessRecord.Name -ine "node.exe") { return $false }
  if ([System.IO.Path]::GetFullPath($ProcessRecord.ExecutablePath) -ine $Paths.NodeExe) { return $false }
  $commandLine = [string]$ProcessRecord.CommandLine
  if ($commandLine.IndexOf($Paths.NextCli, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) { return $false }
  if ($commandLine -notmatch "(^|\s)dev(\s|$)") { return $false }
  if ($commandLine -notmatch "--hostname\s+127\.0\.0\.1") { return $false }
  if ($commandLine -notmatch "--port\s+$Port(\s|$)") { return $false }
  return $true
}

function Test-ERPNextServerWorker($ProcessRecord, $Paths) {
  if (-not $ProcessRecord -or $ProcessRecord.Name -ine "node.exe") { return $false }
  if ([System.IO.Path]::GetFullPath([string]$ProcessRecord.ExecutablePath) -ine $Paths.NodeExe) { return $false }
  $workerScript = [System.IO.Path]::GetFullPath((Join-Path $Paths.ProjectRoot "node_modules\next\dist\server\lib\start-server.js"))
  $commandLine = [string]$ProcessRecord.CommandLine
  if ($commandLine.IndexOf($Paths.ProjectRoot, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) { return $false }
  if ($commandLine.IndexOf($workerScript, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) { return $false }
  return $true
}

function Test-ERPNextListenerProcessTree([int] $ListenerProcessId, $Paths, [int] $Port = 3000) {
  $listener = Get-ProcessRecord $ListenerProcessId
  if (-not $listener -or $listener.Name -ine "node.exe") { return $false }
  if ([System.IO.Path]::GetFullPath([string]$listener.ExecutablePath) -ine $Paths.NodeExe) { return $false }

  if (Test-ERPNextProcess $listener $Paths $Port) { return $true }
  if (-not (Test-ERPNextServerWorker $listener $Paths)) { return $false }

  $currentId = [int]$listener.ParentProcessId
  $visited = @{}
  for ($depth = 0; $depth -lt 32 -and $currentId -gt 0; $depth++) {
    if ($visited.ContainsKey([string]$currentId)) { return $false }
    $visited[[string]$currentId] = $true
    $current = Get-ProcessRecord $currentId
    if (-not $current) { return $false }
    if (Test-ERPNextProcess $current $Paths $Port) { return $true }
    if ($current.Name -ine "node.exe" -or [System.IO.Path]::GetFullPath([string]$current.ExecutablePath) -ine $Paths.NodeExe) { return $false }
    $currentId = [int]$current.ParentProcessId
  }
  return $false
}

function Test-ERPNextProcessDescendant([int] $ProcessId, [int] $StartedProcessId, $Paths, [int] $Port = 3000) {
  $startedProcess = Get-ProcessRecord $StartedProcessId
  if (-not (Test-ERPNextProcess $startedProcess $Paths $Port)) { return $false }

  $currentId = $ProcessId
  $visited = @{}
  for ($depth = 0; $depth -lt 32; $depth++) {
    if ($currentId -eq $StartedProcessId) { return $true }
    if ($visited.ContainsKey([string]$currentId)) { return $false }
    $visited[[string]$currentId] = $true
    $current = Get-ProcessRecord $currentId
    if (-not $current -or $current.Name -ine "node.exe") { return $false }
    if ([System.IO.Path]::GetFullPath([string]$current.ExecutablePath) -ine $Paths.NodeExe) { return $false }
    $parentId = [int]$current.ParentProcessId
    if ($parentId -le 0) { return $false }
    $currentId = $parentId
  }
  return $false
}

function Get-VerifiedERPNextListenerIds([int] $Port, [int] $StartedProcessId, $Paths) {
  $connections = @(Get-ListeningConnections $Port)
  if ($connections.Count -eq 0) { return @() }
  if (@($connections | Where-Object { [string]$_.LocalAddress -ne "127.0.0.1" }).Count -gt 0) {
    throw "Port $Port has a listener outside 127.0.0.1. The ERP process identity could not be safely confirmed. No process was stopped."
  }

  $processIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
  foreach ($listenerId in $processIds) {
    if (-not (Test-ERPNextProcessDescendant ([int]$listenerId) $StartedProcessId $Paths $Port)) {
      throw "Port $Port listener PID $listenerId could not be verified as part of this checkout's Next.js process tree. No process was stopped."
    }
  }
  return $processIds
}

function Test-ERPLoginRoute([string] $Uri) {
  $request = [System.Net.HttpWebRequest]::Create($Uri)
  $request.Method = "GET"
  $request.AllowAutoRedirect = $false
  $request.Timeout = 2500
  $request.ReadWriteTimeout = 2500
  $request.UserAgent = "UK-EXIM-ERP-Local-Launcher/1.0"
  $response = $null
  $reader = $null
  try {
    $response = [System.Net.HttpWebResponse]$request.GetResponse()
    if ([int]$response.StatusCode -ne 200) { return $false }
    $reader = [System.IO.StreamReader]::new($response.GetResponseStream())
    $html = $reader.ReadToEnd()
    return $html -match "Sign in to your account"
  }
  catch [System.Net.WebException] {
    if ($_.Exception.Response) { $_.Exception.Response.Close() }
    return $false
  }
  catch {
    return $false
  }
  finally {
    if ($reader) { $reader.Dispose() }
    if ($response) { $response.Dispose() }
  }
}

function Wait-ERPLoginRoute([string] $Uri, [int] $TimeoutSeconds = 90) {
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  while ([DateTime]::UtcNow -lt $deadline) {
    if (Test-ERPLoginRoute $Uri) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Write-ERPNextRunnerState($Paths, [int] $ProcessId, [string] $AuthBaseUrl) {
  [pscustomobject]@{
    projectRoot = $Paths.ProjectRoot
    processId = $ProcessId
    nodeExe = $Paths.NodeExe
    nextCli = $Paths.NextCli
    port = 3000
    mode = "development"
    testModeDisabled = $true
    authBaseUrl = $AuthBaseUrl
    startedAtUtc = [DateTime]::UtcNow.ToString("o")
  } | ConvertTo-Json | Set-Content -LiteralPath $Paths.StateFile -Encoding UTF8
}

function Read-RunnerState($Paths) {
  if (-not (Test-Path -LiteralPath $Paths.StateFile -PathType Leaf)) { return $null }
  try {
    return Get-Content -LiteralPath $Paths.StateFile -Raw | ConvertFrom-Json -ErrorAction Stop
  }
  catch {
    throw "The local ERP runner state file is invalid. No process was stopped."
  }
}

function Test-ManagedERPProcess($ProcessRecord, $State, $Paths, [int] $Port = 3000) {
  if (-not $State) { return $false }
  if ([string]$State.projectRoot -ine $Paths.ProjectRoot -or [int]$State.port -ne $Port -or [string]$State.mode -ne "development" -or [bool]$State.testModeDisabled -ne $true -or [int]$State.processId -ne [int]$ProcessRecord.ProcessId) {
    return $false
  }
  return Test-ERPNextProcess $ProcessRecord $Paths $Port
}

function Test-ManagedERPListener($ListenerProcessId, $State, $Paths, [int] $Port = 3000) {
  if (-not $State -or [string]$State.projectRoot -ine $Paths.ProjectRoot -or [int]$State.port -ne $Port -or [string]$State.mode -ne "development" -or [bool]$State.testModeDisabled -ne $true) {
    return $false
  }
  return Test-ERPNextListenerProcessTree ([int]$ListenerProcessId) $Paths $Port
}

function Find-PostgreSql18Ctl($Paths) {
  $candidate = Join-Path $Paths.PostgreSqlBinDirectory "pg_ctl.exe"
  $postgresExe = Join-Path $Paths.PostgreSqlBinDirectory "postgres.exe"
  if (-not (Test-Path -LiteralPath $candidate -PathType Leaf) -or -not (Test-Path -LiteralPath $postgresExe -PathType Leaf)) {
    throw "The approved PostgreSQL 18.6 binaries are missing from the configured local installation directory. The ERP was not started."
  }

  $versionOutput = (& $candidate --version 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $versionOutput -notmatch "PostgreSQL\) 18\.6(\s|$)") {
    throw "The approved pg_ctl.exe did not report PostgreSQL 18.6. The ERP was not started."
  }
  return [pscustomobject]@{
    PgCtl = [System.IO.Path]::GetFullPath($candidate)
    PostgresExe = [System.IO.Path]::GetFullPath($postgresExe)
  }
}

function Get-PostgreSqlPostmasterPid($Paths) {
  $pidFile = Join-Path $Paths.DataDirectory "postmaster.pid"
  if (-not (Test-Path -LiteralPath $pidFile -PathType Leaf)) { return $null }
  try {
    $firstLine = (Get-Content -LiteralPath $pidFile -TotalCount 1 -ErrorAction Stop).Trim()
    $parsedPid = 0
    if ([int]::TryParse($firstLine, [ref]$parsedPid) -and $parsedPid -gt 0) { return $parsedPid }
  }
  catch {
    throw "Could not verify the PostgreSQL PID file for the approved DEV data directory."
  }
  throw "The PostgreSQL PID file in the approved DEV data directory is invalid."
}

function Test-ApprovedPostgreSqlInstance($Paths, $PostgreSql) {
  $dataVersionFile = Join-Path $Paths.DataDirectory "PG_VERSION"
  if (-not (Test-Path -LiteralPath $Paths.DataDirectory -PathType Container) -or -not (Test-Path -LiteralPath $dataVersionFile -PathType Leaf)) {
    throw "The existing local DEV PostgreSQL data directory is unavailable; no other data directory will be used."
  }
  $dataVersion = (Get-Content -LiteralPath $dataVersionFile -TotalCount 1 -ErrorAction Stop).Trim()
  if ($dataVersion -ne "18") {
    throw "The approved DEV data directory is not PostgreSQL major version 18. No other cluster will be used."
  }

  $null = & $PostgreSql.PgCtl status -D $Paths.DataDirectory 2>$null
  $statusCode = $LASTEXITCODE
  if ($statusCode -eq 3) {
    if (@(Get-ListeningProcessIds 5432).Count -gt 0) {
      throw "Port 5432 is occupied while the approved DEV PostgreSQL data directory is stopped. No process was started or stopped."
    }
    return $false
  }
  if ($statusCode -ne 0) {
    throw "pg_ctl could not establish the state of the approved DEV data directory. No process was started or stopped."
  }

  $postmasterPid = Get-PostgreSqlPostmasterPid $Paths
  if (-not $postmasterPid) { throw "PostgreSQL reports running, but its expected data-directory PID file is missing." }
  $listeners = @(Get-ListeningConnections 5432)
  if ($listeners.Count -eq 0 -or @($listeners | Where-Object { [int]$_.OwningProcess -ne $postmasterPid }).Count -gt 0) {
    throw "Port 5432 is not exclusively owned by the approved PostgreSQL data directory. No changes were made."
  }
  if (@($listeners | Where-Object { [string]$_.LocalAddress -ne "127.0.0.1" }).Count -gt 0) {
    throw "The approved PostgreSQL instance is listening outside 127.0.0.1. No changes were made."
  }
  $processRecord = Get-ProcessRecord $postmasterPid
  if (-not $processRecord -or $processRecord.Name -ine "postgres.exe" -or [System.IO.Path]::GetFullPath($processRecord.ExecutablePath) -ine $PostgreSql.PostgresExe) {
    throw "Port 5432 could not be tied to PostgreSQL 18.6 from the approved DEV data directory."
  }
  return $true
}

function Ensure-ApprovedPostgreSql($Paths, $PostgreSql) {
  if (Test-ApprovedPostgreSqlInstance $Paths $PostgreSql) { return $false }
  $null = New-Item -ItemType Directory -Path $Paths.RuntimeDirectory -Force
  $null = & $PostgreSql.PgCtl start -D $Paths.DataDirectory -o "-h 127.0.0.1 -p 5432" -w -t 30 -l $Paths.PostgreSqlLog 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL could not be started from the approved DEV data directory. No alternate cluster was attempted."
  }
  if (-not (Test-ApprovedPostgreSqlInstance $Paths $PostgreSql)) {
    throw "PostgreSQL did not become available on 127.0.0.1:5432 from the approved DEV data directory."
  }
  return $true
}
