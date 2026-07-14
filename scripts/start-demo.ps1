param(
  [int]$BackendPort = 3001,
  [int]$FrontendPort = 5173,
  [switch]$AllowPortFallback
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

$Root = Split-Path -Parent $PSScriptRoot
$TmpDir = Join-Path $Root 'tmp'
$PidFile = Join-Path $TmpDir 'demo-processes.json'
$BackendDir = Join-Path $Root 'backend'
$FrontendDir = Join-Path $Root 'frontend'

function Get-CommandName {
  param(
    [string[]]$Names,
    [string]$DisplayName,
    [string]$InstallHint
  )

  foreach ($name in $Names) {
    $command = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) {
      return $name
    }
  }

  throw "$DisplayName was not found on PATH. $InstallHint"
}

function Assert-CommandVersion {
  param(
    [string]$CommandName,
    [string]$DisplayName
  )

  $versionOutput = & $CommandName --version 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "$DisplayName exists but '$CommandName --version' failed with exit code $exitCode. Output: $versionOutput"
  }

  Write-Host ("OK: {0} {1}" -f $DisplayName, (($versionOutput | Select-Object -First 1) -join ' '))
}

function Assert-NodeModules {
  param(
    [string]$ProjectDir,
    [string]$ProjectName
  )

  $nodeModules = Join-Path $ProjectDir 'node_modules'
  if (-not (Test-Path -LiteralPath $nodeModules -PathType Container)) {
    throw "$ProjectName dependencies are missing at '$nodeModules'. Run 'npm install' in '$ProjectDir' before starting the demo."
  }

  Write-Host "OK: $ProjectName dependencies found"
}

function Get-PortOwners {
  param([int]$Port)

  $owners = @()
  if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    $connections = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    foreach ($connection in $connections) {
      if (-not $connection.OwningProcess) {
        continue
      }

      if ($owners | Where-Object { $_.Id -eq $connection.OwningProcess }) {
        continue
      }

      $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
      if ($process) {
        $owners += $process
      }
    }
  }
  else {
    $matches = @(netstat -ano -p tcp | Select-String -Pattern 'LISTENING')
    foreach ($match in $matches) {
      $line = $match.Line
      if ($line -match "[:.]$Port\s+.*LISTENING\s+(\d+)$") {
        $pid = [int]$Matches[1]
        if (-not ($owners | Where-Object { $_.Id -eq $pid })) {
          $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
          if ($process) {
            $owners += $process
          }
        }
      }
    }
  }

  return @($owners)
}

function Format-PortOwners {
  param([object[]]$Owners)

  if (-not $Owners -or $Owners.Count -eq 0) {
    return 'no process details available'
  }

  $details = @()
  foreach ($owner in $Owners) {
    $path = ''
    try {
      $path = $owner.Path
    }
    catch {
      $path = ''
    }

    if ($path) {
      $details += ("PID {0} {1} ({2})" -f $owner.Id, $owner.ProcessName, $path)
    }
    else {
      $details += ("PID {0} {1}" -f $owner.Id, $owner.ProcessName)
    }
  }

  return ($details -join '; ')
}

function Resolve-DemoPort {
  param(
    [string]$Name,
    [int]$PreferredPort,
    [int[]]$ReservedPorts
  )

  $owners = @(Get-PortOwners -Port $PreferredPort)
  if ($owners.Count -eq 0 -and -not ($ReservedPorts -contains $PreferredPort)) {
    return $PreferredPort
  }

  Write-Host ("Port {0} for {1} is in use: {2}" -f $PreferredPort, $Name, (Format-PortOwners -Owners $owners))
  if (-not $AllowPortFallback) {
    throw "Port $PreferredPort is unavailable. Stop the owning process or rerun with -AllowPortFallback."
  }

  for ($candidate = $PreferredPort + 1; $candidate -le ($PreferredPort + 50); $candidate++) {
    if ($ReservedPorts -contains $candidate) {
      continue
    }

    $candidateOwners = @(Get-PortOwners -Port $candidate)
    if ($candidateOwners.Count -eq 0) {
      Write-Host ("Using fallback {0} port {1}" -f $Name, $candidate)
      return $candidate
    }
  }

  throw "Could not find a free fallback port for $Name near $PreferredPort."
}

function Invoke-Npm {
  param(
    [string]$WorkingDirectory,
    [string[]]$Arguments
  )

  Push-Location $WorkingDirectory
  try {
    & $script:NpmCommand @Arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      throw "npm $($Arguments -join ' ') failed with exit code $exitCode"
    }
  }
  finally {
    Pop-Location
  }
}

function New-RunnerScript {
  param(
    [string]$Path,
    [string]$Content
  )

  Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8
}

