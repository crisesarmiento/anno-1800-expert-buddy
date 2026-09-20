# Windows counterpart of startup.sh. Keep the same npm dev entrypoint.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
try {
  $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/' -TimeoutSec 2
  if ($response.StatusCode -eq 200) { exit 0 }
} catch { }
$logDir = Join-Path $PSScriptRoot 'tmp'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run dev' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'dev.stdout.log') -RedirectStandardError (Join-Path $logDir 'dev.stderr.log')
