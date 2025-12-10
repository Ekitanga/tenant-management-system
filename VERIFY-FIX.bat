@echo off
echo ========================================
echo   VERIFY FIX WAS APPLIED
echo ========================================
echo.

cd backend

echo Checking routes.js file...
echo.

for %%A in (routes.js) do (
    echo File size: %%~zA bytes
    if %%~zA LSS 37000 (
        echo [WARNING] File seems too small - might be old version!
    ) else if %%~zA GTR 39000 (
        echo [WARNING] File seems too large!
    ) else (
        echo [OK] File size looks correct
    )
)

echo.
echo Checking for SQL double-quote bug...
findstr /C:"status = \"active\"" routes.js >nul 2>&1
if %errorlevel% equ 0 (
    echo [FAILED] Double quotes still present! Fix NOT applied!
    echo.
    echo The file still has the bug. Please replace routes.js with routes-FINAL-FIX.js
) else (
    echo [OK] No double quotes found - fix appears to be applied!
)

echo.
echo Checking for logging statements...
findstr /C:"Creating lease with data" routes.js >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Logging statements found - enhanced version!
) else (
    echo [WARNING] Logging not found - might be old version
)

echo.
echo ========================================
echo   VERIFICATION COMPLETE
echo ========================================
echo.

pause
