@echo off
echo ========================================
echo Building and Syncing Android Project
echo ========================================
echo.

echo [1/3] Building React project...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo ✓ Build completed successfully
echo.

echo [2/3] Syncing Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Sync failed!
    pause
    exit /b 1
)
echo ✓ Sync completed successfully
echo.

echo [3/3] Opening Android Studio...
call npx cap open android
if %errorlevel% neq 0 (
    echo WARNING: Could not open Android Studio automatically
    echo Please open Android Studio manually and select: frontend\android
)
echo.

echo ========================================
echo Done! Android Studio should open now.
echo ========================================
pause

