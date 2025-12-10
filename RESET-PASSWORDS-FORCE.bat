@echo off
echo ========================================
echo   FORCE PASSWORD RESET
echo ========================================
echo.
echo This will:
echo   1. Kill all Node.js processes
echo   2. Reset all passwords to defaults
echo   3. Allow you to restart backend
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Step 1: Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js processes killed
) else (
    echo [INFO] No Node.js processes were running
)

echo.
echo Waiting 3 seconds for processes to fully stop...
timeout /t 3 /nobreak >nul

echo.
echo Step 2: Resetting passwords...
echo.

cd backend

echo Resetting admin password...
node reset-password.js admin admin123
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   ERROR: Still getting database locked?
    echo ========================================
    echo.
    echo Try these solutions:
    echo   1. Close ALL CMD windows
    echo   2. Restart your computer
    echo   3. Try again
    echo.
    pause
    exit /b 1
)

echo.
echo Resetting landlord password...
node reset-password.js landlord landlord123

echo.
echo Checking for other tenants...
node -e "const db=require('./database');const tenants=db.prepare('SELECT u.username FROM tenants t JOIN users u ON t.user_id=u.id WHERE u.username NOT IN (?,?)').all('admin','landlord');tenants.forEach(t=>console.log(t.username));db.close();" 2>nul > temp_tenants.txt

for /f "tokens=*" %%a in (temp_tenants.txt) do (
    echo.
    echo Resetting password for tenant: %%a
    node reset-password.js %%a tenant123
)

del temp_tenants.txt 2>nul

cd ..

echo.
echo ========================================
echo   SUCCESS! ALL PASSWORDS RESET
echo ========================================
echo.
echo Default passwords restored:
echo   admin / admin123
echo   landlord / landlord123
echo   All tenants / tenant123
echo.
echo Now start the backend:
echo   cd backend
echo   npm start
echo.
echo Then login at: http://localhost:3000
echo.

pause