function Start-DemoProcess {
  param(
    [string]$Name,
    [string]$RunnerPath,
    [string[]]$RunnerArguments,
    [string]$StdOutPath,
    [string]$StdErrPath
  )

  $powershellCommand = Get-Command powershell.exe -ErrorAction Stop
  $argumentList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $RunnerPath)) + $RunnerArguments
  $process = Start-Process -FilePath $powershellCommand.Source -ArgumentList $argumentList -WorkingDirectory $Root -RedirectStandardOutput $StdOutPath -RedirectStandardError $StdErrPath -WindowStyle Hidden -PassThru
  Start-Sleep -Milliseconds 500

  if ($process.HasExited) {
    $stderr = ''
    if (Test-Path -LiteralPath $StdErrPath) {
      $stderr = Get-Content -LiteralPath $StdErrPath -Raw -ErrorAction SilentlyContinue
    }
    throw "$Name process exited immediately with code $($process.ExitCode). $stderr"
  }

  return $process
}

function Wait-Http200 {
  param(
    [string]$Name,
    [string]$Uri,
    [int]$TimeoutSec = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $lastError = $null

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 3
      if ($response.StatusCode -eq 200) {
        Write-Host "OK: $Name is responding at $Uri"
        return
      }

      $lastError = "HTTP $($response.StatusCode)"
    }
    catch {
      $lastError = $_.Exception.Message
    }

    Start-Sleep -Milliseconds 750
  }

  throw "$Name did not return HTTP 200 at $Uri within $TimeoutSec seconds. Last error: $lastError"
}

function Assert-NoRunningState {
  if (-not (Test-Path -LiteralPath $PidFile)) {
    return
  }

  try {
    $state = Get-Content -LiteralPath $PidFile -Raw | ConvertFrom-Json
  }
  catch {
    Write-Host "Existing PID file could not be parsed and will be replaced: $PidFile"
    return
  }

  if ($state.status -eq 'stopped') {
    return
  }

  $running = @()
  foreach ($entry in @($state.backend, $state.frontend)) {
    if ($entry -and $entry.pid) {
      $process = Get-Process -Id ([int]$entry.pid) -ErrorAction SilentlyContinue
      if ($process) {
        $running += ("PID {0} {1}" -f $process.Id, $process.ProcessName)
      }
    }
  }

  if ($running.Count -gt 0) {
    throw "A demo appears to be running from '$PidFile': $($running -join '; '). Run scripts/stop-demo.ps1 first."
  }
}

