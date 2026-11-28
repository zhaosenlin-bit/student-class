@echo off
rem ============================================================
rem  Le Qi Xiang course library - local preview
rem
rem  Double-click this file.
rem  If the library is already running, the browser opens straight
rem  to it.  If it is not, this starts it and opens the browser
rem  as soon as it answers.
rem ============================================================
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :nonode

node "%~dp0tools\launch-library.mjs" %*
if errorlevel 1 pause
exit /b 0

:nonode
echo.
echo Node.js was not found on this machine.
echo Install Node.js 18 or newer, then double-click this file again.
echo.
pause
exit /b 1
