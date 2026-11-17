@echo off
rem Starts the course on this machine and opens it in the browser.
rem The course is written as modules, and a browser will not read a
rem module from a file, so a small local server hands it out instead.
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if not errorlevel 1 goto :node
where py >nul 2>nul
if not errorlevel 1 goto :py
where python >nul 2>nul
if not errorlevel 1 goto :python

echo Neither Node.js nor Python was found on this machine.
echo Opening the file directly; the course may not draw.
start "" "%~dp0{{COURSE}}"
exit /b 0

:node
node "%~dp0serve.mjs" "%~dp0" "{{COURSE}}"
exit /b 0

:py
py -3 "%~dp0serve.py" "%~dp0" "{{COURSE}}"
exit /b 0

:python
python "%~dp0serve.py" "%~dp0" "{{COURSE}}"
exit /b 0