function Stop-StartedProcess {
  param([System.Diagnostics.Process[]]$Processes)

  foreach ($process in $Processes) {
    if ($process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
  }
}

try {
  if (-not (Test-Path -LiteralPath $TmpDir -PathType Container)) {
    New-Item -ItemType Directory -Path $TmpDir | Out-Null
  }

  Assert-NoRunningState

  Write-Host 'Checking local toolchain...'
  $script:NodeCommand = Get-CommandName -Names @('node.exe', 'node') -DisplayName 'Node.js' -InstallHint 'Install Node.js LTS and reopen PowerShell.'
  $script:NpmCommand = Get-CommandName -Names @('npm.cmd', 'npm') -DisplayName 'npm' -InstallHint 'Install npm with Node.js and reopen PowerShell.'
  $script:PythonCommand = Get-CommandName -Names @('python.exe', 'python') -DisplayName 'Python' -InstallHint 'Install Python 3 and ensure python is on PATH.'

  Assert-CommandVersion -CommandName $script:NodeCommand -DisplayName 'Node.js'
  Assert-CommandVersion -CommandName $script:NpmCommand -DisplayName 'npm'
  Assert-CommandVersion -CommandName $script:PythonCommand -DisplayName 'Python'

  Assert-NodeModules -ProjectDir $BackendDir -ProjectName 'Backend'
  Assert-NodeModules -ProjectDir $FrontendDir -ProjectName 'Frontend'

  $ActualBackendPort = Resolve-DemoPort -Name 'backend' -PreferredPort $BackendPort -ReservedPorts @()
  $ActualFrontendPort = Resolve-DemoPort -Name 'frontend' -PreferredPort $FrontendPort -ReservedPorts @($ActualBackendPort)
  $BackendUrl = "http://localhost:$ActualBackendPort"
  $FrontendUrl = "http://localhost:$ActualFrontendPort"
  $ApiBase = "$BackendUrl/api"

  Write-Host ''
  Write-Host 'Initializing backend database...'
  $env:PYTHONIOENCODING = 'utf-8'
  Invoke-Npm -WorkingDirectory $BackendDir -Arguments @('run', 'db:init')

  $backendRunner = Join-Path $TmpDir 'demo-backend.ps1'
  $frontendRunner = Join-Path $TmpDir 'demo-frontend.ps1'
  $backendOut = Join-Path $TmpDir 'backend.stdout.log'
  $backendErr = Join-Path $TmpDir 'backend.stderr.log'
  $frontendOut = Join-Path $TmpDir 'frontend.stdout.log'
  $frontendErr = Join-Path $TmpDir 'frontend.stderr.log'

  New-RunnerScript -Path $backendRunner -Content @'
param(
  [string]$RootPath,
  [int]$Port,
  [string]$CorsOrigin
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $RootPath 'backend')
$env:PORT = [string]$Port
$env:NODE_ENV = 'development'
$env:PYTHONIOENCODING = 'utf-8'
$env:CORS_ORIGIN = $CorsOrigin
npm start
exit $LASTEXITCODE
'@

  New-RunnerScript -Path $frontendRunner -Content @'
param(
  [string]$RootPath,
  [int]$Port,
  [string]$ApiBase
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $RootPath 'frontend')
$env:PORT = [string]$Port
$env:VITE_API_BASE = $ApiBase
npm run dev -- --host 0.0.0.0 --port $Port --strictPort
exit $LASTEXITCODE
'@

  Write-Host ''
  Write-Host "Starting backend on $BackendUrl"
  $backendProcess = Start-DemoProcess -Name 'backend' -RunnerPath $backendRunner -RunnerArguments @('-RootPath', ('"{0}"' -f $Root), '-Port', $ActualBackendPort, '-CorsOrigin', ('"{0}"' -f $FrontendUrl)) -StdOutPath $backendOut -StdErrPath $backendErr

  $startingState = [ordered]@{
    version = 1
    status = 'starting'
    root = $Root
    startedAt = (Get-Date).ToString('o')
    backend = [ordered]@{
      pid = $backendProcess.Id
      startedAt = $backendProcess.StartTime.ToString('o')
      port = $ActualBackendPort
      url = $BackendUrl
      apiBase = $ApiBase
      stdout = $backendOut
      stderr = $backendErr
      runner = $backendRunner
    }
  }

  $startingState | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $PidFile -Encoding UTF8

  Write-Host "Starting frontend on $FrontendUrl"
  $frontendProcess = Start-DemoProcess -Name 'frontend' -RunnerPath $frontendRunner -RunnerArguments @('-RootPath', ('"{0}"' -f $Root), '-Port', $ActualFrontendPort, '-ApiBase', ('"{0}"' -f $ApiBase)) -StdOutPath $frontendOut -StdErrPath $frontendErr

  $state = [ordered]@{
    version = 1
    status = 'running'
    root = $Root
    startedAt = (Get-Date).ToString('o')
    backend = [ordered]@{
      pid = $backendProcess.Id
      startedAt = $backendProcess.StartTime.ToString('o')
      port = $ActualBackendPort
      url = $BackendUrl
      apiBase = $ApiBase
      stdout = $backendOut
      stderr = $backendErr
      runner = $backendRunner
    }
    frontend = [ordered]@{
      pid = $frontendProcess.Id
      startedAt = $frontendProcess.StartTime.ToString('o')
      port = $ActualFrontendPort
      url = $FrontendUrl
      apiBase = $ApiBase
      stdout = $frontendOut
      stderr = $frontendErr
      runner = $frontendRunner
    }
  }

  $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $PidFile -Encoding UTF8

  Write-Host ''
  Write-Host 'Waiting for HTTP smoke checks...'
  Wait-Http200 -Name 'Backend health' -Uri "$BackendUrl/health" -TimeoutSec 30
  Wait-Http200 -Name 'Backend API root' -Uri $ApiBase -TimeoutSec 30
  Wait-Http200 -Name 'Frontend home' -Uri $FrontendUrl -TimeoutSec 30

  Write-Host ''
  Write-Host 'Demo stack is running.'
  Write-Host "Backend URL:  $BackendUrl"
  Write-Host "Frontend URL: $FrontendUrl"
  Write-Host "API base:     $ApiBase"
  Write-Host "PID file:     $PidFile"
  Write-Host "Logs:         $TmpDir"
  Write-Host ''
  Write-Host 'Stop with: powershell -ExecutionPolicy Bypass -File scripts/stop-demo.ps1'
}
catch {
  Write-Host ''
  Write-Host "FAIL: $($_.Exception.Message)"
  if ($backendProcess -or $frontendProcess) {
    Write-Host 'Cleaning up started demo processes...'
    if (Test-Path -LiteralPath $PidFile) {
      & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'stop-demo.ps1') | Write-Host
    }
    else {
      Stop-StartedProcess -Processes @($backendProcess, $frontendProcess)
    }
  }
  exit 1
}
