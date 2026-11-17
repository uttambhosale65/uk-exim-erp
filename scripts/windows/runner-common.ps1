function Get-ERPProjectPaths {
  $root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
  $expectedRoot = [System.IO.Path]::GetFullPath((Join-Path $env:USERPROFILE "Documents\UK-EXIM-ERP\uk-exim-erp"))
  if ($root -ine $expectedRoot) {
    throw "The launcher is not running from the approved UK EXIM ERP checkout. No server or database was started."
  }
  $nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  $npmCommand = Get-Command npm.cmd -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $nodeCommand) {
    throw "Node.js was not found on PATH. The ERP was not started."
  }
  if (-not $npmCommand) { throw "npm was not found on PATH. The ERP was not started." }

  $nextCli = Join-Path $root "node_modules\next\dist\bin\next"
  if (-not (Test-Path -LiteralPath $nextCli -PathType Leaf)) {
    throw "The repository-local Next.js CLI is missing. Install the project dependencies before starting the ERP."
  }
  $npmCli = Join-Path (Split-Path -Parent $npmCommand.Source) "node_modules\npm\bin\npm-cli.js"
  if (-not (Test-Path -LiteralPath $npmCli -PathType Leaf)) {
    throw "The npm command-line runtime is missing. The ERP was not started."
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
  $logDirectory = Join-Path $env:LOCALAPPDATA "UKEXIM-ERP\logs"
  $runId = "{0}_{1}" -f (Get-Date -Format "yyyyMMdd_HHmmss"), ([Guid]::NewGuid().ToString("N").Substring(0, 8))
  return [pscustomobject]@{
    ProjectRoot = $root
    NodeExe = [System.IO.Path]::GetFullPath($nodeCommand.Source)
    NpmCommand = [System.IO.Path]::GetFullPath($npmCommand.Source)
    NpmCli = [System.IO.Path]::GetFullPath($npmCli)
    NextCli = [System.IO.Path]::GetFullPath($nextCli)
    PostgreSqlBinDirectory = Join-Path $env:USERPROFILE "Downloads\postgresql-18.6-5-windows-x64-binaries\pgsql\bin"
    DataDirectory = Join-Path $env:LOCALAPPDATA "UKEXIM-ERP\PostgreSQL\data"
    RuntimeDirectory = $runtimeDirectory
    LogDirectory = $logDirectory
    StateFile = Join-Path $runtimeDirectory "next-dev.json"
    PresentationStateFile = Join-Path $runtimeDirectory "next-presentation.json"
    RunnerLog = Join-Path $logDirectory "launcher-$runId.log"
    StdoutLog = Join-Path $logDirectory "next-presentation-$runId.stdout.log"
    StderrLog = Join-Path $logDirectory "next-presentation-$runId.stderr.log"
    PostgreSqlLog = Join-Path $logDirectory "postgresql-start-$runId.log"
    PostgreSqlCtlStdoutLog = Join-Path $logDirectory "pg_ctl-$runId.stdout.log"
    PostgreSqlCtlStderrLog = Join-Path $logDirectory "pg_ctl-$runId.stderr.log"
    RunId = $runId
    RootHash = $rootHash
    PresentationBuildDirectory = Join-Path $root ".next-presentation"
    PresentationBuildId = Join-Path $root ".next-presentation\BUILD_ID"
  }
}

function ConvertTo-SafeDiagnosticText([string] $Text) {
  if ($null -eq $Text) { return "" }
  $safe = $Text
  $safe = $safe -replace '(?i)(DATABASE_URL|TEST_DATABASE_URL|BETTER_AUTH_SECRET)\s*[:=]\s*[^\s,;]+', '$1=[REDACTED]'
  $safe = $safe -replace '(?i)postgres(?:ql)?://[^\s"''<>]+', '[REDACTED POSTGRESQL URL]'
  $safe = $safe -replace '(?i)(password|token|secret|cookie|authorization)\s*[:=]\s*["'']?[^\s,"''<>]+', '$1=[REDACTED]'
  $safe = $safe -replace '(?i)([?&](?:password|token|secret|code|session)=)[^&\s"''<>]+', '$1[REDACTED]'
  return $safe
}

function Write-ERPRunnerLog($Paths, [string] $Message) {
  $null = New-Item -ItemType Directory -Path $Paths.LogDirectory -Force
  $safeMessage = ConvertTo-SafeDiagnosticText $Message
  $line = "{0} {1}{2}" -f [DateTime]::Now.ToString("yyyy-MM-dd HH:mm:ss"), $safeMessage, [Environment]::NewLine
  [System.IO.File]::AppendAllText($Paths.RunnerLog, $line, [System.Text.Encoding]::UTF8)
}

