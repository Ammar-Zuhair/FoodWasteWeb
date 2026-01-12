#!/bin/bash

echo "========================================"
echo "Building and Syncing Android Project"
echo "========================================"
echo ""

echo "[1/3] Building React project..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi
echo "✓ Build completed successfully"
echo ""

echo "[2/3] Syncing Capacitor..."
npx cap sync android
if [ $? -ne 0 ]; then
    echo "ERROR: Sync failed!"
    exit 1
fi
echo "✓ Sync completed successfully"
echo ""

echo "[3/3] Opening Android Studio..."
npx cap open android
if [ $? -ne 0 ]; then
    echo "WARNING: Could not open Android Studio automatically"
    echo "Please open Android Studio manually and select: frontend/android"
fi
echo ""

echo "========================================"
echo "Done! Android Studio should open now."
echo "========================================"

