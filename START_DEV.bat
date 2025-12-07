@echo off
echo.
echo ========================================
echo   MODA - Development Mode
echo   Hot Reload Enabled
echo ========================================
echo.

:: Start Backend in a new window
echo Starting Backend Server...
start "MODA Backend" cmd /c "cd /d "%~dp0backend" && npm start"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend Dev Server (with hot reload)
echo Starting Frontend Dev Server...
start "MODA Frontend Dev" cmd /c "cd /d "%~dp0" && npm run dev"

echo.
echo ========================================
echo   Development servers starting...
echo ========================================
echo.
echo   Backend API:  http://localhost:3001
echo   Frontend:     http://localhost:8000
echo.
echo   Hot reload is enabled - changes will
echo   appear automatically in the browser.
echo.
echo   Press any key to open the app...
echo ========================================
pause > nul

:: Open browser
start http://localhost:8000
