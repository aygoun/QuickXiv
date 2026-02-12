#!/bin/bash

# Script to package QuickXiv extension for Chrome Web Store submission
# Creates a ZIP file with all necessary extension files

EXTENSION_NAME="QuickXiv"
VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
OUTPUT_FILE="${EXTENSION_NAME}-v${VERSION}.zip"

echo "📦 Packaging ${EXTENSION_NAME} v${VERSION}..."

# Remove old zip if it exists
if [ -f "$OUTPUT_FILE" ]; then
    rm "$OUTPUT_FILE"
    echo "🗑️  Removed old package"
fi

# Create zip file excluding unnecessary files
zip -r "$OUTPUT_FILE" . \
    -x "*.git*" \
    -x "*.DS_Store" \
    -x "*.env*" \
    -x "package-extension.sh" \
    -x "*.zip" \
    -x "README.md" \
    -x "LICENSE" \
    -x "assets/*" \
    > /dev/null

# Check if zip was created successfully
if [ -f "$OUTPUT_FILE" ]; then
    SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "✅ Successfully created: $OUTPUT_FILE ($SIZE)"
    echo ""
    echo "📋 Files included:"
    unzip -l "$OUTPUT_FILE" | tail -n +4 | sed '$d' | sed '$d'
    echo ""
    echo "🚀 Ready for Chrome Web Store submission!"
    echo "   Upload this file at: https://chrome.google.com/webstore/devconsole"
else
    echo "❌ Failed to create package"
    exit 1
fi
