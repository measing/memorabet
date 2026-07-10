@echo off
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js.
  echo Instala Node.js o abre la carpeta con Live Server en VS Code.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:4173/index.html"
node servidor-local.js
pause
