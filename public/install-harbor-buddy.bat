@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "RAW=https://raw.githubusercontent.com/crisesarmiento/anno-1800-expert-buddy/main/public"
if not exist "install-harbor-buddy.ps1" (
  echo Falta install-harbor-buddy.ps1. Lo bajo...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%RAW%/install-harbor-buddy.ps1' -OutFile 'install-harbor-buddy.ps1'"
)
if not exist "install-harbor-buddy.ps1" (
  echo No pude bajar el .ps1. En Harbor Buddy descarga tambien PowerShell (.ps1) a esta misma carpeta.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "install-harbor-buddy.ps1"
if errorlevel 1 (
  echo.
  echo Si Windows bloqueo el script: clic derecho, Mas info, Ejecutar de todas formas.
)
echo.
pause
