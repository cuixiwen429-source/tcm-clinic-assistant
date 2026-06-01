#!/bin/bash
set -e

APP_NAME="TCM-Clinic-Assistant"
VOLUME_NAME="TCM Clinic Assistant"
VERSION="${1:-0.1.0}"
DMG_NAME="TCM-Clinic-Assistant-${VERSION}.dmg"

echo "=== Creating DMG: ${DMG_NAME} ==="

if [ ! -d "$APP_NAME" ]; then
  echo "ERROR: $APP_NAME/ directory not found"
  echo "Usage: unzip the ZIP first, then run this script from the parent directory"
  echo "  unzip TCM-Clinic-Assistant-v$VERSION-mac.zip"
  echo "  bash $0 $VERSION"
  exit 1
fi

# Fix permissions that were lost in Windows ZIP
echo "=== Fixing permissions ==="
chmod +x "$APP_NAME/setup-mac.command"
xattr -cr "$APP_NAME" 2>/dev/null || true
echo "[OK]"

# Create staging
STAGING="dmg-staging"
rm -rf "$STAGING"
mkdir -p "$STAGING"
cp -R "$APP_NAME" "$STAGING/"

# Symlink to /Applications for drag-to-install
ln -s /Applications "$STAGING/Applications"

hdiutil create -volname "$VOLUME_NAME" \
  -srcfolder "$STAGING" \
  -ov -format UDZO \
  -imagekey zlib-level=9 \
  "$DMG_NAME"

rm -rf "$STAGING"
echo "=== Done: $DMG_NAME ==="
