@echo off
setlocal
cd /d "%~dp0"
echo Starting Echo-Prompter on http://localhost:4173
start "" http://localhost:4173
node server.js
echo.
echo Echo-Prompter stopped. Press any key to close this window.
pause >nul
