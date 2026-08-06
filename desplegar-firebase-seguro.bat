@echo off
cd /d "%~dp0"

echo.
echo MemoraBet - despliegue seguro de Firebase
echo Proyecto: memorabet-77fea
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Instala Node.js antes de continuar.
  pause
  exit /b 1
)

echo 1/4 Instalando dependencias de Cloud Functions...
npm.cmd install --prefix functions
if errorlevel 1 (
  echo Fallo npm install en functions.
  pause
  exit /b 1
)

echo.
echo 2/4 Iniciando sesion en Firebase si hace falta...
npx.cmd --yes firebase-tools login
if errorlevel 1 (
  echo No se pudo iniciar sesion en Firebase.
  pause
  exit /b 1
)

echo.
echo 3/4 Desplegando Cloud Functions...
npx.cmd --yes firebase-tools deploy --only functions --project memorabet-77fea
if errorlevel 1 (
  echo Fallo el despliegue de Functions.
  pause
  exit /b 1
)

echo.
echo 4/4 Desplegando reglas de Realtime Database...
npx.cmd --yes firebase-tools deploy --only database --project memorabet-77fea
if errorlevel 1 (
  echo Fallo el despliegue de reglas.
  pause
  exit /b 1
)

echo.
echo Listo. Functions y reglas desplegadas.
echo Recuerda activar App Check solo despues de pegar la clave en app-check-config.js y subir la web.
echo.
pause
