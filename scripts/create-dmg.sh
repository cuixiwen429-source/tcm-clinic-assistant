#!/bin/bash
set -e

APP_NAME="TCM Clinic Assistant"
VERSION="${1:-0.1.0}"
DMG_NAME="TCM-Clinic-Assistant-${VERSION}.dmg"
STAGING="dmg-staging"

echo "=== Creating DMG: ${DMG_NAME} ==="

rm -rf "$STAGING"
mkdir -p "$STAGING"

if [ ! -d "${APP_NAME}.app" ]; then
  echo "ERROR: ${APP_NAME}.app not found in current directory"
  echo "Run build-mac-app.ps1 first, then copy the output here."
  exit 1
fi

# Fix permissions (lost when transferring from Windows)
echo "=== Fixing permissions ==="
chmod +x "${APP_NAME}.app/Contents/MacOS/launcher"
xattr -cr "${APP_NAME}.app" 2>/dev/null || true
echo "[OK]"

cp -R "${APP_NAME}.app" "$STAGING/"
ln -s /Applications "$STAGING/Applications"

hdiutil create -volname "$APP_NAME" \
  -srcfolder "$STAGING" \
  -ov -format UDZO \
  -imagekey zlib-level=9 \
  "$DMG_NAME"

rm -rf "$STAGING"
echo "=== Done: $DMG_NAME ==="