function Invoke-ERPnpmScript($Paths, [string] $ScriptName) {
  if ($ScriptName -notin @("build", "start", "db:check")) { throw "The requested npm script is not allowed by the ERP launcher." }
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $Paths.NodeExe
  $startInfo.Arguments = '"{0}" run {1}' -f $Paths.NpmCli, $ScriptName
  $startInfo.WorkingDirectory = $Paths.ProjectRoot
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo
  if (-not $process.Start()) { throw "npm run $ScriptName could not be started." }
  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  $process.WaitForExit()
  $output = @($stdoutTask.GetAwaiter().GetResult(), $stderrTask.GetAwaiter().GetResult()) -join [Environment]::NewLine
  $safeOutput = ConvertTo-SafeDiagnosticText $output
  foreach ($line in ($safeOutput -split "`r?`n")) {
    if (-not [string]::IsNullOrWhiteSpace($line)) { Write-ERPRunnerLog $Paths "npm run $ScriptName`: $line" }
  }
  return [pscustomobject]@{ ExitCode = $process.ExitCode; Output = $safeOutput }
}

function Test-ERPProductionBuildFresh($Paths) {
  if (-not (Test-Path -LiteralPath $Paths.PresentationBuildId -PathType Leaf)) { return $false }
  $buildTime = (Get-Item -LiteralPath $Paths.PresentationBuildId).LastWriteTimeUtc
  $inputs = @("app", "public") | ForEach-Object { Join-Path $Paths.ProjectRoot $_ }
  $inputs += @(
    "next.config.ts", "package.json", "package-lock.json", "postcss.config.mjs", "tsconfig.json",
    ".env.local", "node_modules\next\package.json", "node_modules\react\package.json",
    "node_modules\better-auth\package.json", "node_modules\pg\package.json"
  ) | ForEach-Object { Join-Path $Paths.ProjectRoot $_ }
  $files = @()
  foreach ($input in $inputs) {
    if (-not (Test-Path -LiteralPath $input)) { continue }
    $item = Get-Item -LiteralPath $input
    if ($item.PSIsContainer) { $files += @(Get-ChildItem -LiteralPath $input -File -Recurse -ErrorAction Stop) }
    else { $files += $item }
  }
  foreach ($file in $files) {
    if ($file.LastWriteTimeUtc -gt $buildTime) { return $false }
  }
  return $true
}

function Set-ERPPresentationEnvironment {
  $env:NODE_ENV = "production"
  $env:UKEXIM_PRESENTATION_MODE = "1"
  $env:UKEXIM_PRODUCTS_UI_TEST_MODE = "0"
  $env:UKEXIM_E2E_DISPOSABLE_MODE = "0"
  $env:UKEXIM_AUTH_CHECK_BUILD = "0"
  $env:DATABASE_URL = $null
  $env:TEST_DATABASE_URL = $null
  $env:UKEXIM_E2E_RUN_ID = $null
  $env:UKEXIM_AUTH_CHECK_BUILD_ID = $null
  $env:BETTER_AUTH_URL = "http://localhost:3000"
  $env:PORT = "3000"
  $env:HOSTNAME = "127.0.0.1"
  $env:NEXT_TELEMETRY_DISABLED = "1"
}

function Test-ERPDevDatabase($Paths) {
  $check = Invoke-ERPnpmScript $Paths "db:check"
  if ($check.ExitCode -ne 0 -or $check.Output -notmatch "Connected to uk_exim_erp_dev on 127\.0\.0\.1:5432 \(PostgreSQL 18\.6\)") {
    throw "The PostgreSQL identity check did not confirm 127.0.0.1:5432/uk_exim_erp_dev on PostgreSQL 18.6. No browser was opened. See sanitized launcher logs under $($Paths.LogDirectory)."
  }
  return $check.Output
}

