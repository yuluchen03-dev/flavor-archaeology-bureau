param(
  [int]$BackendPort = 3001,
  [int]$FrontendPort = 5173,
  [switch]$RequireRunning
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

$Root = Split-Path -Parent $PSScriptRoot
$BackendUrl = "http://localhost:$BackendPort"
$FrontendUrl = "http://localhost:$FrontendPort"
$ApiBase = "$BackendUrl/api"
$HadFailure = $false

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Command,
    [switch]$Optional
  )

  Write-Host ''
  Write-Host "== $Name =="
  try {
    & $Command
    Write-Host "OK: $Name"
  }
  catch {
    if ($Optional) {
      Write-Host "SKIP: $Name"
      Write-Host "Reason: $($_.Exception.Message)"
      Write-Host 'Hint: start the demo with scripts/start-demo.ps1, then rerun with -RequireRunning for hard HTTP smoke checks.'
    }
    else {
      Write-Host "FAIL: $Name"
      Write-Host "Reason: $($_.Exception.Message)"
      $script:HadFailure = $true
    }
  }
}

function Invoke-External {
  param(
    [string]$CommandName,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  Push-Location $WorkingDirectory
  try {
    & $CommandName @Arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      throw "$CommandName $($Arguments -join ' ') exited with code $exitCode"
    }
  }
  finally {
    Pop-Location
  }
}

function Invoke-Http200 {
  param([string]$Uri)

  $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 5
  if ($response.StatusCode -ne 200) {
    throw "Expected HTTP 200 from $Uri, got HTTP $($response.StatusCode)"
  }

  return $response
}

function Convert-JsonContent {
  param(
    [string]$Content,
    [string]$Name
  )

  try {
    return $Content | ConvertFrom-Json
  }
  catch {
    throw "$Name returned HTTP 200 but did not return valid JSON: $($_.Exception.Message)"
  }
}

$httpOptional = -not $RequireRunning

Invoke-Step "Python bridge list_dishes" {
  $env:PYTHONIOENCODING = 'utf-8'
  Invoke-External -CommandName 'python' -Arguments @('service/api_wrapper.py', 'list_dishes', '{}') -WorkingDirectory $Root
}

Invoke-Step "Backend health at $BackendUrl/health" {
  $response = Invoke-Http200 -Uri "$BackendUrl/health"
  $health = Convert-JsonContent -Content $response.Content -Name 'Backend health'
  if ($health.status -ne 'ok') {
    throw "Backend health status was '$($health.status)', expected 'ok'"
  }
  $health | ConvertTo-Json -Depth 6
} -Optional:$httpOptional

Invoke-Step "Backend API root at $ApiBase" {
  $response = Invoke-Http200 -Uri $ApiBase
  $api = Convert-JsonContent -Content $response.Content -Name 'Backend API root'
  $api | ConvertTo-Json -Depth 6
} -Optional:$httpOptional

Invoke-Step "Frontend home at $FrontendUrl" {
  $response = Invoke-Http200 -Uri $FrontendUrl
  if (-not ($response.Content -match '<html|<div|<!doctype')) {
    throw "Frontend home returned HTTP 200 but did not look like an HTML page"
  }
  Write-Host ("HTTP {0}; {1} bytes" -f $response.StatusCode, $response.RawContentLength)
} -Optional:$httpOptional

Invoke-Step "Frontend build" {
  $env:VITE_API_BASE = $ApiBase
  Invoke-External -CommandName 'npm' -Arguments @('run', 'build') -WorkingDirectory (Join-Path $Root 'frontend')
}

if ($HadFailure) {
  exit 1
}

Write-Host ''
if ($RequireRunning) {
  Write-Host 'Verification finished. Required HTTP smoke checks passed.'
}
else {
  Write-Host 'Verification finished. HTTP checks are optional unless -RequireRunning is set.'
}
