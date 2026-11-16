#!/bin/sh
# Builds the Chrome Web Store upload: the extension files only, without tests, docs or store images.
set -e
cd "$(dirname "$0")/.."
zip="dist/out-of-frame-$(node -p "require('./manifest.json').version").zip"
mkdir -p dist
rm -f "$zip"
zip -qr "$zip" manifest.json background.js content.js shared.js precover.css options.html options.js _locales icons \
  -x 'icons/icon.svg' '*.DS_Store'
echo "$zip"
