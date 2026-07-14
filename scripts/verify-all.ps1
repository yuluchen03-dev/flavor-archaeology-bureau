param()

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

$Root = Split-Path -Parent $PSScriptRoot
$HadFailure = $false

Write-Host "Quality gate root: $Root"
Write-Host "Clean-clone note: this script expects dependencies to be installed already. For a fresh machine, run npm install in backend/frontend first and install service requirements."

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Command,
    [switch]$Optional
  )

  Write-Host ""
  Write-Host "== $Name =="
  try {
    $global:LASTEXITCODE = 0
    & $Command
    if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
      throw "Command exited with code $LASTEXITCODE"
    }
    Write-Host "OK: $Name"
  }
  catch {
    if ($Optional) {
      Write-Host "SKIP: $Name"
      Write-Host "Reason: $($_.Exception.Message)"
    }
    else {
      Write-Host "FAIL: $Name"
      Write-Host "Reason: $($_.Exception.Message)"
      $script:HadFailure = $true
    }
  }
}

function Get-NpmScripts {
  param([string]$PackageJsonPath)

  $package = Get-Content -Raw -LiteralPath $PackageJsonPath | ConvertFrom-Json
  return $package.scripts
}

Invoke-Step "Backend tests" {
  Push-Location (Join-Path $Root 'backend')
  try {
    npm test -- --runInBand
  }
  finally {
    Pop-Location
  }
}

Invoke-Step "Frontend lint" {
  Push-Location (Join-Path $Root 'frontend')
  try {
    npm run lint
  }
  finally {
    Pop-Location
  }
}

Invoke-Step "Frontend tests" {
  $scripts = Get-NpmScripts (Join-Path $Root 'frontend/package.json')
  if (-not ($scripts.PSObject.Properties.Name -contains 'test')) {
    Write-Host 'SKIP: frontend/package.json has no test script'
    return
  }

  Push-Location (Join-Path $Root 'frontend')
  try {
    npm run test
  }
  finally {
    Pop-Location
  }
}

Invoke-Step "Frontend build" {
  Push-Location (Join-Path $Root 'frontend')
  try {
    npm run build
  }
  finally {
    Pop-Location
  }
}

Invoke-Step "Python unittest" {
  Push-Location $Root
  try {
    $env:PYTHONIOENCODING = 'utf-8'
    python -m unittest discover -s service -p 'test*.py'
  }
  finally {
    Pop-Location
  }
}

Invoke-Step "Literature dataset validation" {
  Push-Location $Root
  try {
    node scripts/verify_literature_dataset.mjs
  }
  finally {
    Pop-Location
  }
}

Invoke-Step "Knowledge graph schema validation" {
  Push-Location $Root
  try {
    node scripts/verify_graph_schema.mjs
  }
  finally {
    Pop-Location
  }
}

Invoke-Step "Knowledge graph coverage report" {
  Push-Location $Root
  try {
    node scripts/verify_knowledge_graph_coverage.mjs
  }
  finally {
    Pop-Location
  }
}

Invoke-Step "Asset budget report" {
  Push-Location $Root
  try {
    node scripts/verify_asset_budget.mjs --limit 8
  }
  finally {
    Pop-Location
  }
}

Invoke-Step "Docker compose config" {
  Push-Location $Root
  $previousJwtSecret = $env:JWT_SECRET
  try {
    if ([string]::IsNullOrWhiteSpace($env:JWT_SECRET)) {
      $env:JWT_SECRET = 'verify-all-temporary-jwt-secret'
    }
    docker compose config
  }
  finally {
    if ($null -eq $previousJwtSecret) {
      Remove-Item Env:\JWT_SECRET -ErrorAction SilentlyContinue
    }
    else {
      $env:JWT_SECRET = $previousJwtSecret
    }
    Pop-Location
  }
}

if ($HadFailure) {
  Write-Host ""
  Write-Host "Quality gate failed."
  exit 1
}

Write-Host ""
Write-Host "Quality gate finished. Frontend tests are skipped only when no npm test script exists."
