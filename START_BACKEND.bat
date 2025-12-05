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
    call npm install
    echo.
)

:: Check if database exists
if not exist "db\moda.db" (
    echo Initializing database...
    echo.
    call npm run db:init
    echo.
    echo Seeding sample data...
    call npm run db:seed
    echo.
)

echo Starting MODA Backend API Server...
echo.
call npm start

pause
