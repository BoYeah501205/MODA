@echo off
echo.
echo ========================================
echo   MODA Development Environment
echo ========================================
echo.

:: Start Backend in a new window
echo Starting Backend Server...
start "MODA Backend" cmd /c "cd /d "%~dp0backend" && npm start"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend in a new window
echo Starting Frontend Dev Server...
start "MODA Frontend" cmd /c "cd /d "%~dp0" && npm run dev"

echo.
echo ========================================
echo   Both servers starting...
echo ========================================
echo.
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:8000
echo.
echo   Network:  http://192.168.0.64:8000
echo             (Share this with your team!)
echo.
echo   Press any key to open the app...
echo ========================================
pause > nul

:: Open browser
start http://localhost:8000
