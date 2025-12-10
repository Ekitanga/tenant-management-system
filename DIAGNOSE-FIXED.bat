@echo off
echo ========================================
echo   SPIRALDART TMS - DIAGNOSTIC TOOL
echo ========================================
echo.
echo Running diagnostics...
echo.

REM Check if we're in the right directory
if not exist backend (
    echo ERROR: backend folder not found!
    echo.
    echo Please make sure you run this from:
    echo C:\Projects\spiraldart-tms\
    echo.
    echo Current directory is: %CD%
    echo.
    pause
    exit /b 1
)

cd backend

echo ========================================
echo 1. CHECKING FILES
echo ========================================
echo.

echo Checking if backend files exist...
if exist package.json (echo [OK] package.json found) else (echo [MISSING] package.json)
if exist server.js (echo [OK] server.js found) else (echo [MISSING] server.js)
if exist database.js (echo [OK] database.js found) else (echo [MISSING] database.js)
if exist middleware.js (echo [OK] middleware.js found) else (echo [MISSING] middleware.js)
if exist routes.js (echo [OK] routes.js found) else (echo [MISSING] routes.js)
if exist initDatabase.js (echo [OK] initDatabase.js found) else (echo [MISSING] initDatabase.js)
if exist .env (echo [OK] .env found) else (echo [MISSING] .env)

echo.
echo Checking if database exists...
if exist spiraldart.db (
    echo [OK] spiraldart.db found
    for %%A in (spiraldart.db) do echo     Size: %%~zA bytes
) else (
    echo [PROBLEM] spiraldart.db NOT FOUND!
    echo     This is why login fails - no database!
)

echo.
echo Checking if node_modules installed...
if exist node_modules (echo [OK] node_modules installed) else (echo [PROBLEM] node_modules NOT installed!)

echo.
echo ========================================
echo 2. CHECKING NODE.JS
echo ========================================
echo.
node --version 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed!
    echo Please install from: https://nodejs.org/
) else (
    echo [OK] Node.js is installed
)

npm --version 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is NOT installed!
) else (
    echo [OK] npm is installed
)

echo.
echo ========================================
echo 3. SUMMARY
echo ========================================
echo.

if not exist spiraldart.db (
    echo MAIN PROBLEM: Database file not found!
    echo.
    echo This is why you cannot login.
    echo.
) else (
    echo Database file exists. Problem might be elsewhere.
    echo.
)

if not exist node_modules (
    echo PROBLEM: Dependencies not installed!
    echo.
)

echo.
echo ========================================
echo 4. AUTO-FIX
echo ========================================
echo.
echo Would you like me to fix these issues?
echo This will:
echo   1. Install dependencies (npm install)
echo   2. Create/recreate database
echo   3. Add default users
echo.
echo Press any key to AUTO-FIX, or close window to cancel...
pause >nul

echo.
echo Starting auto-fix...
echo.

echo Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

echo Step 2: Deleting old database (if exists)...
if exist spiraldart.db (
    del spiraldart.db
    echo [OK] Old database deleted
) else (
    echo [INFO] No old database to delete
)
echo.

echo Step 3: Creating new database...
call npm run init-db
if %errorlevel% neq 0 (
    echo [ERROR] Database creation failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo   AUTO-FIX COMPLETE!
echo ========================================
echo.
echo If you saw:
echo   [OK] Admin user created
echo   [OK] Landlord user created
echo   [OK] Tenant users created
echo.
echo Then your system is ready!
echo.
echo Next steps:
echo   1. Close this window
echo   2. Run: 2-START-BACKEND.bat
echo   3. Run: 3-START-FRONTEND.bat
echo   4. Login with: admin / admin123
echo.

pause
