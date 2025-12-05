@echo off
setlocal enabledelayedexpansion

set BACKUP_ROOT=C:\Users\Fletcher\Documents\MODA-Backups
set CURRENT_DIR=%~dp0

echo.
echo ============================================
echo   MODA Dashboard - Restore from Backup
echo ============================================
echo.

:: Check if backup folder exists
if not exist "%BACKUP_ROOT%" (
    echo ERROR: No backups found at %BACKUP_ROOT%
    echo Run BACKUP_PROJECT.bat first to create a backup.
    pause
    exit /b
)

:: List available backups
echo Available backups:
echo ------------------
set count=0
for /f "delims=" %%D in ('dir "%BACKUP_ROOT%" /b /ad /o-d 2^>nul') do (
    set /a count+=1
    set "backup[!count!]=%%D"
    echo !count!. %%D
)

if %count%==0 (
    echo No backups found.
    pause
    exit /b
)

echo.
set /p CHOICE="Enter backup number to restore (or 0 to cancel): "

if "%CHOICE%"=="0" (
    echo Restore cancelled.
    pause
    exit /b
)

:: Validate choice
set "SELECTED=!backup[%CHOICE%]!"
if "%SELECTED%"=="" (
    echo Invalid selection.
    pause
    exit /b
)

set RESTORE_FROM=%BACKUP_ROOT%\%SELECTED%

echo.
echo WARNING: This will REPLACE all files in:
echo %CURRENT_DIR%
echo.
echo With files from:
echo %RESTORE_FROM%
echo.
set /p CONFIRM="Are you SURE? Type YES to confirm: "

if /i not "%CONFIRM%"=="YES" (
    echo Restore cancelled.
    pause
    exit /b
)

echo.
echo Creating safety backup of current state...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set SAFETY_DATE=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%%datetime:~10,2%
set SAFETY_DIR=%BACKUP_ROOT%\MODA-PreRestore-%SAFETY_DATE%

robocopy "%CURRENT_DIR%" "%SAFETY_DIR%" /E /XD "node_modules" ".git" /XF "*.log" /NFL /NDL /NJH /NJS

echo.
echo Restoring from backup...

:: Delete current files (except backups folder and bat files we're running)
for /d %%D in ("%CURRENT_DIR%*") do (
    if /i not "%%~nxD"=="backups" (
        rmdir /s /q "%%D" 2>nul
    )
)
for %%F in ("%CURRENT_DIR%*") do (
    if /i not "%%~xF"==".bat" (
        del /q "%%F" 2>nul
    )
)

:: Copy from backup
robocopy "%RESTORE_FROM%" "%CURRENT_DIR%" /E /XD "node_modules" ".git" /NFL /NDL /NJH /NJS

echo.
echo ============================================
echo   RESTORE COMPLETE!
echo ============================================
echo.
echo Restored from: %SELECTED%
echo Safety backup: MODA-PreRestore-%SAFETY_DATE%
echo.
echo Please refresh your browser and IDE.
echo.
pause
