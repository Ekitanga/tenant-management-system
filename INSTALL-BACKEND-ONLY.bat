@echo off
echo ========================================
echo   INSTALL BACKEND DEPENDENCIES
echo ========================================
echo.

cd backend

echo Cleaning old installation...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul

echo.
echo Installing dependencies...
echo This may take 2-3 minutes...
echo.

npm install

echo.
echo Checking installation...
npm list better-sqlite3 express dotenv bcryptjs jsonwebtoken cors

echo.
echo Creating database...
npm run init-db

echo.
echo Done! Try running 2-START-BACKEND-FIXED.bat now
echo.
pause
