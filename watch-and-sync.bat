@echo off
chcp 65001 > nul
echo ========================================
echo  Watch Mode for Android Studio Sync
echo ========================================
echo.
echo Watching for changes in src/ and dist/
echo Changes will sync automatically to Android Studio
echo.
echo Press Ctrl+C to stop
echo.

cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Run the watch script
node watch-and-sync.js

pause













