@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Bitte zuerst Node.js 24 oder neuer installieren.
  pause
  exit /b 1
)
echo Wurzelwerk starten. Danach http://127.0.0.1:4173 im Browser oeffnen.
node server.mjs
pause
