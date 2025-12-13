@echo off
setlocal enabledelayedexpansion

:: Get current date and time for backup folder name
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set BACKUP_DATE=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%%datetime:~10,2%

:: Set paths - use local Documents (not OneDrive) for faster backups
set SOURCE_DIR=C:\Projects\Autovol MODA\Autovol MODA 12525 0543\MODA
set BACKUP_ROOT=C:\Projects\Autovol MODA\Backups
set BACKUP_DIR=%BACKUP_ROOT%\MODA-Backup-%BACKUP_DATE%

:: Create backup root if it doesn't exist
if not exist "%BACKUP_ROOT%" mkdir "%BACKUP_ROOT%"

echo.
echo ============================================
echo   MODA Dashboard - Full Project Backup
echo ============================================
echo.
echo Source:      %SOURCE_DIR%
echo Destination: %BACKUP_DIR%
echo.

:: Check if backup already exists
if exist "%BACKUP_DIR%" (
    echo WARNING: A backup from this time already exists!
    set /p OVERWRITE="Overwrite? (Y/N): "
    if /i not "!OVERWRITE!"=="Y" (
        echo Backup cancelled.
        pause
        exit /b
    )
    rmdir /s /q "%BACKUP_DIR%"
)

echo Creating backup...
echo.

:: Use robocopy for reliable copying (excludes node_modules if present)
robocopy "%SOURCE_DIR%" "%BACKUP_DIR%" /E /XD "node_modules" ".git" /XF "*.log" /NFL /NDL /NJH /NJS

if %ERRORLEVEL% LEQ 7 (
    echo.
    echo ============================================
    echo   BACKUP COMPLETE!
    echo ============================================
    echo.
    echo Backup saved to:
    echo %BACKUP_DIR%
    echo.
    echo To restore, copy contents back to:
    echo %SOURCE_DIR%
    echo.
) else (
    echo.
    echo ERROR: Backup may have failed. Check the destination folder.
    echo.
)

:: List recent backups
echo Recent backups:
echo ---------------
dir "%BACKUP_ROOT%" /b /ad /o-d 2>nul | findstr /n "^" | findstr "^[1-5]:"

echo.
pause
