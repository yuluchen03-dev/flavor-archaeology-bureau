param()

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

$Root = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path (Join-Path $Root 'tmp') 'demo-processes.json'
$HadFailure = $false

function Get-Win32ProcessById {
  param([int]$ProcessId)

  if (Get-Command Get-CimInstance -ErrorAction SilentlyContinue) {
    return Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  }

  return Get-WmiObject Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
}

function Get-ChildWin32Processes {
  param([int]$ParentProcessId)

  if (Get-Command Get-CimInstance -ErrorAction SilentlyContinue) {
    return @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $ParentProcessId" -ErrorAction SilentlyContinue)
  }

  return @(Get-WmiObject Win32_Process -Filter "ParentProcessId = $ParentProcessId" -ErrorAction SilentlyContinue)
}

function Get-RecordedProcessTreeIds {
  param([int]$RootProcessId)

  $ids = @()
  $children = @(Get-ChildWin32Processes -ParentProcessId $RootProcessId)
  foreach ($child in $children) {
    $ids += Get-RecordedProcessTreeIds -RootProcessId ([int]$child.ProcessId)
    $ids += [int]$child.ProcessId
  }

  if (Get-Win32ProcessById -ProcessId $RootProcessId) {
    $ids += $RootProcessId
  }

  return @($ids | Select-Object -Unique)
}

function Test-StartTimeMatches {
  param(
    [int]$ProcessId,
    [string]$ExpectedStartTime
  )

  if (-not $ExpectedStartTime) {
    return $true
  }

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if (-not $process) {
    return $false
  }

  try {
    $expected = ([DateTime]::Parse($ExpectedStartTime)).ToUniversalTime()
    $actual = $process.StartTime.ToUniversalTime()
    return ([Math]::Abs(($actual - $expected).TotalSeconds) -le 5)
  }
  catch {
    return $true
  }
}

function Stop-RecordedEntry {
  param(
    [string]$Name,
    [object]$Entry
  )

  if (-not $Entry -or -not $Entry.pid) {
    Write-Host "SKIP: no recorded $Name PID"
    return
  }

  $rootPid = [int]$Entry.pid
  $rootProcess = Get-Process -Id $rootPid -ErrorAction SilentlyContinue
  if ($rootProcess -and -not (Test-StartTimeMatches -ProcessId $rootPid -ExpectedStartTime $Entry.startedAt)) {
    Write-Host "SKIP: recorded $Name PID $rootPid no longer matches its start time; refusing to stop a possibly unrelated process."
    return
  }
  elseif (-not $rootProcess) {
    Write-Host "Recorded $Name root PID $rootPid is not running; checking its recorded child processes."
  }

  $ids = @(Get-RecordedProcessTreeIds -RootProcessId $rootPid)
  if ($ids.Count -eq 0) {
    Write-Host "OK: $Name process PID $rootPid is not running"
    return
  }

  foreach ($id in $ids) {
    try {
      $process = Get-Process -Id $id -ErrorAction SilentlyContinue
      if ($process) {
        Write-Host ("Stopping {0} process PID {1} ({2})" -f $Name, $id, $process.ProcessName)
        Stop-Process -Id $id -Force -ErrorAction Stop
      }
    }
    catch {
      Write-Host "FAIL: could not stop PID ${id}: $($_.Exception.Message)"
      $script:HadFailure = $true
    }
  }
}

if (-not (Test-Path -LiteralPath $PidFile)) {
  Write-Host "No demo PID file found at $PidFile"
  exit 0
}

try {
  $state = Get-Content -LiteralPath $PidFile -Raw | ConvertFrom-Json
}
catch {
  Write-Host "FAIL: could not read PID file '$PidFile': $($_.Exception.Message)"
  exit 1
}

Stop-RecordedEntry -Name 'frontend' -Entry $state.frontend
Stop-RecordedEntry -Name 'backend' -Entry $state.backend

Start-Sleep -Milliseconds 500

if ($HadFailure) {
  $state | Add-Member -NotePropertyName status -NotePropertyValue 'stop-failed' -Force
  $state | Add-Member -NotePropertyName stoppedAt -NotePropertyValue (Get-Date).ToString('o') -Force
  $state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $PidFile -Encoding UTF8
  exit 1
}

Remove-Item -LiteralPath $PidFile -Force
Write-Host "Demo processes stopped. Removed $PidFile"
