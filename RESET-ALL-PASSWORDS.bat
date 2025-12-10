@echo off
echo ========================================
echo   RESET ALL DEFAULT PASSWORDS
echo ========================================
echo.
echo This will reset all user passwords to defaults:
echo   - admin: admin123
echo   - landlord: landlord123
echo   - john.mwangi: tenant123
echo   - mary.akinyi: tenant123
echo.
echo Press Ctrl+C to cancel, or
pause

cd backend

echo.
echo Resetting admin password...
node reset-password.js admin admin123

echo.
echo Resetting landlord password...
node reset-password.js landlord landlord123

echo.
echo Checking for tenants...
node -e "const db=require('./database');const tenants=db.prepare('SELECT u.username FROM tenants t JOIN users u ON t.user_id=u.id').all();tenants.forEach(t=>console.log(t.username));db.close();" > temp_tenants.txt

for /f "tokens=*" %%a in (temp_tenants.txt) do (
    echo.
    echo Resetting password for tenant: %%a
    node reset-password.js %%a tenant123
)

del temp_tenants.txt

echo.
echo ========================================
echo   ALL PASSWORDS RESET!
echo ========================================
echo.
echo You can now login with default passwords:
echo   admin / admin123
echo   landlord / landlord123
echo   john.mwangi / tenant123
echo   mary.akinyi / tenant123
echo.

pause
