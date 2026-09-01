@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "RAW=https://raw.githubusercontent.com/crisesarmiento/anno-1800-expert-buddy/main/public"
if not exist "watch-harbor-live.ps1" (
  echo Falta watch-harbor-live.ps1. Lo bajo...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%RAW%/watch-harbor-live.ps1' -OutFile 'watch-harbor-live.ps1'"
)
if not exist "harbor-catalog.json" (
  echo Falta harbor-catalog.json. Lo bajo...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%RAW%/harbor-catalog.json' -OutFile 'harbor-catalog.json'"
)
if not exist "watch-harbor-live.ps1" (
  echo No pude bajar el .ps1. En Harbor Buddy descarga Vigilante (.bat) y PowerShell (.ps1) a Descargas.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "watch-harbor-live.ps1"
if errorlevel 1 pause
