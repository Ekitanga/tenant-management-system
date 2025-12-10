@echo off
echo ========================================
echo   SPIRALDART TMS - PASSWORD RESET
echo ========================================
echo.

if "%1"=="" (
    echo Usage: RESET-PASSWORD.bat username newpassword
    echo.
    echo Examples:
    echo   RESET-PASSWORD.bat admin newpass123
    echo   RESET-PASSWORD.bat john.mwangi tenant123
    echo.
    echo Available users:
    echo.
    cd backend
    node -e "const db=require('./database');const users=db.prepare('SELECT id,username,role FROM users').all();console.table(users);db.close();"
    echo.
    pause
    exit /b 1
)

if "%2"=="" (
    echo Error: Password not provided!
    echo.
    echo Usage: RESET-PASSWORD.bat username newpassword
    echo.
    pause
    exit /b 1
)

cd backend

echo Resetting password for: %1
echo New password: %2
echo.

node reset-password.js %1 %2

pause
