@echo off
chcp 65001 > nul
title Watch Mode - Android Studio Auto Sync
color 0A

echo.
echo ========================================
echo   Watch Mode - Android Studio Sync
echo ========================================
echo.
echo This will watch for changes and auto-sync
echo with Android Studio when you edit files.
echo.
echo Press Ctrl+C to stop watching
echo.
echo ========================================
echo.

cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Check if package.json exists
if not exist "package.json" (
    echo [ERROR] package.json not found
    echo Please run this script from the frontend directory
    pause
    exit /b 1
)

REM Run the watch script
echo [INFO] Starting watch mode...
echo.
node watch-and-sync.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Watch mode failed to start
    echo.
    pause
)













