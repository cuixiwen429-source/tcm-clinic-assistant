param(
    [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"
$APP_NAME = "TCM Clinic Assistant"
$BUNDLE_ID = "com.tcm-clinic.assistant"

Write-Host "============================================"
Write-Host "  Building macOS App Bundle v$Version"
Write-Host "============================================"
Write-Host ""

# ── Paths ──
$ROOT = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$BUILD_DIR = Join-Path $ROOT "build-output"
$APP_BUNDLE = Join-Path $BUILD_DIR "$APP_NAME.app"
$CONTENTS = Join-Path $APP_BUNDLE "Contents"
$MACOS_DIR = Join-Path $CONTENTS "MacOS"
$RESOURCES = Join-Path $CONTENTS "Resources"
$SCRIPTS_DIR = Join-Path $ROOT "scripts"

# ── Clean ──
Write-Host "[1/5] Cleaning previous build..."
Remove-Item -Recurse -Force $BUILD_DIR -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $ROOT ".next") -ErrorAction SilentlyContinue

# ── Build Next.js standalone ──
Write-Host "[2/5] Building Next.js standalone..."
Set-Location $ROOT
npm install --no-audit 2>&1 | Out-Null
npx prisma generate 2>&1 | Out-Null
npx next build 2>&1
if ($LASTEXITCODE -ne 0) { throw "Next.js build failed" }

# Verify standalone output
$STANDALONE = Join-Path $ROOT ".next\standalone"
if (-not (Test-Path $STANDALONE)) { throw "Standalone output not found at $STANDALONE" }
Write-Host "  [OK] Standalone build complete"

# ── Assemble .app bundle ──
Write-Host "[3/5] Assembling .app bundle structure..."
New-Item -ItemType Directory -Force -Path $MACOS_DIR | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $RESOURCES "server") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $RESOURCES "node\bin") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $RESOURCES "prisma") | Out-Null

# Copy launcher and make executable (permissions to be set on Mac)
Copy-Item (Join-Path $SCRIPTS_DIR "launcher.sh") (Join-Path $MACOS_DIR "launcher")

# Copy Info.plist
Copy-Item (Join-Path $SCRIPTS_DIR "Info.plist") (Join-Path $CONTENTS "Info.plist")

# Copy Next.js standalone output
Copy-Item -Recurse "$STANDALONE\*" (Join-Path $RESOURCES "server") -Force

# Copy static files (standalone output doesn't include these automatically)
$STATIC_SRC = Join-Path $ROOT ".next\static"
$STATIC_DST = Join-Path $RESOURCES "server\.next\static"
if (Test-Path $STATIC_SRC) {
    New-Item -ItemType Directory -Force -Path $STATIC_DST | Out-Null
    Copy-Item -Recurse "$STATIC_SRC\*" $STATIC_DST -Force
    Write-Host "  [OK] Copied static files"
}

# Copy public directory
$PUBLIC_SRC = Join-Path $ROOT "public"
$PUBLIC_DST = Join-Path $RESOURCES "server\public"
if (Test-Path $PUBLIC_SRC) {
    Copy-Item -Recurse $PUBLIC_SRC $PUBLIC_DST -Force
}

# Copy Prisma schema + migrations + data
Copy-Item -Recurse (Join-Path $ROOT "prisma\schema.prisma") (Join-Path $RESOURCES "prisma\") -Force
Copy-Item -Recurse (Join-Path $ROOT "prisma\migrations") (Join-Path $RESOURCES "prisma\migrations") -Force
Copy-Item -Recurse (Join-Path $ROOT "prisma\data") (Join-Path $RESOURCES "prisma\data") -Force
Write-Host "  [OK] Copied Prisma files"

# Copy .env.defaults
Copy-Item (Join-Path $ROOT ".env.defaults") $RESOURCES -Force

# Write version file
$Version | Out-File -FilePath (Join-Path $RESOURCES "version.txt") -Encoding utf8

# ── Download macOS Node.js ──
Write-Host "[4/5] Downloading macOS Node.js (arm64)..."
$NODE_VERSION = "22.17.0"
$NODE_URL = "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-darwin-arm64.tar.gz"
$NODE_TGZ = Join-Path $env:TEMP "node-mac.tar.gz"
$NODE_EXTRACT = Join-Path $env:TEMP "node-mac-extract"

try {
    Write-Host "  Downloading from $NODE_URL..."
    Invoke-WebRequest -Uri $NODE_URL -OutFile $NODE_TGZ -UseBasicParsing
    Write-Host "  Extracting..."
    New-Item -ItemType Directory -Force -Path $NODE_EXTRACT | Out-Null
    tar -xzf $NODE_TGZ -C $NODE_EXTRACT
    $EXTRACTED_DIR = Get-ChildItem $NODE_EXTRACT | Select-Object -First 1
    $NODE_BIN_SRC = Join-Path $EXTRACTED_DIR.FullName "bin\node"
    if (Test-Path $NODE_BIN_SRC) {
        Copy-Item $NODE_BIN_SRC (Join-Path $RESOURCES "node\bin\node") -Force
        Write-Host "  [OK] Node.js v$NODE_VERSION bundled"
    } else {
        Write-Host "  [WARN] Could not find node binary, app will require system Node.js"
    }
    Remove-Item $NODE_TGZ -Force -ErrorAction SilentlyContinue
    Remove-Item $NODE_EXTRACT -Recurse -Force -ErrorAction SilentlyContinue
} catch {
    Write-Host "  [WARN] Failed to download Node.js: $_"
    Write-Host "  App will fall back to system Node.js on macOS"
}

# ── Create ZIP ──
Write-Host "[5/5] Creating distributable ZIP..."
$ZIP_NAME = "TCM-Clinic-Assistant-v$Version-mac.zip"
$ZIP_PATH = Join-Path $BUILD_DIR $ZIP_NAME

# Clean up any macOS metadata from the bundle (especially .DS_Store)
Get-ChildItem -Recurse $APP_BUNDLE -Filter ".DS_Store" -ErrorAction SilentlyContinue | Remove-Item -Force

Compress-Archive -Path $APP_BUNDLE -DestinationPath $ZIP_PATH -Force
Write-Host "  [OK] Created $ZIP_NAME"

# ── Summary ──
Write-Host ""
Write-Host "============================================"
Write-Host "  Build Complete!"
Write-Host "============================================"
Write-Host ""
Write-Host "  Output: $BUILD_DIR"
Write-Host "  ZIP:    $ZIP_PATH"
Write-Host ""
Write-Host "  To create a DMG:"
Write-Host "  1. Copy the ZIP to a Mac"
Write-Host "  2. Unzip it: unzip $ZIP_NAME"
Write-Host "  3. Run: bash scripts/create-dmg.sh $Version"
Write-Host ""
