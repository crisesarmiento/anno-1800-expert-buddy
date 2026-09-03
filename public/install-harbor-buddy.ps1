# Harbor Buddy Telemetry — instalador
# Copia el mod a Documentos\Anno 1800\mods. No pide admin. No toca partidas.

$ErrorActionPreference = "Stop"

function Add-UniquePath($list, [string]$path) {
  if (-not $path) { return }
  $path = [Environment]::ExpandEnvironmentVariables($path.Trim())
  if (-not $path) { return }
  if ($list -notcontains $path) { [void]$list.Add($path) }
}

function Get-DocumentFolders {
  $folders = New-Object System.Collections.Generic.List[string]
  Add-UniquePath $folders (Join-Path $env:USERPROFILE "Documents")
  Add-UniquePath $folders (Join-Path $env:USERPROFILE "Documentos")
  Add-UniquePath $folders (Join-Path $env:USERPROFILE "OneDrive\Documents")
  Add-UniquePath $folders (Join-Path $env:USERPROFILE "OneDrive\Documentos")
  Add-UniquePath $folders ([Environment]::GetFolderPath("MyDocuments"))
  foreach ($envName in @("OneDrive", "OneDriveConsumer", "OneDriveCommercial")) {
    $root = [Environment]::GetEnvironmentVariable($envName)
    if ($root) {
      Add-UniquePath $folders (Join-Path $root "Documents")
      Add-UniquePath $folders (Join-Path $root "Documentos")
    }
  }
  foreach ($key in @(
      "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders",
      "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders"
    )) {
    try {
      if (Test-Path -LiteralPath $key) {
        $item = Get-ItemProperty -LiteralPath $key -ErrorAction SilentlyContinue
        if ($item -and $item.Personal) { Add-UniquePath $folders ([string]$item.Personal) }
      }
    } catch { }
  }
  return $folders
}

function Get-AnnoCandidates {
  $out = New-Object System.Collections.Generic.List[string]
  foreach ($doc in Get-DocumentFolders) {
    Add-UniquePath $out (Join-Path $doc "Anno 1800")
  }
  return $out
}

function Find-LatestA7sUnder([string]$accounts) {
  if (-not $accounts) { return $null }
  if (-not (Test-Path -LiteralPath $accounts)) { return $null }
  return Get-ChildItem -LiteralPath $accounts -Recurse -File -Filter "*.a7s" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
}

function Get-AnnoRootFromSave($save) {
  if (-not $save) { return $null }
  $dir = $save.Directory
  while ($dir) {
    if ($dir.Name -eq "Anno 1800") { return $dir.FullName }
    $dir = $dir.Parent
  }
  return $null
}

function Browse-AnnoRoot {
  Write-Host "No encuentro Documentos\Anno 1800 ni un .a7s reciente. Lo instalaste?"
  $typed = Read-Host "Pegá la carpeta Anno 1800 (Enter para salir)"
  if (-not $typed) { exit 1 }
  $typed = $typed.Trim()
  if (-not (Test-Path -LiteralPath $typed)) {
    Write-Host "Esa carpeta no existe."
    exit 1
  }
  $item = Get-Item -LiteralPath $typed
  if (-not $item.PSIsContainer) { $item = $item.Directory }
  if ($item.Name -eq "Anno 1800") { return $item.FullName }
  $fromSave = Find-LatestA7sUnder $item.FullName
  if (-not $fromSave) {
    $fromSave = Find-LatestA7sUnder (Join-Path $item.FullName "accounts")
  }
  $root = Get-AnnoRootFromSave $fromSave
  if ($root) { return $root }
  $dir = $item
  while ($dir) {
    if ($dir.Name -eq "Anno 1800") { return $dir.FullName }
    $dir = $dir.Parent
  }
  Write-Host "Solo copio adentro de una carpeta que se llame Anno 1800 (o que tenga accounts\*.a7s)."
  exit 1
}

function Find-AnnoRoot {
  $bestSave = $null
  foreach ($path in Get-AnnoCandidates) {
    if (-not $path -or -not (Test-Path -LiteralPath $path)) { continue }
    $save = Find-LatestA7sUnder (Join-Path $path "accounts")
    if ($save -and (-not $bestSave -or $save.LastWriteTimeUtc -gt $bestSave.LastWriteTimeUtc)) {
      $bestSave = $save
    }
  }
  if ($bestSave) {
    $root = Get-AnnoRootFromSave $bestSave
    if ($root) {
      Write-Host "Usando el .a7s más reciente (solo lectura): $($bestSave.FullName)"
      Write-Host "Guardado: $($bestSave.LastWriteTime)"
      return $root
    }
  }
  foreach ($path in Get-AnnoCandidates) {
    if ($path -and (Test-Path -LiteralPath $path)) {
      Write-Host "Carpeta Anno 1800: $path"
      return $path
    }
  }
  return Browse-AnnoRoot
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
Copy-Helper "harbor-catalog.json"
Copy-Helper "harbor-guids.json"
Copy-Helper "a7s-scan.cs"
Write-Host "Para el diario: ejecutá watch-harbor-live.bat y guardá la partida (Ctrl+F5 o autoguardado)."

