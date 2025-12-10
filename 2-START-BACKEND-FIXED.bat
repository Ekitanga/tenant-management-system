@echo off
echo ========================================
echo   SPIRALDART TMS - BACKEND SERVER
echo ========================================
echo.

REM Check if we're in the right directory
if not exist backend (
    echo ERROR: backend folder not found!
    echo.
    echo Please make sure you:
    echo   1. Extracted spiraldart-tms-WORKING.tar.gz
    echo   2. Renamed spiraldart-tms-final to spiraldart-tms
    echo   3. Put this batch file IN the spiraldart-tms folder
    echo   4. Run it from there
    echo.
    echo Current directory: %CD%
    echo Expected: C:\Projects\spiraldart-tms
    echo.
    pause
    exit /b 1
)

echo Entering backend folder...
cd backend

echo.
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo Node.js: OK

echo.
echo Checking if dependencies installed...
if not exist node_modules (
    echo Dependencies not found. Installing now...
    echo This will take 1-2 minutes...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
    echo Dependencies installed!
) else (
    echo Dependencies: OK
)

echo.
echo Checking if database exists...
if not exist spiraldart.db (
    echo Database not found. Creating it now...
    echo.
    call npm run init-db
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Failed to create database!
        pause
        exit /b 1
    )
    echo.
    echo Database created with default users!
) else (
    echo Database: OK
)

echo.
echo ========================================
echo   Starting Backend Server...
echo ========================================
echo.
echo Server will start on: http://localhost:5000
echo Health check: http://localhost:5000/health
echo.
echo KEEP THIS WINDOW OPEN!
echo Press Ctrl+C to stop the server
echo.
echo ========================================

call npm start

pause
