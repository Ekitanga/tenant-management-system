@echo off
echo ========================================
echo   FIX DEPENDENCIES - FORCE REINSTALL
echo ========================================
echo.
echo This will reinstall all dependencies properly.
echo.
pause

REM Check if we're in the right directory
if not exist backend (
    echo ERROR: backend folder not found!
    echo Please run this from: C:\Projects\spiraldart-tms\
    echo.
    pause
    exit /b 1
)

echo ========================================
echo STEP 1: Cleaning Backend
echo ========================================
echo.

cd backend

echo Deleting old node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo Old node_modules deleted
) else (
    echo No old node_modules found
)

echo.
echo Deleting package-lock.json...
if exist package-lock.json (
    del package-lock.json
    echo package-lock.json deleted
) else (
    echo No package-lock.json found
)

echo.
echo ========================================
echo STEP 2: Installing Backend Dependencies
echo ========================================
echo.
echo This will take 2-3 minutes...
echo.

call npm install

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo ERROR: npm install failed!
    echo ========================================
    echo.
    echo Try these solutions:
    echo 1. Check your internet connection
    echo 2. Run CMD as Administrator
    echo 3. Install build tools: npm install -g windows-build-tools
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo STEP 3: Verifying Installation
echo ========================================
echo.

echo Checking for critical packages...
if exist node_modules\better-sqlite3 (
    echo [OK] better-sqlite3 installed
) else (
    echo [MISSING] better-sqlite3
    echo Trying to install manually...
    call npm install better-sqlite3
)

if exist node_modules\express (
    echo [OK] express installed
) else (
    echo [MISSING] express
)

if exist node_modules\dotenv (
    echo [OK] dotenv installed
) else (
    echo [MISSING] dotenv
)

if exist node_modules\bcryptjs (
    echo [OK] bcryptjs installed
) else (
    echo [MISSING] bcryptjs
)

if exist node_modules\jsonwebtoken (
    echo [OK] jsonwebtoken installed
) else (
    echo [MISSING] jsonwebtoken
)

if exist node_modules\cors (
    echo [OK] cors installed
) else (
    echo [MISSING] cors
)

echo.
echo ========================================
echo STEP 4: Creating Database
echo ========================================
echo.

if exist spiraldart.db (
    echo Database already exists. Deleting old one...
    del spiraldart.db
)

echo Creating new database...
call npm run init-db

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo ERROR: Database creation failed!
    echo ========================================
    echo.
    pause
    exit /b 1
)

echo.
cd ..

echo ========================================
echo STEP 5: Cleaning Frontend
echo ========================================
echo.

cd frontend

echo Deleting old node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo Old node_modules deleted
) else (
    echo No old node_modules found
)

echo.
echo Deleting package-lock.json...
if exist package-lock.json (
    del package-lock.json
    echo package-lock.json deleted
)

echo.
echo ========================================
echo STEP 6: Installing Frontend Dependencies
echo ========================================
echo.
echo This will take 2-3 minutes...
echo.

call npm install

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Frontend npm install failed!
    echo.
    pause
    exit /b 1
)

echo.
cd ..

echo.
echo ========================================
echo   SUCCESS! ALL DEPENDENCIES INSTALLED
echo ========================================
echo.
echo Backend dependencies: INSTALLED
echo Frontend dependencies: INSTALLED
echo Database: CREATED
echo.
echo Now you can start the servers:
echo   1. Run: 2-START-BACKEND-FIXED.bat
echo   2. Run: 3-START-FRONTEND-FIXED.bat
echo.
echo Default login:
echo   Username: admin
echo   Password: admin123
echo.

pause
