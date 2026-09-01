# Harbor Buddy Telemetry — instalador
# Copia el mod a Documentos\Anno 1800\mods. No pide admin. No toca partidas.

$ErrorActionPreference = "Stop"

function Find-AnnoRoot {
  $candidates = @(
    (Join-Path $env:USERPROFILE "Documents\Anno 1800"),
    (Join-Path $env:USERPROFILE "OneDrive\Documents\Anno 1800")
  )
  $myDocs = [Environment]::GetFolderPath("MyDocuments")
  if ($myDocs) {
    $candidates += (Join-Path $myDocs "Anno 1800")
  }
  foreach ($path in $candidates) {
    if ($path -and (Test-Path -LiteralPath $path)) {
      return $path
    }
  }
  Write-Host "No encontré Anno 1800 en Documentos. ¿Lo instalaste?"
  $typed = Read-Host "Pegá la carpeta Anno 1800 (Enter para salir)"
  if (-not $typed) { exit 1 }
  $leaf = Split-Path -Leaf $typed.TrimEnd("\", "/")
  if ($leaf -ne "Anno 1800") {
    Write-Host "Solo copio adentro de una carpeta que se llame Anno 1800."
    exit 1
  }
  if (-not (Test-Path -LiteralPath $typed)) {
    Write-Host "Esa carpeta no existe."
    exit 1
  }
  return $typed
}

function Find-ModZip {
  $names = @("harbor-buddy-telemetry.zip")
  $places = @(
    $PSScriptRoot,
    (Join-Path $env:USERPROFILE "Downloads")
  )
  foreach ($place in $places) {
    foreach ($name in $names) {
      $candidate = Join-Path $place $name
      if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
  }
  Write-Host "No encontré harbor-buddy-telemetry.zip."
  Write-Host "Descargalo en Harbor Buddy y deja el zip en Descargas o junto a este instalador."
  exit 1
}

$anno = Find-AnnoRoot
$zip = Find-ModZip
$mods = Join-Path $anno "mods"
New-Item -ItemType Directory -Force -Path $mods | Out-Null

$tmp = Join-Path $anno "harbor-buddy-install-tmp"
if (Test-Path -LiteralPath $tmp) {
  Remove-Item -LiteralPath $tmp -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

try {
  Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
  $modinfo = Get-ChildItem -LiteralPath $tmp -Recurse -Filter "modinfo.json" | Select-Object -First 1
  if (-not $modinfo) {
    Write-Host "El zip no tiene modinfo.json. Descargá de nuevo harbor-buddy-telemetry.zip."
    exit 1
  }
  $src = $modinfo.Directory.FullName
  $dest = Join-Path $mods "harbor-buddy-telemetry"
  if (Test-Path -LiteralPath $dest) {
    Remove-Item -LiteralPath $dest -Recurse -Force
  }
  Copy-Item -LiteralPath $src -Destination $dest -Recurse
  $legacyLua = Join-Path $dest "scripts"
  if (Test-Path -LiteralPath $legacyLua) {
    Remove-Item -LiteralPath $legacyLua -Recurse -Force
  }

}
finally {
  if (Test-Path -LiteralPath $tmp) {
    Remove-Item -LiteralPath $tmp -Recurse -Force
  }
}

$check = Join-Path $dest "modinfo.json"
if (-not (Test-Path -LiteralPath $check)) {
  Write-Host "Algo salió mal: no quedó modinfo.json en mods\harbor-buddy-telemetry."
  exit 1
}

$version = "0.2.0"
try {
  $raw = Get-Content -LiteralPath $check -Raw
  if ($raw -match '"Version"\s*:\s*"([^"]+)"') { $version = $Matches[1] }
} catch {}

Write-Host "Listo. Mod $version en $dest"
Write-Host "Abrí Anno → Mods → activá Harbor Buddy Telemetry."
Write-Host "Si Anno se cae, desactivá el mod. Harbor Buddy anda igual sin él."

function Copy-Helper([string]$name) {
  $places = @(
    $PSScriptRoot,
    (Join-Path $env:USERPROFILE "Downloads")
  )
  foreach ($place in $places) {
    if (-not $place) { continue }
    $from = Join-Path $place $name
    if (Test-Path -LiteralPath $from) {
      Copy-Item -LiteralPath $from -Destination (Join-Path $anno $name) -Force
      Write-Host "Copié $name a $anno"
      return
    }
  }
}

Copy-Helper "watch-harbor-live.ps1"
Copy-Helper "watch-harbor-live.bat"
Copy-Helper "harbor-titles.json"
Write-Host "Para el diario: ejecutá watch-harbor-live.bat y guardá la partida (F5)."

