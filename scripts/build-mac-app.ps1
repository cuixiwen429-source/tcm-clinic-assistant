param(
    [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"

Write-Host "============================================"
Write-Host "  Building macOS Package v$Version"
Write-Host "============================================"
Write-Host ""

$ROOT = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$BUILD_DIR = Join-Path $ROOT "build-output"
$PACKAGE_DIR = Join-Path $BUILD_DIR "TCM-Clinic-Assistant"
$SCRIPT = Join-Path $ROOT "scripts"

# ── Clean ──
Write-Host "[1/4] Cleaning..."
Remove-Item -Recurse -Force $BUILD_DIR -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $ROOT ".next") -ErrorAction SilentlyContinue

# ── Build Next.js standalone ──
Write-Host "[2/4] Building Next.js standalone..."
Set-Location $ROOT
npm install --no-audit 2>&1 | Out-Null
npx prisma generate 2>&1 | Out-Null
npx next build 2>&1
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

$STANDALONE = Join-Path $ROOT ".next\standalone"
if (-not (Test-Path $STANDALONE)) { throw "Standalone output missing" }
Write-Host "  [OK]"

# ── Assemble package ──
Write-Host "[3/4] Assembling package..."
New-Item -ItemType Directory -Force -Path (Join-Path $PACKAGE_DIR "server") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $PACKAGE_DIR "prisma") | Out-Null

# Launcher
Copy-Item (Join-Path $SCRIPT "setup-mac.command") $PACKAGE_DIR -Force

# Server
Copy-Item -Recurse "$STANDALONE\*" (Join-Path $PACKAGE_DIR "server") -Force

# Static files
$STATIC_SRC = Join-Path $ROOT ".next\static"
$STATIC_DST = Join-Path $PACKAGE_DIR "server\.next\static"
if (Test-Path $STATIC_SRC) {
    New-Item -ItemType Directory -Force -Path $STATIC_DST | Out-Null
    Copy-Item -Recurse "$STATIC_SRC\*" $STATIC_DST -Force
}

# Public
$PUBLIC_SRC = Join-Path $ROOT "public"
if (Test-Path $PUBLIC_SRC) {
    Copy-Item -Recurse $PUBLIC_SRC (Join-Path $PACKAGE_DIR "server\public") -Force
}

# Prisma
Copy-Item -Recurse (Join-Path $ROOT "prisma\schema.prisma") (Join-Path $PACKAGE_DIR "prisma\") -Force
Copy-Item -Recurse (Join-Path $ROOT "prisma\migrations") (Join-Path $PACKAGE_DIR "prisma\migrations") -Force
Copy-Item -Recurse (Join-Path $ROOT "prisma\data") (Join-Path $PACKAGE_DIR "prisma\data") -Force

# Config
Copy-Item (Join-Path $ROOT ".env.defaults") $PACKAGE_DIR -Force

# Version
New-Item -ItemType File -Force -Path (Join-Path $PACKAGE_DIR "version.txt") | Out-Null
Set-Content -Path (Join-Path $PACKAGE_DIR "version.txt") -Value $Version

Write-Host "  [OK]"

# ── Create ZIP ──
Write-Host "[4/4] Creating ZIP..."
$ZIP_NAME = "TCM-Clinic-Assistant-v$Version-mac.zip"
$ZIP_PATH = Join-Path $BUILD_DIR $ZIP_NAME

Get-ChildItem -Recurse $PACKAGE_DIR -Name ".DS_Store" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item (Join-Path $PACKAGE_DIR $_) -Force -ErrorAction SilentlyContinue
}

Compress-Archive -Path $PACKAGE_DIR -DestinationPath $ZIP_PATH -Force
Write-Host "  [OK] $ZIP_NAME"

# ── Summary ──
Write-Host ""
Write-Host "============================================"
Write-Host "  Build Complete!"
Write-Host "============================================"
Write-Host ""
Write-Host "  ZIP: $ZIP_PATH"
Write-Host ""
Write-Host "  === 在 Mac 上使用 ==="
Write-Host "  1. 将 ZIP 复制到 Mac，解压"
Write-Host "  2. 进入 TCM-Clinic-Assistant 目录"
Write-Host "  3. 双击 setup-mac.command"
Write-Host "     (如果提示安全，右键 → 打开)"
Write-Host ""
Write-Host "  === 制作 DMG ==="
Write-Host "  在 Mac 上解压后运行:"
Write-Host "  cd 解压目录的上级目录"
Write-Host "  hdiutil create -volname 'TCM Clinic Assistant' -srcfolder TCM-Clinic-Assistant -ov -format UDZO 'TCM-Clinic-Assistant-$Version.dmg'"
Write-Host ""
