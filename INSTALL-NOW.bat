@echo off
title Custom TTRPG System - Quick Installer
setlocal enableextensions enabledelayedexpansion
color 0A

echo.
echo ================================================================
echo   Custom TTRPG System - Quick Installer
echo ================================================================
echo This will copy the system into your Foundry VTT Data directory.
echo.

REM Determine source (this folder)
set "SOURCE=%~dp0"

REM Try to auto-detect Foundry Data directory
set "DATA_DIR="
if defined FOUNDRY_DATA_PATH set "DATA_DIR=%FOUNDRY_DATA_PATH%"
if not defined DATA_DIR if exist "%LOCALAPPDATA%\FoundryVTT\Data" set "DATA_DIR=%LOCALAPPDATA%\FoundryVTT\Data"

if not defined DATA_DIR (
  echo Could not auto-detect your Foundry Data directory.
  set /p DATA_DIR=Enter your Foundry Data directory path (should end with \Data): 
)

if not exist "%DATA_DIR%" (
  echo ERROR: The path "%DATA_DIR%" does not exist.
  echo Please verify your Foundry Data folder and run again.
  pause
  exit /b 1
)

set "TARGET=%DATA_DIR%\systems\custom-ttrpg"
if not exist "%DATA_DIR%\systems" mkdir "%DATA_DIR%\systems"
if not exist "%TARGET%" mkdir "%TARGET%"

echo.
echo Copying files to:
echo   %TARGET%
echo.

REM Use robocopy to mirror files, exclude git and helper folders
robocopy "%SOURCE%" "%TARGET%" /E /NFL /NDL /NP /NJH /NJS ^
  /XD ".git" "node_modules" "Custom-ttrpg-V2-main" "mailbox" ^
  /XF ".gitignore" ".gitattributes"

if %ERRORLEVEL% GEQ 8 (
  echo.
  echo WARNING: robocopy reported issues (code %ERRORLEVEL%). Review output above.
) else (
  echo.
  echo Copy completed.
)

echo.
echo NEXT STEPS:
echo 1) Launch Foundry VTT
echo 2) Create/Open a world
echo 3) Game Settings -> Manage Systems -> select "Custom TTRPG System"
echo 4) Create a test character and open the sheet
echo.

echo If you later add large assets, keep them OUT of Git and store them in your Desktop\mailbox as needed.
echo.
pause
exit /b 0
