@echo off
echo.
echo ========================================
echo   MODA - Modular Operations Dashboard
echo ========================================
echo.

:: Start Backend in a new window
echo Starting Backend Server...
start "MODA Backend" cmd /c "cd /d "%~dp0backend" && npm start"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend Server
echo Starting Frontend Server...
start "MODA Frontend" cmd /c "cd /d "%~dp0" && node server.cjs"

echo.
echo ========================================
echo   MODA is running!
echo ========================================
echo.
echo   Backend API:  http://localhost:3001
echo   Frontend:     http://localhost:8000
echo.
echo   Network Access (share with team):
echo   http://192.168.0.64:8000
echo.
echo   Press any key to open the app...
echo ========================================
pause > nul

:: Open browser
start http://localhost:8000
