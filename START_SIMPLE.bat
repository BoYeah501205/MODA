@echo off
echo Starting MODA Dashboard Server...
echo.
echo Server will start at: http://localhost:8000
echo.
cd /d "%~dp0"
start http://localhost:8000/index.html
php -S localhost:8000
