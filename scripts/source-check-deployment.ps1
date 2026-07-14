param()

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

$Root = Split-Path -Parent $PSScriptRoot

function Read-RepoFile {
  param([string]$RelativePath)

  $path = Join-Path $Root $RelativePath
  if (-not (Test-Path $path)) {
    throw "Missing required file: $RelativePath"
  }

  return Get-Content -Raw -LiteralPath $path
}

function Assert-Contains {
  param(
    [string]$Name,
    [string]$Content,
    [string]$Pattern
  )

  if ($Content -notmatch $Pattern) {
    throw "$Name does not contain required pattern: $Pattern"
  }
}

function Assert-NotContains {
  param(
    [string]$Name,
    [string]$Content,
    [string]$Pattern
  )

  if ($Content -match $Pattern) {
    throw "$Name contains forbidden pattern: $Pattern"
  }
}

$frontendDockerfile = Read-RepoFile 'frontend/Dockerfile'
$nginxConf = Read-RepoFile 'frontend/nginx.conf'
$backendDockerfile = Read-RepoFile 'backend/Dockerfile'
$verifyAll = Read-RepoFile 'scripts/verify-all.ps1'

Assert-Contains 'frontend/nginx.conf' $nginxConf 'try_files\s+\$uri\s+\$uri/\s+/index\.html;'
Assert-Contains 'frontend/Dockerfile' $frontendDockerfile 'COPY\s+frontend/nginx\.conf\s+/etc/nginx/conf\.d/default\.conf'
Assert-Contains 'backend/Dockerfile' $backendDockerfile 'npm\s+run\s+db:init'
Assert-Contains 'backend/Dockerfile' $backendDockerfile 'npm\s+(run\s+)?start'
Assert-Contains 'backend/Dockerfile' $backendDockerfile 'ln\s+-s\s+/usr/bin/python3\s+/usr/bin/python'
Assert-Contains 'scripts/verify-all.ps1' $verifyAll 'npm\s+test\s+--\s+--runInBand'
Assert-Contains 'scripts/verify-all.ps1' $verifyAll 'npm\s+run\s+lint'
Assert-Contains 'scripts/verify-all.ps1' $verifyAll 'npm\s+run\s+build'
Assert-Contains 'scripts/verify-all.ps1' $verifyAll 'unittest'
Assert-Contains 'scripts/verify-all.ps1' $verifyAll 'verify_literature_dataset\.mjs'
Assert-Contains 'scripts/verify-all.ps1' $verifyAll 'docker\s+compose\s+config'
Assert-Contains 'scripts/verify-all.ps1' $verifyAll 'JWT_SECRET'
Assert-NotContains 'scripts/verify-all.ps1' $verifyAll 'Invoke-Step\s+"Frontend tests"[\s\S]*?\}\s+-Optional'

Write-Host 'Deployment source checks passed.'
