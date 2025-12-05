@echo off
echo Starting local web server for MODA Optimized...
echo.
echo Once started, open your browser to:
echo http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
python -m http.server 8000
