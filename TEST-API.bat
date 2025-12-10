@echo off
echo ========================================
echo   SPIRALDART TMS - API TESTER
echo ========================================
echo.
echo Testing backend API endpoints...
echo.

echo 1. Testing Health Check...
curl -s http://localhost:5000/health
echo.
echo.

echo 2. Testing Login...
echo (This will fail without credentials, but shows API is responding)
curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"test\",\"password\":\"test\"}"
echo.
echo.

echo 3. Checking if backend is running...
curl -s http://localhost:5000/health > nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend is running on port 5000
) else (
    echo [ERROR] Backend is NOT running!
    echo Please start it with: 2-START-BACKEND-FIXED.bat
)
echo.

echo 4. Checking if frontend is accessible...
curl -s http://localhost:3000 > nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend is accessible on port 3000
) else (
    echo [ERROR] Frontend is NOT running!
    echo Please start it with: 3-START-FRONTEND-FIXED.bat
)
echo.

echo ========================================
echo.
pause
