@echo off
REM ============================================
REM BACKUP_WINDSURF_CHATS.bat
REM Backs up Windsurf cascade and memories to Google Drive
REM Trigger: Say "Backup Chats" to Cascade
REM ============================================

set SOURCE=C:\Users\trevor\.codeium\windsurf
set BACKUP_ROOT=G:\My Drive\Windsurf Chat Backups

REM Create timestamped backup folder
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%%datetime:~10,2%
set BACKUP_DIR=%BACKUP_ROOT%\%TIMESTAMP%

echo ============================================
echo Windsurf Chat Backup
echo ============================================
echo Source: %SOURCE%
echo Destination: %BACKUP_DIR%
echo.

REM Create backup directory
mkdir "%BACKUP_DIR%" 2>nul

REM Backup cascade folder (conversation history)
echo Backing up cascade (conversations)...
xcopy "%SOURCE%\cascade" "%BACKUP_DIR%\cascade\" /E /I /Y /Q

REM Backup memories folder
echo Backing up memories...
xcopy "%SOURCE%\memories" "%BACKUP_DIR%\memories\" /E /I /Y /Q

REM Also backup user settings
echo Backing up user settings...
copy "%SOURCE%\user_settings.pb" "%BACKUP_DIR%\" /Y >nul

echo.
echo ============================================
echo Backup complete!
echo Location: %BACKUP_DIR%
echo ============================================
pause
