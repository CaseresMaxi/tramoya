@echo off
rem Doble clic (Windows): abre el estudio de Tramoya con este proyecto en el navegador.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Falta Node.js ^(18 o mas nuevo^). Bajalo de https://nodejs.org, instalalo y volve a abrir este archivo.
  pause
  exit /b 1
)
node herramientas\tramoya.mjs estudio
pause
