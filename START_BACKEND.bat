@echo off
echo.
echo ========================================
echo   MODA Backend Server Startup
echo ========================================
echo.

cd /d "%~dp0backend"

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    echo.
    cmd /c npm install
    echo.
)

:: Check if database exists
if not exist "db\moda.db" (
    echo Initializing database...
    echo.
    cmd /c npm run db:init
    echo.
    echo Seeding sample data...
    cmd /c npm run db:seed
    echo.
)

echo Starting MODA Backend API Server...
echo.
cmd /c npm start

pause
