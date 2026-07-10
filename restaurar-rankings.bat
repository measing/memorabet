@echo off
setlocal

if "%~1"=="" (
  echo Arrastra el JSON exportado de Firebase encima de este archivo.
  echo.
  echo Tambien puedes usar:
  echo node tools\restaurar-rankings-desde-export.js "C:\ruta\export.json"
  echo.
  pause
  exit /b 1
)

node "%~dp0tools\restaurar-rankings-desde-export.js" "%~1"
echo.
echo Listo. Revisa los archivos generados junto al export:
echo - rankingCups-restaurado.json
echo - rankingMedals-restaurado.json
echo.
pause
