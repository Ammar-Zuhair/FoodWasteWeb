#!/bin/bash

echo "========================================"
echo " Watch Mode for Android Studio Sync"
echo "========================================"
echo ""
echo "Watching for changes in src/ and dist/"
echo "Changes will sync automatically to Android Studio"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Run the watch script
node watch-and-sync.js






