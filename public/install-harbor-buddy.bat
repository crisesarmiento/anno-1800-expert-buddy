@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-harbor-buddy.ps1"
if errorlevel 1 (
  echo.
  echo Si Windows bloqueó el script: clic derecho → Más info → Ejecutar de todas formas.
)
echo.
pause
