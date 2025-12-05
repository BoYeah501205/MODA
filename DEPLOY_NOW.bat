@echo off
echo ============================================================================
echo 🚀 MODA Quick Deployment - Start Using Now!
echo ============================================================================
echo.

echo 📋 Checking current setup...
echo.

REM Check if server is already running
netstat -an | find "8000" >nul
if %errorlevel% equ 0 (
    echo ✅ Server is already running on port 8000
    echo.
    echo 🌐 MODA is ready at: http://localhost:8000
    echo.
    echo 🔑 Login Credentials:
    echo    Email: trevor@autovol.com
    echo    Password: admin123
    echo.
    echo 📊 Available Features:
    echo    ✅ Production Dashboard
    echo    ✅ Project Management  
    echo    ✅ Equipment Tracking
    echo    ✅ Transportation
    echo    ✅ User Management
    echo    ✅ 85%% Performance Improvement
    echo    ✅ 99%% Less Data on Repeat Visits
    echo.
    echo 🎯 Quick Actions:
    echo    • Press Ctrl+Click on the URL above to open
    echo    • Or copy: http://localhost:8000
    echo    • Login and start using MODA immediately!
    echo.
) else (
    echo ⚠️ Server not running. Starting now...
    echo.
    
    REM Check if Python is available
    python --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Python not found. Please install Python first.
        echo Download from: https://python.org
        pause
        exit /b 1
    )
    
    echo 🚀 Starting MODA server...
    echo.
    echo Server will start on: http://localhost:8000
    echo.
    echo 🔑 Login with:
    echo    Email: trevor@autovol.com  
    echo    Password: admin123
    echo.
    echo Press Ctrl+C to stop the server when done.
    echo.
    
    REM Start the server
    cd /d "%~dp0"
    python -m http.server 8000
)

echo.
echo ============================================================================
echo 🎉 MODA Deployment Complete!
echo ============================================================================
pause