function Enter-ERPRunnerMutex {
  $mutex = New-Object System.Threading.Mutex($false, "Local\UKEXIMERP-Startup-7B52C110")
  try {
    $acquired = $mutex.WaitOne([TimeSpan]::FromSeconds(1))
  }
  catch [System.Threading.AbandonedMutexException] {
    $acquired = $true
  }
  if (-not $acquired) {
    $mutex.Dispose()
    throw "Another UK EXIM ERP startup check is already running. Wait a moment and double-click the shortcut again."
  }
  return $mutex
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

function Get-NormalizedERPCommandLine([string] $CommandLine) {
  if ($null -eq $CommandLine) { return "" }
  $normalized = $CommandLine.Replace('\\', '\')
  return $normalized -replace '\\node_modules\\\.bin\\\.\.\\next\\', '\node_modules\next\'
}

function Test-ERPNextPresentationHost($ProcessRecord, $Paths) {
  if (-not $ProcessRecord -or $ProcessRecord.Name -ine "node.exe") { return $false }
  if ([System.IO.Path]::GetFullPath([string]$ProcessRecord.ExecutablePath) -ine $Paths.NodeExe) { return $false }
  $hostScript = [System.IO.Path]::GetFullPath((Join-Path $Paths.ProjectRoot "scripts\windows\next-presentation-host.mjs"))
  $commandLine = Get-NormalizedERPCommandLine ([string]$ProcessRecord.CommandLine)
  return $commandLine.IndexOf($hostScript, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -and
    $commandLine.IndexOf($Paths.NpmCli, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Test-ERPNextNpmStartProcess($ProcessRecord, $Paths) {
  if (-not $ProcessRecord -or $ProcessRecord.Name -ine "node.exe") { return $false }
  if ([System.IO.Path]::GetFullPath([string]$ProcessRecord.ExecutablePath) -ine $Paths.NodeExe) { return $false }
  $commandLine = Get-NormalizedERPCommandLine ([string]$ProcessRecord.CommandLine)
  return $commandLine.IndexOf($Paths.NpmCli, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -and
    $commandLine -match '(?i)(^|\s)run\s+start(\s|$)'
}

function Test-ERPNextWindowsCmdWrapper($ProcessRecord, [int] $Port = 3000, [string] $Mode = "production") {
  if (-not $ProcessRecord -or $ProcessRecord.Name -ine "cmd.exe" -or $Mode -notin @("development", "production")) { return $false }
  $expectedCmd = if ($env:WINDIR) { Join-Path $env:WINDIR "System32\cmd.exe" } else { $null }
  if (-not $expectedCmd -or [System.IO.Path]::GetFullPath([string]$ProcessRecord.ExecutablePath) -ine [System.IO.Path]::GetFullPath($expectedCmd)) { return $false }
  $verb = if ($Mode -eq "production") { "start" } else { "dev" }
  $commandLine = Get-NormalizedERPCommandLine ([string]$ProcessRecord.CommandLine)
  return $commandLine -match ("(?i)\s/d\s+/s\s+/c\s+next\s+{0}\s+--hostname\s+127\.0\.0\.1\s+--port\s+{1}(\s|$)" -f $verb, $Port)
}

function Get-ERPNextPresentationManagerProcessId([int] $ListenerProcessId, $Paths, [int] $Port = 3000) {
  $listener = Get-ProcessRecord $ListenerProcessId
  if (-not (Test-ERPNextServerWorker $listener $Paths) -and -not (Test-ERPNextProcess $listener $Paths $Port "production")) { return $null }
  $cmd = Get-ProcessRecord ([int]$listener.ParentProcessId)
  if (-not (Test-ERPNextWindowsCmdWrapper $cmd $Port "production")) { return $null }
  $npm = Get-ProcessRecord ([int]$cmd.ParentProcessId)
  if (-not (Test-ERPNextNpmStartProcess $npm $Paths)) { return $null }
  $hostProcess = Get-ProcessRecord ([int]$npm.ParentProcessId)
  if (-not (Test-ERPNextPresentationHost $hostProcess $Paths)) { return $null }
  return [int]$hostProcess.ProcessId
}

function Test-ERPNextProcess($ProcessRecord, $Paths, [int] $Port = 3000, [string] $Mode = "development") {
  if (-not $ProcessRecord -or $ProcessRecord.Name -ine "node.exe") { return $false }
  if ([System.IO.Path]::GetFullPath([string]$ProcessRecord.ExecutablePath) -ine $Paths.NodeExe) { return $false }
  $commandLine = Get-NormalizedERPCommandLine ([string]$ProcessRecord.CommandLine)
  if ($commandLine.IndexOf($Paths.NextCli, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) { return $false }
  if ($Mode -eq "development" -and $commandLine -notmatch "(^|\s)dev(\s|$)") { return $false }
  if ($Mode -eq "production" -and $commandLine -notmatch "(^|\s)start(\s|$)") { return $false }
  if ($Mode -notin @("development", "production")) { return $false }
  if ($commandLine -notmatch "--hostname\s+127\.0\.0\.1") { return $false }
  if ($commandLine -notmatch "--port\s+$Port(\s|$)") { return $false }
  return $true
}

function Get-VerifiedERPNextProductionListenerIds($Paths, [int] $Port = 3000) {
  $connections = @(Get-ListeningConnections $Port)
  if ($connections.Count -eq 0) { return @() }
  if (@($connections | Where-Object { [string]$_.LocalAddress -ne "127.0.0.1" }).Count -gt 0) {
    throw "Port $Port includes a listener outside 127.0.0.1. No process was stopped."
  }

  $listenerIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
  foreach ($listenerId in $listenerIds) {
    $listener = Get-ProcessRecord ([int]$listenerId)
    if (-not (Test-ERPNextProcess $listener $Paths $Port "production")) {
      throw "Port $Port includes a process that is not this checkout's exact loopback Next.js Presentation server. No process was stopped."
    }
  }
  return $listenerIds
}

function Stop-VerifiedERPNextProductionListener($Paths, [int] $Port = 3000) {
  $listenerIds = @(Get-VerifiedERPNextProductionListenerIds $Paths $Port)
  foreach ($listenerId in $listenerIds) {
    $listener = Get-ProcessRecord ([int]$listenerId)
    if (-not (Test-ERPNextProcess $listener $Paths $Port "production")) {
      throw "The verified Presentation listener identity changed before shutdown. No process was stopped."
    }
    Send-ERPProcessSignal $Paths ([int]$listenerId) 'SIGINT'
  }

  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  while ([DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 500
    $remaining = @(Get-VerifiedERPNextProductionListenerIds $Paths $Port)
    if ($remaining.Count -eq 0) { return $true }
  }

  $remaining = @(Get-VerifiedERPNextProductionListenerIds $Paths $Port)
  foreach ($listenerId in $remaining) {
    $listener = Get-ProcessRecord ([int]$listenerId)
    if (-not (Test-ERPNextProcess $listener $Paths $Port "production")) {
      throw "The remaining listener is no longer the exact Presentation server. No further process was signalled."
    }
    Send-ERPProcessSignal $Paths ([int]$listenerId) 'SIGTERM'
  }
  $deadline = [DateTime]::UtcNow.AddSeconds(5)
  while ([DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 250
    $remaining = @(Get-VerifiedERPNextProductionListenerIds $Paths $Port)
    if ($remaining.Count -eq 0) { return $true }
  }
  throw "The exact Presentation listener did not release port $Port after graceful stop requests. No force termination was attempted."
}

function Test-ERPNextLegacyDevManager($ProcessRecord, $Paths, [int] $Port = 3000) {
  if (-not $ProcessRecord -or $ProcessRecord.Name -ine "node.exe") { return $false }
  if ([System.IO.Path]::GetFullPath([string]$ProcessRecord.ExecutablePath) -ine $Paths.NodeExe) { return $false }
  $commandLine = [string]$ProcessRecord.CommandLine
  if ($commandLine.IndexOf($Paths.ProjectRoot, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) { return $false }
  $normalized = $commandLine.Replace('/', '\').Replace('\\', '\')
  if ($normalized -notmatch 'node_modules\\.*next\\dist\\bin\\next(?:\.cmd)?') { return $false }
  if ($normalized -notmatch '(^|\s)dev(\s|$)') { return $false }
  if ($normalized -match '--port\s+(?<port>\d+)' -and [int]$Matches.port -ne $Port) { return $false }
  if ($normalized -match '--hostname\s+(?<host>\S+)' -and $Matches.host -notin @('127.0.0.1', 'localhost')) { return $false }
  return $true
}

function Test-ERPNextLegacyDevListenerTree([int] $ListenerProcessId, $Paths, [int] $Port = 3000) {
  $listener = Get-ProcessRecord $ListenerProcessId
  if (-not (Test-ERPNextServerWorker $listener $Paths)) { return $false }
  $currentId = [int]$listener.ParentProcessId
  $visited = @{}
  for ($depth = 0; $depth -lt 32 -and $currentId -gt 0; $depth++) {
    if ($visited.ContainsKey([string]$currentId)) { return $false }
    $visited[[string]$currentId] = $true
    $current = Get-ProcessRecord $currentId
    if (-not $current -or $current.Name -ine 'node.exe' -or
        [System.IO.Path]::GetFullPath([string]$current.ExecutablePath) -ine $Paths.NodeExe) { return $false }
    if (Test-ERPNextLegacyDevManager $current $Paths $Port) { return $true }
    $currentId = [int]$current.ParentProcessId
  }
  return $false
}

function Get-ERPNextLegacyDevManagerProcessId([int] $ListenerProcessId, $Paths, [int] $Port = 3000) {
  $listener = Get-ProcessRecord $ListenerProcessId
  if (-not (Test-ERPNextServerWorker $listener $Paths)) { return $null }
  $currentId = [int]$listener.ParentProcessId
  $visited = @{}
  for ($depth = 0; $depth -lt 32 -and $currentId -gt 0; $depth++) {
    if ($visited.ContainsKey([string]$currentId)) { return $null }
    $visited[[string]$currentId] = $true
    $current = Get-ProcessRecord $currentId
    if (-not $current -or $current.Name -ine 'node.exe' -or
        [System.IO.Path]::GetFullPath([string]$current.ExecutablePath) -ine $Paths.NodeExe) { return $null }
    if (Test-ERPNextLegacyDevManager $current $Paths $Port) { return [int]$current.ProcessId }
    $currentId = [int]$current.ParentProcessId
  }
  return $null
}

function Send-ERPProcessSignal($Paths, [int] $ProcessId, [ValidateSet('SIGINT', 'SIGTERM')] [string] $Signal) {
  if ($ProcessId -le 0) { throw "A valid verified ERP process ID is required before sending a stop signal." }
  $signalCodes = if ($Signal -eq 'SIGINT') { '83,73,71,73,78,84' } else { '83,73,71,84,69,82,77' }
  $sentCodes = '83,73,71,78,65,76,95,83,69,78,84'
  $errorCodes = '83,73,71,78,65,76,95,69,82,82,79,82,58'
  $unknownCodes = '85,78,75,78,79,87,78'
  $script = "try{process.kill(Number(process.argv[1]),String.fromCharCode($signalCodes));process.stdout.write(String.fromCharCode($sentCodes))}catch(e){process.stdout.write(String.fromCharCode($errorCodes)+(e&&e.code||String.fromCharCode($unknownCodes)));process.exitCode=1}"
  $output = @(& $Paths.NodeExe -e $script "$ProcessId" 2>&1) -join ""
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0 -or $output -cne 'SIGNAL_SENT') {
    $safeOutput = ConvertTo-SafeDiagnosticText $output
    throw "Could not deliver $Signal to verified ERP process PID $ProcessId. Sanitized signal result: $safeOutput"
  }
}

function Stop-VerifiedLegacyDevForPresentation([int[]] $ListenerProcessIds, $State, $Paths, [int] $Port = 3000, [switch] $ExplicitOwnerStop) {
  $managerIds = @()
  foreach ($listenerId in $ListenerProcessIds) {
    if (-not (Test-ERPNextLegacyDevListenerTree ([int]$listenerId) $Paths $Port)) {
      throw "Port $Port is not exclusively owned by this checkout's verified legacy development server. No process was stopped."
    }
    $managerIds += Get-ERPNextLegacyDevManagerProcessId ([int]$listenerId) $Paths $Port
  }
  $managerIds = @($managerIds | Where-Object { $_ } | Select-Object -Unique)
  if ($managerIds.Count -ne 1) { throw "The legacy development server manager could not be identified uniquely. No process was stopped." }
  $managerId = [int]$managerIds[0]
  if (-not $ExplicitOwnerStop -and (-not $State -or [string]$State.projectRoot -ine $Paths.ProjectRoot -or
      [string]$State.mode -ne 'development' -or [bool]$State.testModeDisabled -ne $true -or
      [int]$State.processId -ne $managerId)) {
    throw "The exact legacy development process has no matching runner state proving TEST mode is disabled. No process was stopped. Use the Desktop STOP shortcut, confirm the exact project process there, then use START again."
  }
  $manager = Get-ProcessRecord $managerId
  if (-not (Test-ERPNextLegacyDevManager $manager $Paths $Port)) {
    throw "The legacy development server identity changed before graceful shutdown. No process was stopped."
  }
  Send-ERPProcessSignal $Paths $managerId 'SIGINT'
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  while ([DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 500
    $remaining = @(Get-ListeningConnections $Port)
    if ($remaining.Count -eq 0) { return $true }
    foreach ($connection in $remaining) {
      if (-not (Test-ERPNextLegacyDevListenerTree ([int]$connection.OwningProcess) $Paths $Port)) {
        throw "An unexpected process appeared on port $Port during the safe development-to-presentation transition. No additional process was stopped."
      }
    }
    $manager = Get-ProcessRecord $managerId
    if (-not $manager) { continue }
    if (-not (Test-ERPNextLegacyDevManager $manager $Paths $Port)) {
      throw "The verified development manager identity changed during shutdown. No further process was stopped."
    }
  }
  throw "The exact development server did not release port $Port after graceful shutdown. No forced termination was attempted."
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

function Test-ERPNextListenerProcessTree([int] $ListenerProcessId, $Paths, [int] $Port = 3000, [string] $Mode = "development") {
  $listener = Get-ProcessRecord $ListenerProcessId
  if (-not $listener -or $listener.Name -ine "node.exe") { return $false }
  if ([System.IO.Path]::GetFullPath([string]$listener.ExecutablePath) -ine $Paths.NodeExe) { return $false }

  if (Test-ERPNextProcess $listener $Paths $Port $Mode) { return $true }
  if (-not (Test-ERPNextServerWorker $listener $Paths)) { return $false }

  if ($Mode -eq "production" -and (Get-ERPNextPresentationManagerProcessId $ListenerProcessId $Paths $Port)) { return $true }

  $currentId = [int]$listener.ParentProcessId
  $visited = @{}
  for ($depth = 0; $depth -lt 32 -and $currentId -gt 0; $depth++) {
    if ($visited.ContainsKey([string]$currentId)) { return $false }
    $visited[[string]$currentId] = $true
    $current = Get-ProcessRecord $currentId
    if (-not $current) { return $false }
    if (Test-ERPNextProcess $current $Paths $Port $Mode) { return $true }
    if ($current.Name -ine "node.exe" -or [System.IO.Path]::GetFullPath([string]$current.ExecutablePath) -ine $Paths.NodeExe) { return $false }
    $currentId = [int]$current.ParentProcessId
  }
  return $false
}

function Get-ERPNextManagerProcessId([int] $ListenerProcessId, $Paths, [int] $Port = 3000, [string] $Mode = "development") {
  if ($Mode -eq "production") {
    $presentationManager = Get-ERPNextPresentationManagerProcessId $ListenerProcessId $Paths $Port
    if ($presentationManager) { return $presentationManager }
  }
  $currentId = $ListenerProcessId
  $visited = @{}
  for ($depth = 0; $depth -lt 32 -and $currentId -gt 0; $depth++) {
    if ($visited.ContainsKey([string]$currentId)) { return $null }
    $visited[[string]$currentId] = $true
    $current = Get-ProcessRecord $currentId
    if (-not $current -or $current.Name -ine "node.exe") { return $null }
    if ([System.IO.Path]::GetFullPath([string]$current.ExecutablePath) -ine $Paths.NodeExe) { return $null }
    if (Test-ERPNextProcess $current $Paths $Port $Mode) { return [int]$current.ProcessId }
    $currentId = [int]$current.ParentProcessId
  }
  return $null
}

function Get-ERPNextListenerMode([int] $ListenerProcessId, $Paths, [int] $Port = 3000) {
  foreach ($mode in @("production", "development")) {
    if (Test-ERPNextListenerProcessTree $ListenerProcessId $Paths $Port $mode) { return $mode }
  }
  return $null
}

function Test-ERPNextProcessDescendant([int] $ProcessId, [int] $StartedProcessId, $Paths, [int] $Port = 3000, [string] $Mode = "development") {
  if ($Mode -eq "production") {
    return (Get-ERPNextPresentationManagerProcessId $ProcessId $Paths $Port) -eq $StartedProcessId
  }
  $startedProcess = Get-ProcessRecord $StartedProcessId
  if (-not (Test-ERPNextProcess $startedProcess $Paths $Port $Mode)) { return $false }

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

function Get-VerifiedERPNextListenerIds([int] $Port, [int] $StartedProcessId, $Paths, [string] $Mode = "development") {
  $connections = @(Get-ListeningConnections $Port)
  if ($connections.Count -eq 0) { return @() }
  if (@($connections | Where-Object { [string]$_.LocalAddress -ne "127.0.0.1" }).Count -gt 0) {
    throw "Port $Port has a listener outside 127.0.0.1. The ERP process identity could not be safely confirmed. No process was stopped."
  }

  $processIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
  foreach ($listenerId in $processIds) {
    if (-not (Test-ERPNextProcessDescendant ([int]$listenerId) $StartedProcessId $Paths $Port $Mode)) {
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

function Write-ERPNextRunnerState($Paths, [int] $ProcessId, [string] $AuthBaseUrl, [string] $Mode) {
  if ($Mode -notin @("development", "production")) { throw "The ERP runner mode is invalid." }
  $stateFile = if ($Mode -eq "production") { $Paths.PresentationStateFile } else { $Paths.StateFile }
  [pscustomobject]@{
    projectRoot = $Paths.ProjectRoot
    processId = $ProcessId
    nodeExe = $Paths.NodeExe
    nextCli = $Paths.NextCli
    port = 3000
    mode = $Mode
    testModeDisabled = $true
    stateFile = $stateFile
    authBaseUrl = $AuthBaseUrl
    startedAtUtc = [DateTime]::UtcNow.ToString("o")
  } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
}

function Read-RunnerState($Paths, [string] $Mode = "") {
  $stateFiles = if ($Mode -eq "production") { @($Paths.PresentationStateFile, $Paths.StateFile) }
    elseif ($Mode -eq "development") { @($Paths.StateFile, $Paths.PresentationStateFile) }
    else { @($Paths.PresentationStateFile, $Paths.StateFile) }
  foreach ($stateFile in $stateFiles) {
    if (-not (Test-Path -LiteralPath $stateFile -PathType Leaf)) { continue }
    try {
      $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json -ErrorAction Stop
      if ([string]$state.stateFile -and [System.IO.Path]::GetFullPath([string]$state.stateFile) -ine [System.IO.Path]::GetFullPath($stateFile)) {
        throw "Runner state points to an unexpected state file."
      }
      return $state
    }
    catch {
      throw "The local ERP runner state file is invalid. No process was stopped."
    }
  }
  return $null
}

function Test-ManagedERPProcess($ProcessRecord, $State, $Paths, [int] $Port = 3000) {
  if (-not $State) { return $false }
  if ([string]$State.projectRoot -ine $Paths.ProjectRoot -or [int]$State.port -ne $Port -or [string]$State.mode -notin @("development", "production") -or [bool]$State.testModeDisabled -ne $true -or [int]$State.processId -ne [int]$ProcessRecord.ProcessId) {
    return $false
  }
  if ([string]$State.mode -eq "production") {
    return Test-ERPNextPresentationHost $ProcessRecord $Paths
  }
  return Test-ERPNextProcess $ProcessRecord $Paths $Port ([string]$State.mode)
}

function Test-ManagedERPListener($ListenerProcessId, $State, $Paths, [int] $Port = 3000) {
  if (-not $State -or [string]$State.projectRoot -ine $Paths.ProjectRoot -or [int]$State.port -ne $Port -or [string]$State.mode -notin @("development", "production") -or [bool]$State.testModeDisabled -ne $true) {
    return $false
  }
  return Test-ERPNextListenerProcessTree ([int]$ListenerProcessId) $Paths $Port ([string]$State.mode)
}

function Get-ERPNextVerifiedMode([int] $ListenerProcessId, $Paths, [int] $Port = 3000) {
  foreach ($address in @(Get-ListeningConnections $Port | Where-Object { [int]$_.OwningProcess -eq $ListenerProcessId })) {
    if ([string]$address.LocalAddress -ne "127.0.0.1") { return $null }
  }
  return Get-ERPNextListenerMode $ListenerProcessId $Paths $Port
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

function Get-PostgreSqlConfigValue($Paths, $PostgreSql, [string] $Setting) {
  if ($Setting -notin @("data_directory", "listen_addresses", "port", "logging_collector", "log_directory", "log_filename")) {
    throw "The requested PostgreSQL setting is not on the launcher's safe inspection allowlist."
  }
  $value = (& $PostgreSql.PostgresExe -D $Paths.DataDirectory -C $Setting 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value)) {
    throw "Could not read the PostgreSQL $Setting setting from the approved DEV data directory."
  }
  return $value
}

function Invoke-ERPPostgreSqlCtl($PostgreSql, [string[]] $Arguments) {
  $output = @(& $PostgreSql.PgCtl @Arguments 2>&1)
  $exitCode = $LASTEXITCODE
  return [pscustomobject]@{ ExitCode = $exitCode; Output = ($output -join [Environment]::NewLine) }
}

function Invoke-ERPPostgreSqlStart($Paths, $PostgreSql) {
  $arguments = @(
    "start",
    "-D", ('"{0}"' -f $Paths.DataDirectory),
    "-o", '"-h 127.0.0.1 -p 5432"',
    "-w", "-t", "30",
    "-l", ('"{0}"' -f $Paths.PostgreSqlLog)
  )
  $process = Start-Process -FilePath $PostgreSql.PgCtl -ArgumentList $arguments `
    -RedirectStandardOutput $Paths.PostgreSqlCtlStdoutLog `
    -RedirectStandardError $Paths.PostgreSqlCtlStderrLog -NoNewWindow -PassThru -ErrorAction Stop

  if (-not $process.WaitForExit(40000)) {
    if (Test-ApprovedPostgreSqlInstance $Paths $PostgreSql) {
      return [pscustomobject]@{ ExitCode = 0; Output = "pg_ctl remained attached after the exact DEV instance became ready." }
    }
    return [pscustomobject]@{ ExitCode = 124; Output = "pg_ctl start did not exit within 40 seconds; no process was terminated." }
  }

  $process.Refresh()
  $output = @()
  foreach ($logPath in @($Paths.PostgreSqlCtlStdoutLog, $Paths.PostgreSqlCtlStderrLog)) {
    if (Test-Path -LiteralPath $logPath -PathType Leaf) {
      $output += Get-Content -LiteralPath $logPath -Raw -ErrorAction SilentlyContinue
    }
  }
  return [pscustomobject]@{ ExitCode = [int]$process.ExitCode; Output = ($output -join [Environment]::NewLine) }
}

function Test-ApprovedPostgreSqlConfiguration($Paths, $PostgreSql) {
  $configuredDataDirectory = (Get-PostgreSqlConfigValue $Paths $PostgreSql "data_directory").Replace('/', '\')
  $dataDirectory = [System.IO.Path]::GetFullPath($configuredDataDirectory).TrimEnd('\')
  $expectedDataDirectory = [System.IO.Path]::GetFullPath($Paths.DataDirectory).TrimEnd('\')
  $listenAddresses = Get-PostgreSqlConfigValue $Paths $PostgreSql "listen_addresses"
  $port = Get-PostgreSqlConfigValue $Paths $PostgreSql "port"
  if ($dataDirectory -ine $expectedDataDirectory -or $listenAddresses -notin @("127.0.0.1", "localhost") -or $port -ne "5432") {
    throw "PostgreSQL configuration does not point exclusively to the approved DEV data directory and loopback address 127.0.0.1:5432. No database configuration was changed."
  }
  $collector = (Get-PostgreSqlConfigValue $Paths $PostgreSql "logging_collector").ToLowerInvariant()
  if ($collector -eq "on" -or $collector -eq "true") {
    $logDirectory = Get-PostgreSqlConfigValue $Paths $PostgreSql "log_directory"
    if (-not [System.IO.Path]::IsPathRooted($logDirectory)) {
      $logDirectory = [System.IO.Path]::GetFullPath((Join-Path $Paths.DataDirectory $logDirectory))
    }
    if ($logDirectory.StartsWith([System.IO.Path]::GetFullPath($Paths.DataDirectory), [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "PostgreSQL's enabled logging collector writes inside the data directory. The launcher will not change PostgreSQL configuration; have the administrator review log_directory before startup."
    }
  }
  return $true
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
  $null = Test-ApprovedPostgreSqlConfiguration $Paths $PostgreSql

  $statusResult = Invoke-ERPPostgreSqlCtl $PostgreSql @("status", "-D", $Paths.DataDirectory)
  $statusCode = [int]$statusResult.ExitCode
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
  # Windows PostgreSQL may expose only the postgres.exe executable in the
  # process command line; pg_ctl status + this cluster's postmaster.pid + the
  # effective data_directory setting prove the instance identity instead.
  return $true
}

function Ensure-ApprovedPostgreSql($Paths, $PostgreSql) {
  if (Test-ApprovedPostgreSqlInstance $Paths $PostgreSql) { return $false }
  $null = New-Item -ItemType Directory -Path $Paths.RuntimeDirectory -Force
  $startResult = Invoke-ERPPostgreSqlStart $Paths $PostgreSql
  if (-not [string]::IsNullOrWhiteSpace([string]$startResult.Output)) {
    Write-ERPRunnerLog $Paths ("pg_ctl start: " + (ConvertTo-SafeDiagnosticText ([string]$startResult.Output)))
  }
  if ([int]$startResult.ExitCode -ne 0) {
    $diagnostic = ConvertTo-SafeDiagnosticText (([string]$startResult.Output) + "`n" + (Get-ERPPostgreSqlLogTail $Paths))
    if ($diagnostic -match "sharing violation") {
      throw "PostgreSQL reported a log-file sharing violation. The data directory was preserved and no alternate cluster was attempted. Review the unique log at $($Paths.PostgreSqlLog)."
    }
    throw "PostgreSQL could not be started from the approved DEV data directory. The data directory was preserved and no alternate cluster was attempted. Review the unique log at $($Paths.PostgreSqlLog)."
  }
  if (-not (Test-ApprovedPostgreSqlInstance $Paths $PostgreSql)) {
    throw "PostgreSQL did not become available on 127.0.0.1:5432 from the approved DEV data directory."
  }
  return $true
}

function Test-PostgreSqlReadyProbe($Paths) {
  $pgIsReady = Join-Path $Paths.PostgreSqlBinDirectory "pg_isready.exe"
  if (-not (Test-Path -LiteralPath $pgIsReady -PathType Leaf)) {
    throw "The approved PostgreSQL pg_isready.exe utility is missing. No database changes were made."
  }
  $null = & $pgIsReady -h 127.0.0.1 -p 5432 2>$null
  return ($LASTEXITCODE -eq 0)
}

function Get-ERPPostgreSqlLogTail($Paths) {
  if (-not (Test-Path -LiteralPath $Paths.PostgreSqlLog)) { return "" }
  $tail = (Get-Content -LiteralPath $Paths.PostgreSqlLog -Tail 20 -ErrorAction SilentlyContinue) -join "`n"
  return (ConvertTo-SafeDiagnosticText $tail)
}

function Wait-PostgreSqlReady($Paths, $PostgreSql, [int] $TimeoutSeconds = 60) {
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  while ([DateTime]::UtcNow -lt $deadline) {
    if (Test-PostgreSqlReadyProbe $Paths) {
      if (-not (Test-ApprovedPostgreSqlInstance $Paths $PostgreSql)) {
        throw "PostgreSQL responded, but the listener is not the approved DEV data directory."
      }
      return $true
    }
    Start-Sleep -Seconds 1
  }
  $tail = Get-ERPPostgreSqlLogTail $Paths
  if ($tail -match "sharing violation") {
    throw "PostgreSQL reported a log-file sharing violation. The data directory was preserved. Review the separate PostgreSQL startup log: $($Paths.PostgreSqlLog)"
  }
  throw "PostgreSQL did not become ready on 127.0.0.1:5432 within $TimeoutSeconds seconds. The data directory was preserved. Review: $($Paths.PostgreSqlLog)"
}
