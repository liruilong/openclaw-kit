#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_NAME="com.openclaw.filedrop"
HOST_SCRIPT="$SCRIPT_DIR/native-host/resolve_paths.py"

# Detect Chrome extension ID from command line or prompt
EXT_ID="${1:-}"
if [ -z "$EXT_ID" ]; then
  echo "Usage: $0 <chrome-extension-id>"
  echo ""
  echo "To find your extension ID:"
  echo "  1. Load the extension in chrome://extensions (Developer mode)"
  echo "  2. Copy the ID shown under the extension name"
  exit 1
fi

chmod +x "$HOST_SCRIPT"

# Native messaging host manifest directory for Chrome on macOS
MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
mkdir -p "$MANIFEST_DIR"

# Write the manifest
cat > "$MANIFEST_DIR/$HOST_NAME.json" << EOF
{
  "name": "$HOST_NAME",
  "description": "Resolve file paths for OpenClaw Control UI Enhancer",
  "path": "$HOST_SCRIPT",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXT_ID/"
  ]
}
EOF

echo "Native messaging host installed:"
echo "  Manifest: $MANIFEST_DIR/$HOST_NAME.json"
echo "  Script:   $HOST_SCRIPT"
echo "  Extension ID: $EXT_ID"
echo ""
echo "Restart Chrome to activate."
