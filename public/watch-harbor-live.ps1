# Harbor Buddy — vigilante del diario
# No inyecta Anno. Lee el último .a7s, busca títulos de campaña, escribe harbor-live.json.
# Dejá esta ventana abierta mientras jugás. Guardá con F5 (o esperá el autoguardado).

$ErrorActionPreference = "Stop"

function Find-AnnoRoot {
  $candidates = @(
    (Join-Path $env:USERPROFILE "Documents\Anno 1800"),
    (Join-Path $env:USERPROFILE "OneDrive\Documents\Anno 1800")
  )
  $myDocs = [Environment]::GetFolderPath("MyDocuments")
  if ($myDocs) { $candidates += (Join-Path $myDocs "Anno 1800") }
  foreach ($path in $candidates) {
    if ($path -and (Test-Path -LiteralPath $path)) { return $path }
  }
  throw "No encuentro Documentos\Anno 1800"
}

function Find-Catalog {
  $names = @("harbor-catalog.json", "harbor-titles.json")
  $places = @(
    $PSScriptRoot,
    (Join-Path $env:USERPROFILE "Downloads"),
    (Join-Path $env:USERPROFILE "Documents\Anno 1800")
  )
  foreach ($place in $places) {
    foreach ($name in $names) {
      $candidate = Join-Path $place $name
      if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
  }
  throw "Falta harbor-catalog.json. Descargalo de Harbor Buddy (junto al vigilante)."
}

function Test-Blob([string]$blob, $needles) {
  foreach ($needle in $needles) {
    if ($needle -and $blob.IndexOf([string]$needle, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
      return $true
    }
  }
  return $false
}

function Get-NewestSave([string]$anno) {
  $accounts = Join-Path $anno "accounts"
  if (-not (Test-Path -LiteralPath $accounts)) { return $null }
  return Get-ChildItem -LiteralPath $accounts -Recurse -Filter "*.a7s" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

function Get-InflatedText([byte[]]$bytes) {
  Add-Type -AssemblyName System.IO.Compression -ErrorAction SilentlyContinue
  $chunks = New-Object System.Collections.Generic.List[string]
  $limit = [Math]::Min($bytes.Length - 2, 8MB)
  $hits = 0
  for ($i = 0; $i -lt $limit -and $hits -lt 24; $i++) {
    if ($bytes[$i] -ne 0x78) { continue }
    $cmf = $bytes[$i + 1]
    if ($cmf -ne 0x01 -and $cmf -ne 0x9C -and $cmf -ne 0xDA) { continue }
    try {
      $ms = New-Object System.IO.MemoryStream($bytes, $i + 2, [Math]::Min(512KB, $bytes.Length - ($i + 2)))
      $ds = New-Object System.IO.Compression.DeflateStream($ms, [System.IO.Compression.CompressionMode]::Decompress)
      $out = New-Object System.IO.MemoryStream
      $ds.CopyTo($out)
      $ds.Dispose()
      $ms.Dispose()
      $raw = $out.ToArray()
      $out.Dispose()
      if ($raw.Length -lt 8) { continue }
      $hits++
      $chunks.Add([System.Text.Encoding]::UTF8.GetString($raw))
      $chunks.Add([System.Text.Encoding]::Unicode.GetString($raw))
    } catch { }
  }
  return ($chunks -join "`n")
}
  Add-Type -AssemblyName System.IO.Compression -ErrorAction SilentlyContinue
  $chunks = New-Object System.Collections.Generic.List[string]
  $limit = [Math]::Min($bytes.Length - 2, 8MB)
  $hits = 0
  for ($i = 0; $i -lt $limit -and $hits -lt 24; $i++) {
    if ($bytes[$i] -ne 0x78) { continue }
    $cmf = $bytes[$i + 1]
    if ($cmf -ne 0x01 -and $cmf -ne 0x9C -and $cmf -ne 0xDA) { continue }
    try {
      $ms = New-Object System.IO.MemoryStream($bytes, $i + 2, [Math]::Min(512KB, $bytes.Length - ($i + 2)))
      $ds = New-Object System.IO.Compression.DeflateStream($ms, [System.IO.Compression.CompressionMode]::Decompress)
      $out = New-Object System.IO.MemoryStream
      $ds.CopyTo($out)
      $ds.Dispose()
      $ms.Dispose()
      $raw = $out.ToArray()
      $out.Dispose()
      if ($raw.Length -lt 8) { continue }
      $hits++
      $chunks.Add([System.Text.Encoding]::UTF8.GetString($raw))
      $chunks.Add([System.Text.Encoding]::Unicode.GetString($raw))
    } catch { }
  }
  return ($chunks -join "`n")
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$anno = Find-AnnoRoot
$titlesPath = Find-Catalog
$catalog = Get-Content -LiteralPath $titlesPath -Raw -Encoding UTF8 | ConvertFrom-Json
$outJson = Join-Path $anno "harbor-live.json"
$utf8Enc = [System.Text.Encoding]::UTF8
$utf16Enc = [System.Text.Encoding]::Unicode

Write-Host "Harbor Buddy vigilante"
Write-Host "Anno: $anno"
Write-Host "Títulos: $titlesPath"
Write-Host "Salida: $outJson"
Write-Host "Jugá, guardá con F5. Ctrl+C para salir."
Write-Host ""

$lastStamp = $null
while ($true) {
  try {
    $save = Get-NewestSave $anno
    if (-not $save) {
      Start-Sleep -Seconds 8
      continue
    }
    $stamp = "{0}|{1}" -f $save.FullName, $save.LastWriteTimeUtc.Ticks
    if ($stamp -eq $lastStamp) {
      Start-Sleep -Seconds 8
      continue
    }
    $lastStamp = $stamp
    $bytes = [System.IO.File]::ReadAllBytes($save.FullName)
    $cap = [Math]::Min($bytes.Length, 12MB)
    $even = $cap -band (-bnot 1)
    $rawText = $utf8Enc.GetString($bytes, 0, $cap) + "`n" + $utf16Enc.GetString($bytes, 0, $even)
    $blob = $rawText + "`n" + (Get-InflatedText $bytes)
    $found = @()
    foreach ($mission in $catalog.missions) {
      $hit = $false
      foreach ($title in $mission.titles) {
        if (-not $title) { continue }
        if ($blob.IndexOf($title, [StringComparison]::OrdinalIgnoreCase) -ge 0) { $hit = $true; break }
      }
      if ($hit) { $found += $mission }
    }

    $quests = @()
    if ($found.Count -gt 0 -and $found.Count -le 10) {
      for ($i = 0; $i -lt $found.Count; $i++) {
        $state = if ($i -eq $found.Count - 1) { "active" } else { "done" }
        $quests += [ordered]@{
          title = [string]$found[$i].titles[0]
          state = $state
        }
      }
    } elseif ($found.Count -gt 10) {
      Write-Host "$(Get-Date -Format HH:mm:ss) demasiados títulos ($($found.Count)) — parece tabla de textos. Usá el buscador."
    }

    function Collect-Hits($items, [bool]$useNeedles) {
      $hits = @()
      if (-not $items) { return $hits }
      foreach ($item in $items) {
        $needles = @()
        if ($item.names) { $needles += @($item.names) }
        if ($useNeedles -and $item.needles) { $needles += @($item.needles) }
        if (Test-Blob $blob $needles) {
          $label = if ($item.names -and $item.names.Count -gt 0) { [string]$item.names[0] } else { [string]$item.id }
          $hits += [ordered]@{ id = [string]$item.id; name = $label }
        }
      }
      return $hits
    }

    $hintHits = @()
    if ($catalog.hints) {
      foreach ($hint in $catalog.hints) {
        if (Test-Blob $blob @($hint.needles)) { $hintHits += [string]$hint.id }
      }
    }

    $telemetry = [ordered]@{
      buildings = @(Collect-Hits $catalog.buildings $false)
      people    = @(Collect-Hits $catalog.people $false)
      chains    = @(Collect-Hits $catalog.chains $true)
      islands   = @(Collect-Hits $catalog.islands $false)
      hints     = @($hintHits)
    }

    $payload = [ordered]@{
      schema     = "harbor-live-v1"
      source     = "save"
      updatedAt  = (Get-Date).ToUniversalTime().ToString("o")
      game       = "anno-1800"
      quests     = @($quests)
      telemetry  = $telemetry
    }
    $json = ($payload | ConvertTo-Json -Depth 8 -Compress)
    [System.IO.File]::WriteAllText($outJson, $json + "`n", $utf8)
    $bCount = @($telemetry.buildings).Count
    $label = if ($quests.Count -gt 0) { $quests[-1].title } else { "(vacío — F5 o buscador)" }
    Write-Host "$(Get-Date -Format HH:mm:ss) $($save.Name) → $label · $bCount edificios"
  } catch {
    Write-Host "$(Get-Date -Format HH:mm:ss) error: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 8
}
