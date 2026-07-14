param()

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

$Root = Split-Path -Parent $PSScriptRoot

$ReleaseDir = Join-Path $Root 'release'
$SubmissionDir = Join-Path $ReleaseDir '风味考古局-TRAE初赛'
$ZipPath = Join-Path $ReleaseDir '风味考古局-TRAE初赛.zip'
$BuiltHtml = Join-Path $Root 'frontend\dist-offline\offline.html'
$PackageName = '风味考古局-离线体验.html'
$ReadmeName = '使用说明.txt'

Write-Host '== Step 1: Build offline bundle =='
Push-Location (Join-Path $Root 'frontend')
try {
  npm run build:offline
  if ($LASTEXITCODE -ne 0) { throw "build:offline exited with code $LASTEXITCODE" }
}
finally {
  Pop-Location
}
Write-Host "Built: $BuiltHtml"

Write-Host ''
Write-Host '== Step 2: Verify offline bundle (enforce) =='
Push-Location $Root
try {
  node scripts/verify_offline_bundle.mjs $BuiltHtml --enforce
  if ($LASTEXITCODE -ne 0) { throw "Bundle verification failed with code $LASTEXITCODE" }
}
finally {
  Pop-Location
}
Write-Host 'Verification passed.'

Write-Host ''
Write-Host '== Step 3: Prepare submission directory =='
if (Test-Path -LiteralPath $SubmissionDir) {
  Remove-Item -LiteralPath $SubmissionDir -Recurse -Force
}
New-Item -ItemType Directory -Path $SubmissionDir -Force | Out-Null
Write-Host "Created: $SubmissionDir"

Write-Host ''
Write-Host '== Step 4: Copy self-contained HTML =='
Copy-Item -LiteralPath $BuiltHtml -Destination (Join-Path $SubmissionDir $PackageName)
Write-Host "Copied as: $PackageName"

Write-Host ''
Write-Host '== Step 5: Write usage instructions =='
$lines = @(
  '风味考古局 · 离线体验包 使用说明',
  '',
  '1. 解压本压缩包到任意目录。',
  '2. 双击「风味考古局-离线体验.html」即可在浏览器中打开。',
  '3. 推荐使用 Chrome 或 Edge 浏览器获得最佳体验。',
  '4. 无需联网，所有内容均已内置，可离线运行。',
  '',
  '如遇显示异常，请尝试更换浏览器或刷新页面。'
)
$instructions = $lines -join "`r`n"
$instructionsPath = Join-Path $SubmissionDir $ReadmeName
[System.IO.File]::WriteAllText($instructionsPath, $instructions, [System.Text.UTF8Encoding]::new($false))
Write-Host "Written: $ReadmeName"

Write-Host ''
Write-Host '== Step 6: Create ZIP archive =='
if (Test-Path -LiteralPath $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}
Compress-Archive -Path (Join-Path $SubmissionDir '*') -DestinationPath $ZipPath -CompressionLevel Optimal
$zipInfo = Get-Item -LiteralPath $ZipPath
$zipSizeKb = [math]::Round($zipInfo.Length / 1KB, 2)
Write-Host ''
Write-Host '== Done =='
Write-Host "ZIP path: $ZipPath"
Write-Host "ZIP size: $zipSizeKb KB ($($zipInfo.Length) bytes)"
