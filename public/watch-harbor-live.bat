@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo Harbor Buddy vigilante 0.6.0 - un solo archivo
if exist "%~dp0..\scripts\pack-mod.mjs" (
  echo Esta carpeta es el codigo del buddy. Dejo el .ps1 donde esta.
) else if exist "watch-harbor-live.ps1" (
  echo Encontre un .ps1 viejo en esta carpeta. Lo renombro a .old para no usarlo.
  move /Y "watch-harbor-live.ps1" "watch-harbor-live.ps1.old" >nul
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%~f0'; $b=[IO.File]::ReadAllBytes($p); $t=[Text.Encoding]::UTF8.GetString($b); $m='::'+'HARBOR_WATCHER_SCRIPT_V1'; $i=$t.IndexOf($m); if($i -lt 0){ throw 'archivo incompleto' }; iex $t.Substring($i+$m.Length)"
if errorlevel 1 pause
exit /b 0
::HARBOR_WATCHER_SCRIPT_V1
# Harbor Buddy - vigilante del diario
# No inyecta Anno. Lee el ultimo save y, si existe, el OCR local de Estadisticas.
# Deja esta ventana abierta. Guarda con Ctrl+F5 (o espera el autoguardado).

param(
  [ValidateSet("brazilian", "chinese", "english", "french", "german", "italian", "japanese", "korean", "polish", "portuguese", "russian", "spanish", "taiwanese")]
  [string]$NativeLanguage = "spanish"
)

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

function Get-UbisoftCloudFolders {
  $folders = New-Object System.Collections.Generic.List[string]
  foreach ($launcher in @(
      (Join-Path ${env:ProgramFiles(x86)} "Ubisoft\Ubisoft Game Launcher\savegames"),
      (Join-Path $env:ProgramFiles "Ubisoft\Ubisoft Game Launcher\savegames"),
      (Join-Path $env:LOCALAPPDATA "Ubisoft Game Launcher\savegames")
    )) {
    if ($launcher -and (Test-Path -LiteralPath $launcher)) {
      foreach ($account in Get-ChildItem -LiteralPath $launcher -Directory -ErrorAction SilentlyContinue) {
        foreach ($gameId in @("4553", "4554")) {
          $candidate = Join-Path $account.FullName $gameId
          if (Test-Path -LiteralPath $candidate) { Add-UniquePath $folders $candidate }
        }
      }
    }
  }
  return $folders
}

function Test-AnnoArchive($file) {
  if (-not $file -or -not (Test-Path -LiteralPath $file.FullName)) { return $false }
  $stream = $null
  try {
    $stream = New-Object System.IO.FileStream($file.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    $head = New-Object byte[] ([Math]::Min(256, [int]$stream.Length))
    $read = $stream.Read($head, 0, $head.Length)
    if ($read -le 0) { return $false }
    $text = [System.Text.Encoding]::ASCII.GetString($head, 0, $read)
    return $text.Contains("Resource File V2.2")
  } catch {
    return $false
  } finally {
    if ($stream) { $stream.Dispose() }
  }
}

function Find-LatestCloudSave {
  $matches = @()
  foreach ($folder in Get-UbisoftCloudFolders) {
    $matches += @(Get-ChildItem -LiteralPath $folder -File -Filter "*.save" -ErrorAction SilentlyContinue |
      Where-Object { Test-AnnoArchive $_ })
  }
  return $matches | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
}

function Find-LatestA7sUnder([string]$accounts) {
  if (-not $accounts) { return $null }
  if (-not (Test-Path -LiteralPath $accounts)) { return $null }
  return Get-ChildItem -LiteralPath $accounts -Recurse -File -Filter "*.a7s" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "accountdata.a7s" } |
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
  Write-Host "No encontré Documentos\Anno 1800 ni una partida reciente — no pasa nada, la buscamos juntos."
  $typed = Read-Host "Pegá la carpeta de Anno 1800 (Enter para salir)"
  if (-not $typed) { throw "Cancelado. Cuando quieras, volvé a abrir este vigilante." }
  $typed = $typed.Trim()
  if (-not (Test-Path -LiteralPath $typed)) { throw "Esa carpeta no existe. Fijate el camino y probá de nuevo." }
  $item = Get-Item -LiteralPath $typed
  if (-not $item.PSIsContainer) { $item = $item.Directory }
  if ($item.Name -eq "Anno 1800") { return $item.FullName }
  $fromSave = Find-LatestA7sUnder $item.FullName
  if (-not $fromSave -and $item.Name -ne "accounts") {
    $fromSave = Find-LatestA7sUnder (Join-Path $item.FullName "accounts")
  }
  $root = Get-AnnoRootFromSave $fromSave
  if ($root) { return $root }
  $dir = $item
  while ($dir) {
    if ($dir.Name -eq "Anno 1800") { return $dir.FullName }
    $dir = $dir.Parent
  }
  throw "Solo puedo seguir una carpeta Anno 1800 (o una que tenga accounts\*.a7s adentro)."
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
      Write-Host "Encontré tu partida más reciente (la leo, nunca la toco): $($bestSave.FullName)"
      Write-Host "Guardado la última vez: $($bestSave.LastWriteTime)"
      return $root
    }
  }
  $cloudSave = Find-LatestCloudSave
  if ($cloudSave) {
    $docs = [Environment]::GetFolderPath("MyDocuments")
    $root = Join-Path $docs "Anno 1800"
    if (-not (Test-Path -LiteralPath $root)) { [void](New-Item -ItemType Directory -Path $root -Force) }
    Write-Host "Encontré tu partida cloud más reciente (la leo, nunca la toco): $($cloudSave.Name)"
    Write-Host "Guardado la última vez: $($cloudSave.LastWriteTime)"
    return $root
  }
  foreach ($path in Get-AnnoCandidates) {
    if ($path -and (Test-Path -LiteralPath $path)) {
      Write-Host "Ya sé dónde está tu Anno 1800: $path (todavía no veo partidas guardadas ahí — arrancá a jugar cuando quieras)"
      return $path
    }
  }
  return Browse-AnnoRoot
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

  $dest = Join-Path $PSScriptRoot "harbor-catalog.json"
  $url = "https://raw.githubusercontent.com/crisesarmiento/anno-1800-expert-buddy/main/public/harbor-catalog.json"
  Write-Host "Todavía no tengo harbor-catalog.json — lo bajo solo, un segundo."
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dest
  if (-not (Test-Path -LiteralPath $dest)) {
    throw "Me falta harbor-catalog.json y no lo pude bajar. Descargalo de Harbor Buddy junto a este script."
  }
  return $dest
}

function Test-Blob([string]$blob, $needles) {
  foreach ($needle in $needles) {
    if ($needle -and $blob.IndexOf([string]$needle, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
      return $true
    }
  }
  return $false
}

function Collect-Hits($items, [string]$blob, [bool]$useNeedles) {
  $hits = @()
  if (-not $items) { return $hits }
  foreach ($item in $items) {
    $needles = @()
    if ($item.names) { $needles += @($item.names) }
    if ($useNeedles -and $item.needles) { $needles += @($item.needles) }
    if (Test-Blob $blob $needles) {
      $label = [string]$item.id
      if ($item.names) {
        $first = @($item.names)[0]
        if ($first) { $label = [string]$first }
      }
      $hits += [ordered]@{ id = [string]$item.id; name = $label }
    }
  }
  return $hits
}

function Get-NewestSave([string]$anno) {
  $local = Find-LatestA7sUnder (Join-Path $anno "accounts")
  $cloud = Find-LatestCloudSave
  return @($local, $cloud) | Where-Object { $_ } | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
}

# Houses pulse from presence, same rule as src/lib/live/a7s-snapshot.ts housesHint:
# zero buildings found at all -> unknown (can't tell missed-scan from truly empty);
# no residence tier or no marketplace -> empty; farmers with no fishery/fish stock -> yellow.
function Get-HousesPulse($scan, $buildings, $goods) {
  if (@($buildings).Count -eq 0) { return "unknown" }
  $hasHouses = [bool]$scan.farmers -or [bool]$scan.workers -or [bool]$scan.artisans -or [bool]$scan.engineers
  if (-not $hasHouses) { return "empty" }
  $hasMarket = @($buildings) | Where-Object { $_.id -eq "marketplace" } | Select-Object -First 1
  if (-not $hasMarket) { return "empty" }
  $hasFishery = @($buildings) | Where-Object { $_.id -eq "fishery" } | Select-Object -First 1
  $fishGood = @($goods) | Where-Object { $_.id -eq "fish" } | Select-Object -First 1
  $hasFishStock = $false
  if ($fishGood -and [int]$fishGood.amount -gt 0) { $hasFishStock = $true }
  if ($scan.farmers -and -not $hasFishery -and -not $hasFishStock) { return "yellow" }
  return "ok"
}

function Get-CoinsLabel([string]$coins) {
  if ($coins -eq "up") { return "suben" }
  if ($coins -eq "down") { return "bajan" }
  return "sin dato"
}

function Get-HousesLabel([string]$houses) {
  if ($houses -eq "ok") { return "contentas" }
  if ($houses -eq "yellow") { return "amarillas" }
  if ($houses -eq "empty") { return "vacías" }
  return "sin dato"
}

# Spanish label when the catalog has one for this id; falls back to the GUID-table name (often English).
function Get-BuildingLabel([string]$id, [string]$fallback, $catalog) {
  if ($catalog -and $catalog.buildings) {
    $match = @($catalog.buildings) | Where-Object { $_.id -eq $id } | Select-Object -First 1
    if ($match -and $match.names) {
      $first = @($match.names)[0]
      if ($first) { return [string]$first }
    }
  }
  return $fallback
}

# Console-only summary: names + top goods, never the raw GUID table.
# @(...) wraps the Sort-Object output so a single-item result stays an array (PS collapses 1-item pipelines to a scalar).
# Sort-Object -Property "<name>" does not compare [ordered]@{}/Hashtable values correctly (it silently no-ops);
# a scriptblock with bracket indexing (`$_['count']`) reads the real value and sorts as expected.
function Get-BuildingsLogLine($buildings, $catalog, [int]$maxNames) {
  $sorted = @(@($buildings) | Sort-Object -Property { $_["count"] } -Descending)
  $parts = @()
  $shown = 0
  foreach ($b in $sorted) {
    if ($shown -ge $maxNames) { break }
    $label = Get-BuildingLabel ([string]$b.id) ([string]$b.name) $catalog
    $parts += "$label×$([int]$b.count)"
    $shown++
  }
  $line = $parts -join ", "
  $extra = $sorted.Count - $shown
  if ($extra -gt 0) { $line = "$line, +$extra más" }
  return $line
}

function Get-GoodsLogLine($goods, [int]$maxGoods) {
  $sorted = @(@($goods) | Sort-Object -Property { $_["amount"] } -Descending | Select-Object -First $maxGoods)
  $parts = @()
  foreach ($g in $sorted) { $parts += "$($g.name) $([int]$g.amount)" }
  return ($parts -join ", ")
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

function Get-HarborReaderFromScan($scan) {
  $caps = @(
    "buildings", "playerGoods", "playerTreasury", "routes", "routeStations",
    "islandSnapshots", "islandNames", "islandStock", "islandBuildings", "fleet"
  )
  $id = "harbor-watcher"
  $version = "0.6.1"
  $engine = "a7s-scan"
  if ($scan -and ($scan.PSObject.Properties.Name -contains "reader") -and $scan.reader) {
    if ($scan.reader.id) { $id = [string]$scan.reader.id }
    if ($scan.reader.version) { $version = [string]$scan.reader.version }
    if ($scan.reader.engine) { $engine = [string]$scan.reader.engine }
    $fromScan = @()
    foreach ($cap in @($scan.reader.capabilities)) {
      if ($cap) { $fromScan += [string]$cap }
    }
    if ($fromScan.Count -gt 0) { $caps = $fromScan }
  }
  return [ordered]@{
    id           = $id
    version      = $version
    engine       = $engine
    capabilities = @($caps)
  }
}

function Add-HarborCoverageField($fields, [string]$field, [string]$status, $count, [string]$reason) {
  $row = [ordered]@{ field = $field; status = $status }
  if ($status -eq "present" -and $count -ne $null -and [int]$count -gt 0) { $row.count = [int]$count }
  if ($reason) { $row.reason = $reason }
  [void]$fields.Add($row)
}

function Get-HarborCoverage($payload) {
  $fields = New-Object System.Collections.Generic.List[object]
  $islands = @()
  if ($payload.islandSnapshots) { $islands = @($payload.islandSnapshots) }
  $named = @($islands | Where-Object { $_.nameSource -eq "city-name" -or $_.nameSource -eq "city-name-guid" })
  $stocked = @($islands | Where-Object { $_.stock -and @($_.stock).Count -gt 0 })
  $built = @($islands | Where-Object { $_.buildings -and @($_.buildings).Count -gt 0 })
  $routes = @()
  if ($payload.telemetry -and $payload.telemetry.routes) { $routes = @($payload.telemetry.routes) }
  $stationed = 0
  foreach ($route in $routes) {
    $hasStation = $false
    if ($route.delivery -and $route.delivery.stations) {
      foreach ($station in @($route.delivery.stations)) {
        if ($station.areaId -ne $null) { $hasStation = $true; break }
      }
    }
    if ($hasStation) { $stationed++ }
  }
  $buildings = 0
  if ($payload.telemetry -and $payload.telemetry.buildings) { $buildings = @($payload.telemetry.buildings).Count }
  $goods = 0
  if ($payload.telemetry -and $payload.telemetry.goods) { $goods = @($payload.telemetry.goods).Count }
  $fleet = 0
  if ($payload.telemetry -and $payload.telemetry.fleet) { $fleet = @($payload.telemetry.fleet).Count }
  $production = 0
  if ($payload.telemetry -and $payload.telemetry.production) { $production = @($payload.telemetry.production).Count }
  $quests = @()
  if ($payload.quests) { $quests = @($payload.quests) }
  $questsWithState = @($quests | Where-Object { $_.state }).Count

  if ($buildings -gt 0) { Add-HarborCoverageField $fields "buildings" "present" $buildings $null }
  else { Add-HarborCoverageField $fields "buildings" "absent" $null "not-extracted" }
  if ($goods -gt 0) { Add-HarborCoverageField $fields "playerGoods" "present" $goods $null }
  else { Add-HarborCoverageField $fields "playerGoods" "absent" $null "not-extracted" }
  if ($payload.economy -and ($payload.economy.PSObject.Properties.Name -contains "treasury")) {
    Add-HarborCoverageField $fields "playerTreasury" "present" $null $null
  } else {
    Add-HarborCoverageField $fields "playerTreasury" "absent" $null "no-player-owner"
  }
  if ($routes.Count -gt 0) { Add-HarborCoverageField $fields "routes" "present" $routes.Count $null }
  else { Add-HarborCoverageField $fields "routes" "absent" $null "not-extracted" }
  if ($stationed -gt 0) { Add-HarborCoverageField $fields "routeStations" "present" $stationed $null }
  else { Add-HarborCoverageField $fields "routeStations" "absent" $null "no-area-id" }
  if ($islands.Count -gt 0) { Add-HarborCoverageField $fields "islandSnapshots" "present" $islands.Count $null }
  else { Add-HarborCoverageField $fields "islandSnapshots" "absent" $null "not-extracted" }
  if ($named.Count -gt 0) { Add-HarborCoverageField $fields "islandNames" "present" $named.Count $null }
  else { Add-HarborCoverageField $fields "islandNames" "absent" $null "no-city-name" }
  if ($stocked.Count -gt 0) { Add-HarborCoverageField $fields "islandStock" "present" $stocked.Count $null }
  else { Add-HarborCoverageField $fields "islandStock" "absent" $null "not-extracted" }
  if ($built.Count -gt 0) { Add-HarborCoverageField $fields "islandBuildings" "present" $built.Count $null }
  else { Add-HarborCoverageField $fields "islandBuildings" "absent" $null "not-extracted" }
  if ($fleet -gt 0) { Add-HarborCoverageField $fields "fleet" "present" $fleet $null }
  else { Add-HarborCoverageField $fields "fleet" "absent" $null "not-extracted" }
  if ($questsWithState -gt 0) { Add-HarborCoverageField $fields "quests" "present" $questsWithState $null }
  elseif ($quests.Count -gt 0) { Add-HarborCoverageField $fields "quests" "absent" $null "not-extracted" }
  else { Add-HarborCoverageField $fields "quests" "unavailable" $null "empty-on-purpose" }
  Add-HarborCoverageField $fields "income" "unavailable" $null "no-player-owner"
  Add-HarborCoverageField $fields "maintenance" "unavailable" $null "no-player-owner"
  if ($production -gt 0) { Add-HarborCoverageField $fields "ocrProduction" "present" $production $null }
  elseif ($payload.connection -and $payload.connection.nativeProbe) {
    Add-HarborCoverageField $fields "ocrProduction" "absent" $null "no-observation"
  } else {
    Add-HarborCoverageField $fields "ocrProduction" "unavailable" $null "not-extracted"
  }

  $coverage = [ordered]@{ fields = [object[]]$fields.ToArray() }
  if ($payload.savedAt) { $coverage.observedAt = [string]$payload.savedAt }
  return $coverage
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$anno = Find-AnnoRoot
$titlesPath = "embedded"
$catalog = @'
{
  "schema": "harbor-catalog-v1",
  "missions": [
    {
      "id": "pro-blast",
      "titles": [
        "A lo grande"
      ]
    },
    {
      "id": "ch1-spark",
      "titles": [
        "Una chispa que vuelve",
        "A Spark Rekindled"
      ]
    },
    {
      "id": "ch1-apple",
      "titles": [
        "La manzana no cae lejos del árbol",
        "The Apple Falls Not Far From The Tree"
      ]
    },
    {
      "id": "ch1-loyalty",
      "titles": [
        "Lealtad pagada",
        "Loyalty Repaid"
      ]
    },
    {
      "id": "ch1-ditchwater",
      "titles": [
        "Aburrido como Ditch Water",
        "Dull As Ditchwater"
      ]
    },
    {
      "id": "ch1-earth",
      "titles": [
        "Sacar de la tierra",
        "Take From The Earth"
      ]
    },
    {
      "id": "ch1-toast",
      "titles": [
        "Brindis al futuro",
        "Toast To The Future"
      ]
    },
    {
      "id": "ch1-family",
      "titles": [
        "Lazos de familia",
        "Family Bonds"
      ]
    },
    {
      "id": "ch1-blacksheep",
      "titles": [
        "La oveja negra de la familia",
        "Black Sheep Of The Family"
      ]
    },
    {
      "id": "ch1-polish",
      "titles": [
        "Un último retoque",
        "One Final Polish"
      ]
    },
    {
      "id": "ch1-pleas",
      "titles": [
        "Los ruegos de un pariente pobre",
        "Pleas Of A Poor Relation"
      ]
    },
    {
      "id": "ch1-hardtimes",
      "titles": [
        "Tiempos duros",
        "Hard Times Bomberos Zzz Rojo Saldo"
      ]
    },
    {
      "id": "ch1-press",
      "titles": [
        "Libertad y prensa libre",
        "Freedom And The Free Press"
      ]
    },
    {
      "id": "ch1-debt",
      "titles": [
        "La deuda es oficial",
        "The Debt Is Official"
      ]
    },
    {
      "id": "ch1-raise",
      "titles": [
        "Hora de un aumento",
        "Time For A Raise"
      ]
    },
    {
      "id": "ch1-ashes",
      "titles": [
        "Construir sobre las cenizas",
        "Building From The Ashes"
      ]
    },
    {
      "id": "ch1-heroes",
      "titles": [
        "Héroes de la clase obrera",
        "Working Class Heroes"
      ]
    },
    {
      "id": "ch1-lackey",
      "titles": [
        "El lacayo de Edvard",
        "Edvard'S Lackey"
      ]
    },
    {
      "id": "ch1-scapegoats",
      "titles": [
        "Chivos expiatorios"
      ]
    },
    {
      "id": "ch1-business",
      "titles": [
        "No es asunto tuyo / Curiosidad",
        "None Of Your Business"
      ]
    },
    {
      "id": "ch1-photograph",
      "titles": [
        "Recién salido de la imprenta",
        "Hot Off The Press"
      ]
    },
    {
      "id": "ch2-bulk",
      "titles": [
        "Pedido al por mayor",
        "Request In Bulk"
      ]
    },
    {
      "id": "ch2-iron",
      "titles": [
        "Cualquier hierro viejo",
        "Any Old Iron"
      ]
    },
    {
      "id": "ch2-mountains",
      "titles": [
        "Mover montañas",
        "Moving Mountains"
      ]
    },
    {
      "id": "ch2-expert",
      "titles": [
        "El experto en demolición",
        "Demolition Expert"
      ]
    },
    {
      "id": "ch2-industrial",
      "titles": [
        "Evolución industrial",
        "Industrial Evolution"
      ]
    },
    {
      "id": "ch2-warfare",
      "titles": [
        "Guerra"
      ]
    },
    {
      "id": "ch2-smuggler",
      "titles": [
        "Seguir a un contrabandista",
        "Follow A Smuggler"
      ]
    },
    {
      "id": "ch2-pyrphorians",
      "titles": [
        "Los Pyrphorian",
        "The Pyrphorians"
      ]
    },
    {
      "id": "ch2-newworld",
      "titles": [
        "Misión al Nuevo Mundo",
        "Expedition To The New World Nuevo Mundo"
      ]
    },
    {
      "id": "ch3-hand",
      "titles": [
        "Una mano lava la otra",
        "One Good Turn Una Mano Lava"
      ]
    },
    {
      "id": "ch3-rebels",
      "titles": [
        "Un hogar para los rebeldes",
        "A Home For The Rebels"
      ]
    },
    {
      "id": "ch3-rescue",
      "titles": [
        "Rescate y refugio",
        "Rescue And Refuge"
      ]
    },
    {
      "id": "ch3-bastion",
      "titles": [
        "Un bastión para todos"
      ]
    },
    {
      "id": "ch3-heat",
      "titles": [
        "Ola de calor",
        "Heatwave Ola De"
      ]
    },
    {
      "id": "ch3-lookout",
      "titles": [
        "Un puesto de vigilancia",
        "A Lookout Post"
      ]
    },
    {
      "id": "ch3-wolves",
      "titles": [
        "Lobos con ropa de alpaca",
        "Wolves In"
      ]
    },
    {
      "id": "ch3-release",
      "titles": [
        "Soltar y aliviar",
        "Release And Relief"
      ]
    },
    {
      "id": "ch3-defense",
      "titles": [
        "La mejor defensa es un buen ataque",
        "Best Defense Good Offense"
      ]
    },
    {
      "id": "ch3-refugees",
      "titles": [
        "Refugiados bienvenidos",
        "Refugees Welcome"
      ]
    },
    {
      "id": "ch3-evac",
      "titles": [
        "Evacuación de emergencia",
        "Emergency Evacuation"
      ]
    },
    {
      "id": "ch3-wildfire",
      "titles": [
        "Incendio a pedido",
        "Wildfire To Order"
      ]
    },
    {
      "id": "ch3-ransom",
      "titles": [
        "No pagues rescate",
        "Pay No Ransom"
      ]
    },
    {
      "id": "ch3-lead",
      "titles": [
        "Seguir la pista",
        "Follow The Trail"
      ]
    },
    {
      "id": "ch4-confrontation",
      "titles": [
        "La confrontación",
        "The Confrontation"
      ]
    },
    {
      "id": "ch4-justitia",
      "titles": [
        "Justitia"
      ]
    },
    {
      "id": "ch4-come",
      "titles": [
        "Pase lo que pase",
        "Come What May Pase Lo Que Pase"
      ]
    },
    {
      "id": "ch4-noblesse",
      "titles": [
        "Noblesse Oblige"
      ]
    },
    {
      "id": "ch4-prosecution",
      "titles": [
        "Acusación"
      ]
    },
    {
      "id": "ch4-battle",
      "titles": [
        "Batalla final",
        "Final Battle"
      ]
    },
    {
      "id": "ch4-flame",
      "titles": [
        "La primera llama",
        "The First Flame Primera"
      ]
    },
    {
      "id": "end-dream",
      "titles": [
        "Un sueño propio",
        "A Dream Of Our Own"
      ]
    }
  ],
  "buildings": [
    {
      "id": "lumberjack",
      "names": [
        "Cabaña de leñador",
        "Lumberjack's Hut"
      ]
    },
    {
      "id": "sawmill",
      "names": [
        "Aserradero",
        "Sawmill"
      ]
    },
    {
      "id": "marketplace",
      "names": [
        "Mercado",
        "Marketplace"
      ]
    },
    {
      "id": "farmer-house",
      "names": [
        "Residencia de granjeros",
        "Farmer Residence"
      ]
    },
    {
      "id": "fishery",
      "names": [
        "Pescadería",
        "Fishery"
      ]
    },
    {
      "id": "sheep",
      "names": [
        "Granja de ovejas",
        "Sheep Farm"
      ]
    },
    {
      "id": "knitters",
      "names": [
        "Telares",
        "Knitter's Hut"
      ]
    },
    {
      "id": "potato",
      "names": [
        "Granja de papas",
        "Potato Farm"
      ]
    },
    {
      "id": "distillery",
      "names": [
        "Destilería de Schnapps",
        "Schnapps Distillery"
      ]
    },
    {
      "id": "pub",
      "names": [
        "Taberna",
        "Pub"
      ]
    },
    {
      "id": "worker-house",
      "names": [
        "Residencia de obreros"
      ]
    },
    {
      "id": "sausage",
      "names": [
        "Granja de cerdos + Matadero",
        "Slaughterhouse"
      ]
    },
    {
      "id": "bread",
      "names": [
        "Granja de trigo, molino, panadería"
      ]
    },
    {
      "id": "soap",
      "names": [
        "Fábrica de jabón"
      ]
    },
    {
      "id": "school",
      "names": [
        "Escuela",
        "School"
      ]
    },
    {
      "id": "church",
      "names": [
        "Iglesia"
      ]
    },
    {
      "id": "warehouse",
      "names": [
        "Almacén / Puesto comercial",
        "Warehouse"
      ]
    },
    {
      "id": "iron-mine",
      "names": [
        "Mina de hierro"
      ]
    },
    {
      "id": "charcoal",
      "names": [
        "Carbonera"
      ]
    },
    {
      "id": "furnace",
      "names": [
        "Fundición",
        "Furnace"
      ]
    },
    {
      "id": "steelworks",
      "names": [
        "Acería",
        "Steelworks"
      ]
    },
    {
      "id": "weapons",
      "names": [
        "Fábrica de armas"
      ]
    },
    {
      "id": "sails",
      "names": [
        "Fábrica de velas"
      ]
    },
    {
      "id": "jornalero",
      "names": [
        "Residencia de jornaleros"
      ]
    },
    {
      "id": "plantain",
      "names": [
        "Plantación de plátanos + Cocina"
      ]
    },
    {
      "id": "police",
      "names": [
        "Comisaría"
      ]
    },
    {
      "id": "hospital",
      "names": [
        "Hospital"
      ]
    },
    {
      "id": "obrero",
      "names": [
        "Residencia de obreros"
      ]
    },
    {
      "id": "defenses",
      "names": [
        "Cañones montados, torres de cañón, grúa de reparación"
      ]
    }
  ],
  "people": [
    {
      "id": "kahina",
      "names": [
        "Madame Kahina"
      ]
    },
    {
      "id": "blake",
      "names": [
        "Sir Archibald Blake"
      ]
    },
    {
      "id": "hannah",
      "names": [
        "Hannah Goode"
      ]
    },
    {
      "id": "edvard",
      "names": [
        "Edvard Goode"
      ]
    },
    {
      "id": "eli",
      "names": [
        "Eli Bleakworth"
      ]
    },
    {
      "id": "isabel",
      "names": [
        "Isabel Sarmento"
      ]
    },
    {
      "id": "competitors",
      "names": [
        "Otras compañías"
      ]
    }
  ],
  "chains": [
    {
      "id": "wood",
      "names": [
        "Madera"
      ],
      "needles": [
        "Leñador",
        "Aserradero"
      ]
    },
    {
      "id": "fish",
      "names": [
        "Pescado"
      ],
      "needles": [
        "Pescadería"
      ]
    },
    {
      "id": "clothes",
      "names": [
        "Ropa"
      ],
      "needles": [
        "Ovejas",
        "Telares"
      ]
    },
    {
      "id": "schnapps",
      "names": [
        "Schnapps"
      ],
      "needles": [
        "Papas",
        "Destilería"
      ]
    },
    {
      "id": "workers",
      "names": [
        "Comida de obreros"
      ],
      "needles": [
        "Cerdos",
        "Trigo → molino → pan"
      ]
    },
    {
      "id": "steel",
      "names": [
        "Acero"
      ],
      "needles": [
        "Mina",
        "Carbón",
        "Fundición",
        "Acería"
      ]
    },
    {
      "id": "sails",
      "names": [
        "Velas"
      ],
      "needles": [
        "Lana",
        "Velas"
      ]
    }
  ],
  "islands": [
    {
      "id": "bright-sands",
      "names": [
        "Bright Sands"
      ]
    },
    {
      "id": "ditchwater",
      "names": [
        "Ditchwater",
        "Ditch Water",
        "La Inapetente"
      ]
    },
    {
      "id": "crown-falls",
      "names": [
        "Crown Falls"
      ]
    },
    {
      "id": "la-isla",
      "names": [
        "La Isla"
      ]
    },
    {
      "id": "cape",
      "names": [
        "Cape Trelawney"
      ]
    },
    {
      "id": "old-world",
      "names": [
        "Old World",
        "Viejo Mundo"
      ]
    },
    {
      "id": "new-world",
      "names": [
        "New World",
        "Nuevo Mundo"
      ]
    }
  ],
  "hints": [
    {
      "id": "farmers",
      "needles": [
        "granjeros",
        "farmers"
      ]
    },
    {
      "id": "workers",
      "needles": [
        "obreros",
        "workers"
      ]
    },
    {
      "id": "artisans",
      "needles": [
        "artesanos",
        "artisans"
      ]
    },
    {
      "id": "engineers",
      "needles": [
        "ingenieros",
        "engineers"
      ]
    },
    {
      "id": "schnapps",
      "needles": [
        "Schnapps"
      ]
    },
    {
      "id": "steel",
      "needles": [
        "acero",
        "steel"
      ]
    },
    {
      "id": "war",
      "needles": [
        "guerra",
        "war",
        "Krieg"
      ]
    },
    {
      "id": "taxes",
      "needles": [
        "impuestos",
        "taxes",
        "Steuern"
      ]
    }
  ]
}
'@ | ConvertFrom-Json
$guidJson = @'
{
  "schema": "harbor-guids-v1",
  "rows": [
    {
      "guid": 1010266,
      "id": "lumberjack",
      "kind": "building",
      "name": "Lumberjack's Hut"
    },
    {
      "guid": 1010267,
      "id": "sheep",
      "kind": "building",
      "name": "Sheep Farm"
    },
    {
      "guid": 1010294,
      "id": "sawmill",
      "kind": "building",
      "name": "Sawmill"
    },
    {
      "guid": 1010297,
      "id": "sawmill",
      "kind": "building",
      "name": "Sawmill"
    },
    {
      "guid": 1010298,
      "id": "charcoal",
      "kind": "building",
      "name": "Charcoal Kiln"
    },
    {
      "guid": 1010372,
      "id": "marketplace",
      "kind": "building",
      "name": "Marketplace"
    },
    {
      "guid": 1010371,
      "id": "warehouse",
      "kind": "building",
      "name": "Warehouse"
    },
    {
      "guid": 1010343,
      "id": "farmer-house",
      "kind": "building",
      "name": "Farmer Residence"
    },
    {
      "guid": 1010344,
      "id": "worker-house",
      "kind": "building",
      "name": "Worker Residence"
    },
    {
      "guid": 1010345,
      "id": "artisan-house",
      "kind": "building",
      "name": "Artisan Residence"
    },
    {
      "guid": 1010346,
      "id": "engineer-house",
      "kind": "building",
      "name": "Engineer Residence"
    },
    {
      "guid": 1010278,
      "id": "fishery",
      "kind": "building",
      "name": "Fishery"
    },
    {
      "guid": 1010265,
      "id": "potato",
      "kind": "building",
      "name": "Potato Farm"
    },
    {
      "guid": 1010262,
      "id": "bread",
      "kind": "building",
      "name": "Grain Farm"
    },
    {
      "guid": 1010269,
      "id": "sausage",
      "kind": "building",
      "name": "Pig Farm"
    },
    {
      "guid": 1010316,
      "id": "knitters",
      "kind": "building",
      "name": "Knitter's Hut"
    },
    {
      "guid": 1010358,
      "id": "pub",
      "kind": "building",
      "name": "Pub"
    },
    {
      "guid": 1010360,
      "id": "school",
      "kind": "building",
      "name": "School"
    },
    {
      "guid": 1010359,
      "id": "church",
      "kind": "building",
      "name": "Church"
    },
    {
      "guid": 101254,
      "id": "jornalero",
      "kind": "building",
      "name": "Jornalero Residence"
    },
    {
      "guid": 101255,
      "id": "obrero",
      "kind": "building",
      "name": "Obrero Residence"
    },
    {
      "guid": 101257,
      "id": "marketplace",
      "kind": "building",
      "name": "Marketplace"
    },
    {
      "guid": 1010312,
      "id": "distillery",
      "kind": "building",
      "name": "Schnapps Distillery"
    },
    {
      "guid": 1010035,
      "id": "warehouse",
      "kind": "building",
      "name": "Warehouse"
    },
    {
      "guid": 1010017,
      "id": "money",
      "kind": "good",
      "name": "Coins"
    },
    {
      "guid": 120008,
      "id": "wood-log",
      "kind": "good",
      "name": "Wood"
    },
    {
      "guid": 1010196,
      "id": "wood",
      "kind": "good",
      "name": "Timber"
    },
    {
      "guid": 1010200,
      "id": "fish",
      "kind": "good",
      "name": "Fish"
    },
    {
      "guid": 1010195,
      "id": "potato",
      "kind": "good",
      "name": "Potatoes"
    },
    {
      "guid": 1010216,
      "id": "schnapps",
      "kind": "good",
      "name": "Schnapps"
    },
    {
      "guid": 1010197,
      "id": "wool",
      "kind": "good",
      "name": "Wool"
    },
    {
      "guid": 1010237,
      "id": "clothes",
      "kind": "good",
      "name": "Work Clothes"
    },
    {
      "guid": 1010199,
      "id": "pigs",
      "kind": "good",
      "name": "Pigs"
    },
    {
      "guid": 1010238,
      "id": "sausage",
      "kind": "good",
      "name": "Sausages"
    },
    {
      "guid": 1010192,
      "id": "grain",
      "kind": "good",
      "name": "Grain"
    },
    {
      "guid": 1010213,
      "id": "bread",
      "kind": "good",
      "name": "Bread"
    },
    {
      "guid": 1010203,
      "id": "soap",
      "kind": "good",
      "name": "Soap"
    },
    {
      "guid": 1010224,
      "id": "steel",
      "kind": "good",
      "name": "Steel"
    },
    {
      "guid": 1010210,
      "id": "sails",
      "kind": "good",
      "name": "Sails"
    },
    {
      "guid": 1010221,
      "id": "weapons",
      "kind": "good",
      "name": "Weapons"
    },
    {
      "guid": 100438,
      "id": "schooner",
      "kind": "ship",
      "name": "Schooner"
    },
    {
      "guid": 100437,
      "id": "gunboat",
      "kind": "ship",
      "name": "Gunboat"
    },
    {
      "guid": 100439,
      "id": "frigate",
      "kind": "ship",
      "name": "Frigate"
    },
    {
      "guid": 100441,
      "id": "clipper",
      "kind": "ship",
      "name": "Clipper"
    },
    {
      "guid": 100440,
      "id": "ship-of-the-line",
      "kind": "ship",
      "name": "Ship of the Line"
    },
    {
      "guid": 1010062,
      "id": "cargo-ship",
      "kind": "ship",
      "name": "Cargo Ship"
    },
    {
      "guid": 100442,
      "id": "battle-cruiser",
      "kind": "ship",
      "name": "Battle Cruiser"
    },
    {
      "guid": 100443,
      "id": "monitor",
      "kind": "ship",
      "name": "Monitor"
    },
    {
      "guid": 100853,
      "id": "oil-tanker",
      "kind": "ship",
      "name": "Oil Tanker"
    },
    {
      "guid": 180023,
      "id": "old-world",
      "kind": "island",
      "name": "Old World"
    },
    {
      "guid": 180025,
      "id": "new-world",
      "kind": "island",
      "name": "New World"
    },
    {
      "guid": 180014,
      "id": "bright-sands",
      "kind": "island",
      "name": "Bright Sands"
    }
  ]
}
'@
$scanCs = @'
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;

namespace HarborBuddy {
  public static class A7sScan {
    public const string ReaderId = "harbor-watcher";
    public const string ReaderVersion = "0.6.1";
    public const string ReaderEngine = "a7s-scan";
    static readonly string[] ReaderCapabilities = {
      "buildings", "playerGoods", "playerTreasury", "routes", "routeStations",
      "islandSnapshots", "islandNames", "islandStock", "islandBuildings", "fleet"
    };

    static void AppendReader(StringBuilder sb) {
      sb.Append("\"reader\":{\"id\":\"").Append(ReaderId)
        .Append("\",\"version\":\"").Append(ReaderVersion)
        .Append("\",\"engine\":\"").Append(ReaderEngine)
        .Append("\",\"capabilities\":[");
      for (int i = 0; i < ReaderCapabilities.Length; i++) {
        if (i > 0) sb.Append(",");
        sb.Append("\"").Append(ReaderCapabilities[i]).Append("\"");
      }
      sb.Append("]}");
    }

    public static string Run(byte[] buf, string guidJson) {
      buf = NormalizeArchive(buf);
      var guids = ParseGuids(guidJson);
      var files = Unpack(buf);
      var buildings = new Dictionary<string, string>();
      var buildingCounts = new Dictionary<string, int>();
      var goods = new Dictionary<string, int>();
      var islands = new Dictionary<string, string>();
      int? money = null;
      int? lastParticipant = null;
      var playerStorage = false;
      int? pending = null;
      var farmers = false; var workers = false; var artisans = false; var engineers = false;
      string session = "";
      byte[] data = null;
      var routes = new List<RouteRow>();
      var islandsExtract = new IslandExtract();
      var fleet = new List<FleetShip>();
      foreach (var kv in files) {
        if (kv.Key == "meta.a7s") {
          Visit(kv.Value, (path, attr, payload) => {
            if (attr == "CorporationSaveGameName") {
              var t = Utf16(payload);
              if (t.EndsWith(".a7s")) t = t.Substring(0, t.Length - 4);
              if (t.Length > 0) session = t;
            }
          });
        }
        if (kv.Key == "data.a7s") data = kv.Value;
      }
      if (data == null && files.Count > 0) {
        foreach (var kv in files) data = kv.Value;
      }
      if (data != null) {
        Visit(data, (path, attr, payload) => {
          var v = AsI32(payload);
          if (attr == "ParticipantID" && v.HasValue) lastParticipant = v;
          if (path.EndsWith("CountsPerGUID") && v.HasValue) {
            if (pending == null) pending = v;
            else {
              GuidRow row;
              if (guids.TryGetValue(pending.Value, out row) && row.kind == "building" && v.Value > 0) {
                buildings[row.id] = row.name;
                int prevCount;
                buildingCounts[row.id] = (buildingCounts.TryGetValue(row.id, out prevCount) ? prevCount : 0) + v.Value;
                if (row.id == "farmer-house") farmers = true;
                if (row.id == "worker-house") workers = true;
                if (row.id == "artisan-house") artisans = true;
                if (row.id == "engineer-house") engineers = true;
              }
              pending = null;
            }
          }
          if (attr == "StrgLrg" && payload != null && payload.Length >= 8) {
            if (lastParticipant.HasValue && lastParticipant.Value == 0) {
              playerStorage = true;
              for (int i = 0; i + 8 <= payload.Length; i += 8) {
                int g = BitConverter.ToInt32(payload, i);
                int amt = BitConverter.ToInt32(payload, i + 4);
                if (g == 1010017) {
                  money = amt;
                  continue;
                }
                GuidRow row;
                if (guids.TryGetValue(g, out row) && row.kind == "good") goods[row.id] = amt;
              }
            }
          }
          if ((attr == "CurrentlyActiveSession" || attr == "LastActiveSession" || attr == "StartSessionGUID") && v.HasValue) {
            GuidRow row;
            if (guids.TryGetValue(v.Value, out row) && row.kind == "island") islands[row.id] = row.name;
          }
        });
        routes = ExtractRoutes(data, guids);
        islandsExtract = ExtractIslands(data, guids);
        fleet = ExtractFleet(data, guids, routes);
      }
      var sb = new StringBuilder();
      sb.Append("{");
      AppendReader(sb);
      sb.Append(",\"sessionName\":\"").Append(Esc(session)).Append("\"");
      sb.Append(",\"storageOwner\":\"").Append(playerStorage ? "player" : "unknown").Append("\"");
      if (playerStorage && money.HasValue) sb.Append(",\"money\":").Append(money.Value);
      if (!playerStorage) goods.Clear();
      sb.Append(",\"farmers\":").Append(farmers ? "true" : "false");
      sb.Append(",\"workers\":").Append(workers ? "true" : "false");
      sb.Append(",\"artisans\":").Append(artisans ? "true" : "false");
      sb.Append(",\"engineers\":").Append(engineers ? "true" : "false");
      sb.Append(",\"buildings\":[");
      bool first = true;
      foreach (var kv in buildings) {
        if (!first) sb.Append(",");
        first = false;
        int count;
        buildingCounts.TryGetValue(kv.Key, out count);
        sb.Append("{\"id\":\"").Append(Esc(kv.Key)).Append("\",\"name\":\"").Append(Esc(kv.Value)).Append("\",\"count\":").Append(count).Append("}");
      }
      sb.Append("],\"goods\":[");
      first = true;
      foreach (var kv in goods) {
        var name = kv.Key;
        foreach (var g in guids) {
          if (g.Value.id == kv.Key && g.Value.kind == "good") { name = g.Value.name; break; }
        }
        if (!first) sb.Append(",");
        first = false;
        sb.Append("{\"id\":\"").Append(Esc(kv.Key)).Append("\",\"name\":\"").Append(Esc(name)).Append("\",\"amount\":").Append(kv.Value).Append("}");
      }
      sb.Append("],\"islands\":[");
      first = true;
      foreach (var kv in islands) {
        if (!first) sb.Append(",");
        first = false;
        sb.Append("{\"id\":\"").Append(Esc(kv.Key)).Append("\",\"name\":\"").Append(Esc(kv.Value)).Append("\"}");
      }
      sb.Append("],\"routes\":[");
      first = true;
      foreach (var route in routes) {
        if (!first) sb.Append(",");
        first = false;
        sb.Append("{\"name\":\"").Append(Esc(route.Name)).Append("\"");
        if (route.Id.HasValue) sb.Append(",\"id\":").Append(route.Id.Value);
        if (route.OwnerId.HasValue) sb.Append(",\"ownerId\":").Append(route.OwnerId.Value);
        sb.Append(",\"shipCount\":").Append(route.ShipCount).Append(",\"stops\":[");
        bool firstStop = true;
        foreach (var stop in route.Stops) {
          if (!firstStop) sb.Append(",");
          firstStop = false;
          sb.Append("{");
          if (stop.AreaId.HasValue) sb.Append("\"areaId\":").Append(stop.AreaId.Value).Append(",");
          sb.Append("\"goods\":[");
          bool firstGood = true;
          foreach (var good in stop.Goods) {
            if (!firstGood) sb.Append(",");
            firstGood = false;
            sb.Append("{\"guid\":").Append(good.Guid)
              .Append(",\"amount\":").Append(good.Amount);
            if (!string.IsNullOrEmpty(good.Name)) sb.Append(",\"name\":\"").Append(Esc(good.Name)).Append("\"");
            if (good.IsLoading.HasValue) sb.Append(",\"isLoading\":").Append(good.IsLoading.Value ? "true" : "false");
            sb.Append("}");
          }
          sb.Append("]}");
        }
        sb.Append("]");
        if (route.ShipNames.Count > 0) {
          sb.Append(",\"ships\":[");
          bool firstShip = true;
          foreach (var shipName in route.ShipNames) {
            if (!firstShip) sb.Append(",");
            firstShip = false;
            sb.Append("{\"name\":\"").Append(Esc(shipName)).Append("\"}");
          }
          sb.Append("]");
        }
        if (route.Delivery != null) {
          var delivery = route.Delivery;
          sb.Append(",\"delivery\":{\"visitCount\":").Append(delivery.VisitCount)
            .Append(",\"lastExecutionTime\":").Append(delivery.LastExecutionTime);
          if (delivery.IntervalMsMedian.HasValue) {
            sb.Append(",\"intervalMsMedian\":").Append(delivery.IntervalMsMedian.Value);
          }
          sb.Append(",\"goods\":[");
          bool firstDel = true;
          foreach (var good in delivery.Goods) {
            if (!firstDel) sb.Append(",");
            firstDel = false;
            sb.Append("{\"guid\":").Append(good.Guid)
              .Append(",\"visitCount\":").Append(good.VisitCount)
              .Append(",\"medianAbsAmount\":").Append(good.MedianAbsAmount)
              .Append(",\"lastAmount\":").Append(good.LastAmount);
            if (!string.IsNullOrEmpty(good.Name)) sb.Append(",\"name\":\"").Append(Esc(good.Name)).Append("\"");
            sb.Append("}");
          }
          sb.Append("]");
          if (delivery.Stations.Count > 0) {
            sb.Append(",\"stations\":[");
            bool firstSt = true;
            foreach (var station in delivery.Stations) {
              if (!firstSt) sb.Append(",");
              firstSt = false;
              sb.Append("{\"guid\":").Append(station.Guid)
                .Append(",\"visitCount\":").Append(station.VisitCount)
                .Append(",\"medianAbsAmount\":").Append(station.MedianAbsAmount)
                .Append(",\"lastAmount\":").Append(station.LastAmount);
              if (station.AreaId.HasValue) sb.Append(",\"areaId\":").Append(station.AreaId.Value);
              if (station.IntervalMsMedian.HasValue) sb.Append(",\"intervalMsMedian\":").Append(station.IntervalMsMedian.Value);
              if (!string.IsNullOrEmpty(station.Name)) sb.Append(",\"name\":\"").Append(Esc(station.Name)).Append("\"");
              sb.Append("}");
            }
            sb.Append("]");
          }
          sb.Append("}");
        }
        sb.Append("}");
      }
      sb.Append("]");
      if (islandsExtract.SimTime.HasValue) sb.Append(",\"simTime\":").Append(islandsExtract.SimTime.Value);
      if (!string.IsNullOrEmpty(islandsExtract.SnapshotId)) {
        sb.Append(",\"snapshotId\":\"").Append(Esc(islandsExtract.SnapshotId)).Append("\"");
      }
      bool anyPlayerIsland = false;
      foreach (var island in islandsExtract.Islands) if (island.OwnerId == 0) anyPlayerIsland = true;
      if (anyPlayerIsland) sb.Append(",\"playerId\":0");
      sb.Append(",\"islandSnapshots\":[");
      first = true;
      int islandCount = 0;
      foreach (var island in islandsExtract.Islands) {
        if (island.OwnerId != 0) continue;
        if (islandCount >= 40) break;
        islandCount++;
        if (!first) sb.Append(",");
        first = false;
        sb.Append("{\"regionId\":").Append(island.RegionId)
          .Append(",\"areaId\":").Append(island.AreaId)
          .Append(",\"ownerId\":").Append(island.OwnerId)
          .Append(",\"name\":\"").Append(Esc(island.Name)).Append("\"")
          .Append(",\"nameSource\":\"").Append(Esc(island.NameSource)).Append("\"");
        if (island.Stock.Count > 0 && island.Stock.Count <= 24) {
          sb.Append(",\"stock\":[");
          bool firstStock = true;
          foreach (var good in island.Stock) {
            if (!firstStock) sb.Append(",");
            firstStock = false;
            sb.Append("{\"id\":\"").Append(Esc(good.Id)).Append("\",\"name\":\"").Append(Esc(good.Name)).Append("\",\"amount\":").Append(good.Amount).Append("}");
          }
          sb.Append("]");
        }
        if (island.Buildings.Count > 0 && island.Buildings.Count <= 40) {
          sb.Append(",\"buildings\":[");
          bool firstBuilding = true;
          foreach (var building in island.Buildings) {
            if (!firstBuilding) sb.Append(",");
            firstBuilding = false;
            sb.Append("{\"id\":\"").Append(Esc(building.Id)).Append("\",\"name\":\"").Append(Esc(building.Name)).Append("\"");
            if (building.Count > 0) sb.Append(",\"count\":").Append(building.Count);
            sb.Append("}");
          }
          sb.Append("]");
        }
        sb.Append(",\"coverage\":{\"identity\":{\"source\":\"save\"}");
        if (island.Stock.Count > 0 && island.Stock.Count <= 24) sb.Append(",\"stock\":{\"source\":\"save\"}");
        if (island.Buildings.Count > 0 && island.Buildings.Count <= 40) sb.Append(",\"buildings\":{\"source\":\"save\"}");
        sb.Append("}}");
      }
      sb.Append("]");
      sb.Append(",\"fleet\":[");
      first = true;
      int fleetCount = 0;
      foreach (var ship in fleet) {
        if (ship.OwnerId != 0) continue;
        if (fleetCount >= 80) break;
        fleetCount++;
        if (!first) sb.Append(",");
        first = false;
        sb.Append("{\"ownerId\":0");
        if (!string.IsNullOrEmpty(ship.Name)) sb.Append(",\"name\":\"").Append(Esc(ship.Name)).Append("\"");
        if (ship.Guid.HasValue) {
          sb.Append(",\"guid\":").Append(ship.Guid.Value);
          if (!string.IsNullOrEmpty(ship.Id)) sb.Append(",\"id\":\"").Append(Esc(ship.Id)).Append("\"");
          if (!string.IsNullOrEmpty(ship.TypeName)) sb.Append(",\"typeName\":\"").Append(Esc(ship.TypeName)).Append("\"");
          if (!string.IsNullOrEmpty(ship.Kind)) sb.Append(",\"kind\":\"").Append(Esc(ship.Kind)).Append("\"");
        }
        if (ship.MetaId.HasValue) sb.Append(",\"metaId\":").Append(ship.MetaId.Value);
        if (ship.RouteId.HasValue) {
          sb.Append(",\"assignment\":{\"kind\":\"trade-route\",\"routeId\":").Append(ship.RouteId.Value);
          if (!string.IsNullOrEmpty(ship.RouteName)) sb.Append(",\"routeName\":\"").Append(Esc(ship.RouteName)).Append("\"");
          sb.Append("}");
        }
        if (ship.RegionId.HasValue || ship.AreaId.HasValue) {
          sb.Append(",\"location\":{");
          bool locFirst = true;
          if (ship.RegionId.HasValue) { sb.Append("\"regionId\":").Append(ship.RegionId.Value); locFirst = false; }
          if (ship.AreaId.HasValue) {
            if (!locFirst) sb.Append(",");
            sb.Append("\"areaId\":").Append(ship.AreaId.Value);
          }
          sb.Append("}");
        }
        sb.Append(",\"coverage\":{\"identity\":{\"source\":\"save\",\"scope\":\"player\"}");
        if (ship.Guid.HasValue) sb.Append(",\"type\":{\"source\":\"save\"}");
        if (ship.RouteId.HasValue) sb.Append(",\"assignment\":{\"source\":\"save\"}");
        if (ship.RegionId.HasValue || ship.AreaId.HasValue) sb.Append(",\"location\":{\"source\":\"save\",\"scope\":\"area\"}");
        sb.Append("}}");
      }
      sb.Append("]}");
      return sb.ToString();
    }

    struct GuidRow { public string id; public string kind; public string name; }
    sealed class DbLeaf { public string Attr; public byte[] Bytes; }
    sealed class DbNode {
      public string Tag;
      public readonly List<DbLeaf> Leaves = new List<DbLeaf>();
      public readonly List<DbNode> Children = new List<DbNode>();
    }
    sealed class RouteGood { public int Guid; public int Amount; public string Name; public bool? IsLoading; }
    sealed class RouteStop {
      public int? AreaId;
      public readonly List<RouteGood> Goods = new List<RouteGood>();
    }
    sealed class RouteDeliveryGood {
      public int Guid;
      public string Name;
      public int VisitCount;
      public int MedianAbsAmount;
      public int LastAmount;
    }
    sealed class RouteStationDelivery {
      public int? AreaId;
      public int Guid;
      public string Name;
      public int VisitCount;
      public int MedianAbsAmount;
      public int LastAmount;
      public long? IntervalMsMedian;
    }
    sealed class RouteDelivery {
      public int VisitCount;
      public long LastExecutionTime;
      public long? IntervalMsMedian;
      public readonly List<RouteDeliveryGood> Goods = new List<RouteDeliveryGood>();
      public readonly List<RouteStationDelivery> Stations = new List<RouteStationDelivery>();
    }
    sealed class RouteVisit {
      public long Time;
      public bool Finalized;
      public int? AreaId;
      public readonly List<int> Guids = new List<int>();
      public readonly List<int> Amounts = new List<int>();
    }
    sealed class RouteRow {
      public int? Id;
      public string Name;
      public int? OwnerId;
      public int ShipCount;
      public readonly List<RouteStop> Stops = new List<RouteStop>();
      public readonly List<string> ShipNames = new List<string>();
      public RouteDelivery Delivery;
    }
    sealed class IslandStock { public string Id; public string Name; public int Amount; }
    sealed class IslandBuilding { public string Id; public string Name; public int Count; }
    sealed class IslandRow {
      public int RegionId;
      public int AreaId;
      public int OwnerId;
      public string Name;
      public string NameSource;
      public readonly List<IslandStock> Stock = new List<IslandStock>();
      public readonly List<IslandBuilding> Buildings = new List<IslandBuilding>();
    }
    sealed class IslandExtract {
      public readonly List<IslandRow> Islands = new List<IslandRow>();
      public long? SimTime;
      public string SnapshotId;
    }
    sealed class FleetShip {
      public string Name;
      public int? Guid;
      public string Id;
      public string TypeName;
      public string Kind;
      public int OwnerId;
      public int? MetaId;
      public int? RouteId;
      public string RouteName;
      public int? RegionId;
      public int? AreaId;
    }

    static Dictionary<int, GuidRow> ParseGuids(string json) {
      var map = new Dictionary<int, GuidRow>();
      if (string.IsNullOrEmpty(json)) return map;
      int i = 0;
      while (true) {
        int g = json.IndexOf("\"guid\"", i, StringComparison.Ordinal);
        if (g < 0) break;
        int colon = json.IndexOf(':', g);
        int guid = 0;
        if (colon > 0) {
          int p = colon + 1;
          while (p < json.Length && (json[p] == ' ' || json[p] == '\n' || json[p] == '\r' || json[p] == '\t')) p++;
          int q = p;
          while (q < json.Length && json[q] >= '0' && json[q] <= '9') q++;
          if (q > p) int.TryParse(json.Substring(p, q - p), out guid);
        }
        string id = SliceField(json, "id", g);
        string kind = SliceField(json, "kind", g);
        string name = SliceField(json, "name", g);
        if (guid != 0 && id != null) map[guid] = new GuidRow { id = id, kind = kind ?? "", name = name ?? id };
        i = g + 6;
      }
      return map;
    }

    static string SliceField(string s, string field, int from) {
      string key = "\"" + field + "\"";
      int k = s.IndexOf(key, from, StringComparison.Ordinal);
      if (k < 0 || k > from + 400) return null;
      int colon = s.IndexOf(':', k);
      if (colon < 0) return null;
      int a = colon + 1;
      while (a < s.Length && (s[a] == ' ' || s[a] == '\n' || s[a] == '\r' || s[a] == '\t')) a++;
      if (a >= s.Length || s[a] != '"') return null;
      a++;
      int b = s.IndexOf('"', a);
      return b < 0 ? null : s.Substring(a, b - a);
    }
    static string Esc(string s) { return (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\""); }
    static string Utf16(byte[] p) {
      if (p == null || p.Length < 2) return "";
      return Encoding.Unicode.GetString(p).TrimEnd('\0').Trim();
    }
    static int? AsI32(byte[] p) {
      if (p == null) return null;
      if (p.Length == 4) return BitConverter.ToInt32(p, 0);
      if (p.Length == 2) return BitConverter.ToUInt16(p, 0);
      return null;
    }

    static byte[] NormalizeArchive(byte[] buf) {
      if (buf == null) return new byte[0];
      var magic = Encoding.ASCII.GetBytes("Resource File V2.2");
      int limit = Math.Min(256, buf.Length - magic.Length);
      for (int start = 0; start <= limit; start++) {
        bool match = true;
        for (int i = 0; i < magic.Length; i++) {
          if (buf[start + i] != magic[i]) { match = false; break; }
        }
        if (match) return start == 0 ? buf : SliceBuf(buf, start, buf.Length - start);
      }
      return buf;
    }

    static DbNode Child(DbNode node, string tag) {
      if (node == null) return null;
      foreach (var item in node.Children) if (item.Tag == tag) return item;
      return null;
    }

    static byte[] Leaf(DbNode node, string attr) {
      if (node == null) return null;
      foreach (var item in node.Leaves) if (item.Attr == attr) return item.Bytes;
      return null;
    }

    static int? LeafInt(DbNode node, string attr) { return AsI32(Leaf(node, attr)); }

    static List<RouteRow> ExtractRoutes(byte[] data, Dictionary<int, GuidRow> guids) {
      var output = new List<RouteRow>();
      var root = ParseTree(data);
      var meta = Child(root, "MetaGameManager");
      var manager = Child(meta, "SessionTradeRouteManager");
      var routeMap = Child(manager, "RouteMap");
      if (routeMap == null) return output;
      foreach (var routeNode in routeMap.Children) {
        var owner = Child(routeNode, "Owner");
        var ownerId = LeafInt(owner, "id");
        if (ownerId.HasValue && ownerId.Value != 0) continue;
        var id = LeafInt(routeNode, "ID");
        var nameBytes = Leaf(routeNode, "Name");
        var name = Utf16(nameBytes);
        if (string.IsNullOrEmpty(name)) name = id.HasValue ? ("Ruta " + id.Value) : "Ruta comercial";
        var row = new RouteRow {
          Id = id,
          Name = name,
          OwnerId = ownerId,
          ShipCount = (Leaf(routeNode, "Ships") ?? new byte[0]).Length / 8
        };
        var stations = Child(routeNode, "Stations");
        if (stations != null) {
          foreach (var stopNode in stations.Children) {
            var stop = new RouteStop { AreaId = LeafInt(stopNode, "AreaID") };
            var goodInfos = Child(stopNode, "GoodInfos");
            if (goodInfos != null) {
              foreach (var goodNode in goodInfos.Children) {
                var guid = LeafInt(goodNode, "ProductGUID");
                var amount = LeafInt(goodNode, "Amount");
                if (!guid.HasValue || !amount.HasValue || guid.Value == 0) continue;
                GuidRow guidRow;
                var loading = Leaf(goodNode, "IsLoading");
                bool? isLoading = null;
                if (loading != null && loading.Length > 0) isLoading = loading[0] != 0;
                stop.Goods.Add(new RouteGood {
                  Guid = guid.Value,
                  Amount = amount.Value,
                  Name = guids.TryGetValue(guid.Value, out guidRow) ? guidRow.name : "",
                  IsLoading = isLoading
                });
              }
            }
            row.Stops.Add(stop);
          }
        }
        output.Add(row);
      }
      var shipsByRoute = new Dictionary<int, List<string>>();
      CollectRouteShips(root, shipsByRoute);
      var visitsByRoute = new Dictionary<int, List<RouteVisit>>();
      CollectRouteVisits(root, visitsByRoute, 4000);
      foreach (var route in output) {
        if (!route.Id.HasValue) continue;
        List<string> names;
        if (shipsByRoute.TryGetValue(route.Id.Value, out names)) {
          foreach (var name in names) if (route.ShipNames.Count < 8) route.ShipNames.Add(name);
        }
        List<RouteVisit> visits;
        if (visitsByRoute.TryGetValue(route.Id.Value, out visits)) {
          route.Delivery = SummarizeDelivery(visits, guids);
        }
      }
      return output;
    }

    static string ShipClass(string id) {
      if (id == "schooner" || id == "clipper" || id == "cargo-ship" || id == "oil-tanker") return "trade";
      if (id == "gunboat" || id == "frigate" || id == "ship-of-the-line" || id == "battle-cruiser" || id == "monitor") return "military";
      return "";
    }

    static List<FleetShip> ExtractFleet(byte[] data, Dictionary<int, GuidRow> guids, List<RouteRow> routes) {
      var output = new List<FleetShip>();
      var root = ParseTree(data);
      if (root == null) return output;
      var routeNames = new Dictionary<int, string>();
      foreach (var route in routes) {
        if (route.Id.HasValue && !string.IsNullOrEmpty(route.Name)) routeNames[route.Id.Value] = route.Name;
      }
      CollectFleet(root, null, null, guids, routeNames, output, new HashSet<string>());
      return output;
    }

    static void CollectFleet(
      DbNode node,
      int? regionId,
      int? areaId,
      Dictionary<int, GuidRow> guids,
      Dictionary<int, string> routeNames,
      List<FleetShip> output,
      HashSet<string> seen
    ) {
      if (node == null || output.Count >= 80) return;
      var sessionGuid = LeafInt(node, "SessionGUID");
      if (sessionGuid.HasValue) regionId = sessionGuid;
      var fromTag = AreaManagerId(node.Tag);
      if (fromTag.HasValue) areaId = fromTag;
      var nameable = Child(node, "Nameable");
      if (nameable != null) {
        var name = Utf16(Leaf(nameable, "VehicleName"));
        if (!string.IsNullOrEmpty(name)) {
          var owner = Child(node, "Owner");
          var ownerId = owner != null ? LeafInt(owner, "id") : LeafInt(node, "Owner");
          if (ownerId.HasValue && ownerId.Value == 0) {
            var guid = LeafInt(node, "guid");
            if (!guid.HasValue) guid = LeafInt(node, "GUID");
            var meta = Child(node, "MetaPersistent");
            int? metaId = null;
            if (meta != null) {
              var meta64 = LeafInt64(meta, "MetaID");
              if (meta64.HasValue && meta64.Value >= int.MinValue && meta64.Value <= int.MaxValue)
                metaId = (int)meta64.Value;
            }
            var trade = Child(node, "PropertyTradeRouteVehicle");
            var routeId = trade != null ? LeafInt(trade, "TradeRouteID") : null;
            var objectId = LeafInt64(node, "ID") ?? LeafInt64(node, "id");
            string key = metaId.HasValue
              ? ("meta:" + metaId.Value)
              : objectId.HasValue
                ? ("obj:" + objectId.Value)
                : ("slot:" + output.Count + ":g:" + (guid.HasValue ? guid.Value : 0) + ":a:" + (areaId.HasValue ? areaId.Value : 0));
            if (!seen.Contains(key)) {
              seen.Add(key);
              var ship = new FleetShip {
                Name = name.Length > 80 ? name.Substring(0, 80) : name,
                Guid = guid,
                OwnerId = 0,
                MetaId = metaId,
                RouteId = routeId,
                RegionId = regionId,
                AreaId = areaId
              };
              if (guid.HasValue) {
                GuidRow row;
                if (guids.TryGetValue(guid.Value, out row) && row.kind == "ship") {
                  ship.Id = row.id;
                  ship.TypeName = row.name;
                  ship.Kind = ShipClass(row.id);
                }
              }
              if (routeId.HasValue) {
                string routeName;
                if (routeNames.TryGetValue(routeId.Value, out routeName)) ship.RouteName = routeName;
              }
              output.Add(ship);
            }
          }
        }
      }
      foreach (var child in node.Children) CollectFleet(child, regionId, areaId, guids, routeNames, output, seen);
    }

    static void CollectRouteShips(DbNode node, Dictionary<int, List<string>> byRoute) {
      if (node == null) return;
      var nameable = Child(node, "Nameable");
      var trade = Child(node, "PropertyTradeRouteVehicle");
      if (nameable != null && trade != null) {
        var name = Utf16(Leaf(nameable, "VehicleName"));
        var routeId = LeafInt(trade, "TradeRouteID");
        if (!string.IsNullOrEmpty(name) && routeId.HasValue) {
          List<string> list;
          if (!byRoute.TryGetValue(routeId.Value, out list)) {
            list = new List<string>();
            byRoute[routeId.Value] = list;
          }
          if (!list.Contains(name) && list.Count < 8) list.Add(name.Length > 80 ? name.Substring(0, 80) : name);
        }
      }
      foreach (var child in node.Children) CollectRouteShips(child, byRoute);
    }

    static void CollectRouteVisits(DbNode node, Dictionary<int, List<RouteVisit>> byRoute, int remaining) {
      if (node == null || remaining <= 0) return;
      var routeId = LeafInt(node, "RouteID");
      var time = LeafInt64(node, "ExecutionTime");
      var goods = Child(node, "TradedGoods");
      if (routeId.HasValue && time.HasValue && goods != null) {
        var finalized = Leaf(node, "Finalized");
        var visit = new RouteVisit {
          Time = time.Value,
          Finalized = finalized != null && finalized.Length > 0 && finalized[0] != 0,
          AreaId = LeafInt(node, "AreaID") ?? LeafInt(node, "Identifier")
        };
        foreach (var goodNode in goods.Children) {
          var guid = LeafInt(goodNode, "GoodGuid");
          var amount = LeafInt(goodNode, "GoodAmount");
          if (!guid.HasValue || !amount.HasValue || guid.Value == 0) continue;
          visit.Guids.Add(guid.Value);
          visit.Amounts.Add(amount.Value);
        }
        List<RouteVisit> list;
        if (!byRoute.TryGetValue(routeId.Value, out list)) {
          list = new List<RouteVisit>();
          byRoute[routeId.Value] = list;
        }
        if (list.Count < 400) list.Add(visit);
        remaining--;
      }
      foreach (var child in node.Children) CollectRouteVisits(child, byRoute, remaining);
    }

    static int MedianInt(List<int> values) {
      values.Sort();
      int n = values.Count;
      if (n % 2 == 1) return values[n / 2];
      return (int)Math.Round((values[n / 2 - 1] + values[n / 2]) / 2.0);
    }

    static long MedianLong(List<long> values) {
      values.Sort();
      int n = values.Count;
      if (n % 2 == 1) return values[n / 2];
      return (long)Math.Round((values[n / 2 - 1] + values[n / 2]) / 2.0);
    }

    static RouteDelivery SummarizeDelivery(List<RouteVisit> visits, Dictionary<int, GuidRow> guids) {
      var finalized = new List<RouteVisit>();
      foreach (var visit in visits) if (visit.Finalized) finalized.Add(visit);
      if (finalized.Count == 0) return null;
      finalized.Sort((a, b) => a.Time.CompareTo(b.Time));
      var intervals = new List<long>();
      for (int i = 1; i < finalized.Count; i++) {
        long delta = finalized[i].Time - finalized[i - 1].Time;
        if (delta > 0) intervals.Add(delta);
      }
      var last = finalized[finalized.Count - 1];
      var amounts = new Dictionary<int, List<int>>();
      var lastAmount = new Dictionary<int, int>();
      foreach (var visit in finalized) {
        for (int i = 0; i < visit.Guids.Count; i++) {
          int guid = visit.Guids[i];
          int amt = visit.Amounts[i];
          List<int> list;
          if (!amounts.TryGetValue(guid, out list)) {
            list = new List<int>();
            amounts[guid] = list;
          }
          list.Add(amt);
          lastAmount[guid] = amt;
        }
      }
      var delivery = new RouteDelivery {
        VisitCount = finalized.Count,
        LastExecutionTime = last.Time,
        IntervalMsMedian = intervals.Count > 0 ? MedianLong(intervals) : (long?)null
      };
      foreach (var kv in amounts) {
        var abs = new List<int>();
        foreach (var amt in kv.Value) abs.Add(Math.Abs(amt));
        GuidRow guidRow;
        delivery.Goods.Add(new RouteDeliveryGood {
          Guid = kv.Key,
          Name = guids.TryGetValue(kv.Key, out guidRow) && guidRow.kind == "good" ? guidRow.name : "",
          VisitCount = kv.Value.Count,
          MedianAbsAmount = MedianInt(abs),
          LastAmount = lastAmount[kv.Key]
        });
      }
      var stationTimes = new Dictionary<string, List<long>>();
      var stationAmounts = new Dictionary<string, List<int>>();
      var stationLast = new Dictionary<string, int>();
      var stationArea = new Dictionary<string, int?>();
      var stationGuid = new Dictionary<string, int>();
      foreach (var visit in finalized) {
        for (int i = 0; i < visit.Guids.Count; i++) {
          int guid = visit.Guids[i];
          string key = (visit.AreaId.HasValue ? visit.AreaId.Value.ToString() : "x") + ":" + guid;
          List<long> times;
          if (!stationTimes.TryGetValue(key, out times)) {
            times = new List<long>();
            stationTimes[key] = times;
            stationAmounts[key] = new List<int>();
            stationArea[key] = visit.AreaId;
            stationGuid[key] = guid;
          }
          times.Add(visit.Time);
          stationAmounts[key].Add(visit.Amounts[i]);
          stationLast[key] = visit.Amounts[i];
        }
      }
      foreach (var kv in stationTimes) {
        var times = kv.Value;
        var stationIntervals = new List<long>();
        for (int i = 1; i < times.Count; i++) {
          long delta = times[i] - times[i - 1];
          if (delta > 0) stationIntervals.Add(delta);
        }
        var abs = new List<int>();
        foreach (var amt in stationAmounts[kv.Key]) abs.Add(Math.Abs(amt));
        GuidRow guidRow;
        int guid = stationGuid[kv.Key];
        delivery.Stations.Add(new RouteStationDelivery {
          AreaId = stationArea[kv.Key],
          Guid = guid,
          Name = guids.TryGetValue(guid, out guidRow) && guidRow.kind == "good" ? guidRow.name : "",
          VisitCount = stationAmounts[kv.Key].Count,
          MedianAbsAmount = MedianInt(abs),
          LastAmount = stationLast[kv.Key],
          IntervalMsMedian = stationIntervals.Count > 0 ? MedianLong(stationIntervals) : (long?)null
        });
      }
      return delivery;
    }

    static bool IsNestedFileDb(byte[] bytes) {
      if (bytes == null || bytes.Length < 20) return false;
      return BitConverter.ToUInt32(bytes, bytes.Length - 4) == 0xFFFFFFFD;
    }

    static DbNode FindDescendant(DbNode node, string tag) {
      if (node == null) return null;
      if (node.Tag == tag) return node;
      foreach (var item in node.Children) {
        var hit = FindDescendant(item, tag);
        if (hit != null) return hit;
      }
      return null;
    }

    static int? FindLeafInt(DbNode node, string attr, int depth) {
      if (node == null || depth < 0) return null;
      var direct = LeafInt(node, attr);
      if (direct.HasValue) return direct;
      foreach (var item in node.Children) {
        var hit = FindLeafInt(item, attr, depth - 1);
        if (hit.HasValue) return hit;
      }
      return null;
    }

    static long? AsInt64(byte[] p) {
      if (p == null) return null;
      if (p.Length == 8) return BitConverter.ToInt64(p, 0);
      if (p.Length == 4) return BitConverter.ToInt32(p, 0);
      if (p.Length == 2) return BitConverter.ToUInt16(p, 0);
      return null;
    }

    static long? LeafInt64(DbNode node, string attr) { return AsInt64(Leaf(node, attr)); }

    static long? FindLeafInt64(DbNode node, string attr, int depth) {
      if (node == null || depth < 0) return null;
      var direct = LeafInt64(node, attr);
      if (direct.HasValue) return direct;
      foreach (var item in node.Children) {
        var hit = FindLeafInt64(item, attr, depth - 1);
        if (hit.HasValue) return hit;
      }
      return null;
    }

    static string FindLeafText(DbNode node, string attr, int depth) {
      if (node == null || depth < 0) return null;
      var text = Utf16(Leaf(node, attr));
      if (!string.IsNullOrEmpty(text)) return text;
      foreach (var item in node.Children) {
        var hit = FindLeafText(item, attr, depth - 1);
        if (!string.IsNullOrEmpty(hit)) return hit;
      }
      return null;
    }

    static int? AreaManagerId(string tag) {
      if (string.IsNullOrEmpty(tag) || !tag.StartsWith("AreaManager_")) return null;
      int id;
      if (int.TryParse(tag.Substring("AreaManager_".Length), out id)) return id;
      return null;
    }

    static string NeutralIslandName(int? cityNameGuid, int areaId) {
      if (cityNameGuid.HasValue && cityNameGuid.Value != 0) return "[" + cityNameGuid.Value + "]";
      return "area-" + areaId;
    }

    static void CollectAttr(DbNode node, string attr, List<byte[]> blobs) {
      foreach (var leaf in node.Leaves) {
        if (leaf.Attr == attr && leaf.Bytes != null && leaf.Bytes.Length > 0) blobs.Add(leaf.Bytes);
      }
      foreach (var child in node.Children) CollectAttr(child, attr, blobs);
    }

    static List<IslandStock> StockFromManager(DbNode manager, Dictionary<int, GuidRow> guids) {
      // Real AreaManager_* nodes observed 2026-09-20 (cloud + local) do not contain
      // AreaStorageManager — fixtures do. Keep the path; never invent stock as 0.
      var storage = FindDescendant(manager, "AreaStorageManager");
      if (storage == null) return new List<IslandStock>();
      var blobs = new List<byte[]>();
      CollectAttr(storage, "StrgLrg", blobs);
      if (blobs.Count == 0) return new List<IslandStock>();
      var byId = new Dictionary<string, IslandStock>();
      foreach (var blob in blobs) {
        if (blob == null || blob.Length % 8 != 0) continue;
        for (int i = 0; i + 8 <= blob.Length; i += 8) {
          int g = BitConverter.ToInt32(blob, i);
          int amt = BitConverter.ToInt32(blob, i + 4);
          GuidRow row;
          if (!guids.TryGetValue(g, out row) || row.kind != "good") continue;
          if (amt < 0) continue;
          if (byId.ContainsKey(row.id)) continue;
          byId[row.id] = new IslandStock { Id = row.id, Name = row.name, Amount = amt };
        }
      }
      return new List<IslandStock>(byId.Values);
    }

    static List<IslandBuilding> BuildingsFromManager(DbNode manager, Dictionary<int, GuidRow> guids) {
      var counts = new Dictionary<string, IslandBuilding>();
      WalkBuildingCounts(manager, guids, counts);
      return new List<IslandBuilding>(counts.Values);
    }

    static void WalkBuildingCounts(DbNode node, Dictionary<int, GuidRow> guids, Dictionary<string, IslandBuilding> counts) {
      bool inCounts = node.Tag == "CountsPerGUID" || (node.Tag != null && node.Tag.EndsWith("CountsPerGUID"));
      if (inCounts) {
        int? pending = null;
        foreach (var leaf in node.Leaves) {
          if (leaf.Bytes != null && leaf.Bytes.Length >= 8 && leaf.Bytes.Length % 8 == 0) {
            for (int i = 0; i + 8 <= leaf.Bytes.Length; i += 8) {
              AddBuildingCount(counts, guids, BitConverter.ToInt32(leaf.Bytes, i), BitConverter.ToInt32(leaf.Bytes, i + 4));
            }
            continue;
          }
          var value = AsI32(leaf.Bytes);
          if (!value.HasValue) continue;
          if (pending == null) pending = value;
          else {
            AddBuildingCount(counts, guids, pending.Value, value.Value);
            pending = null;
          }
        }
      }
      foreach (var child in node.Children) WalkBuildingCounts(child, guids, counts);
    }

    static void AddBuildingCount(Dictionary<string, IslandBuilding> counts, Dictionary<int, GuidRow> guids, int guid, int amount) {
      if (amount <= 0) return;
      GuidRow row;
      if (!guids.TryGetValue(guid, out row) || row.kind != "building") return;
      IslandBuilding prev;
      int next = amount;
      if (counts.TryGetValue(row.id, out prev)) next += prev.Count;
      counts[row.id] = new IslandBuilding { Id = row.id, Name = row.name, Count = next };
    }

    static void ConsiderSimTime(IslandExtract output, long? candidate) {
      if (!candidate.HasValue || candidate.Value <= 0) return;
      if (!output.SimTime.HasValue || candidate.Value > output.SimTime.Value) output.SimTime = candidate;
    }

    static IslandExtract ExtractIslands(byte[] data, Dictionary<int, GuidRow> guids) {
      var output = new IslandExtract();
      var root = ParseTree(data);
      if (root == null) return output;
      var meta = Child(root, "MetaGameManager") ?? root;
      output.SnapshotId = FindLeafText(meta, "SnapshotID", 6) ?? FindLeafText(meta, "SaveGUID", 6);
      var sessions = FindDescendant(root, "GameSessions");
      var sessionNodes = sessions != null ? sessions.Children : new List<DbNode>();
      if (sessionNodes.Count == 0) {
        var only = FindDescendant(root, "GameSessionManager");
        if (only != null) sessionNodes.Add(only);
      }
      foreach (var sessionNode in sessionNodes) {
        var desc = Child(sessionNode, "SessionDesc") ?? sessionNode;
        var regionId = LeafInt(desc, "SessionGUID") ?? LeafInt(sessionNode, "SessionGUID") ?? FindLeafInt(sessionNode, "SessionGUID", 4);
        if (!regionId.HasValue) continue;
        var manager = FindDescendant(sessionNode, "GameSessionManager");
        if (manager == null) continue;
        ConsiderSimTime(output, LeafInt64(manager, "SessionTotalTime"));
        ConsiderSimTime(output, LeafInt64(manager, "GameTime"));
        var areaInfo = Child(manager, "AreaInfo") ?? FindDescendant(manager, "AreaInfo");
        var areaManagers = Child(manager, "AreaManagers") ?? FindDescendant(manager, "AreaManagers");
        var managersByArea = new Dictionary<int, DbNode>();
        if (areaManagers != null) {
          foreach (var mgr in areaManagers.Children) {
            var fromTag = AreaManagerId(mgr.Tag);
            var fromLeaf = LeafInt(mgr, "Identifier") ?? LeafInt(mgr, "AreaID");
            var areaId = fromTag ?? fromLeaf;
            if (areaId.HasValue) managersByArea[areaId.Value] = mgr;
          }
        }
        if (areaInfo == null) continue;
        var idLeaves = new List<int>();
        foreach (var leaf in areaInfo.Leaves) {
          var value = AsI32(leaf.Bytes);
          if (value.HasValue) idLeaves.Add(value.Value);
        }
        for (int i = 0; i < areaInfo.Children.Count; i++) {
          var record = areaInfo.Children[i];
          var owner = Child(record, "Owner");
          var ownerId = owner != null ? LeafInt(owner, "id") : null;
          if (!ownerId.HasValue) continue;
          int? areaId = LeafInt(record, "Identifier") ?? LeafInt(record, "AreaID");
          if (!areaId.HasValue && idLeaves.Count == areaInfo.Children.Count) areaId = idLeaves[i];
          if (!areaId.HasValue) continue;
          var cityName = Utf16(Leaf(record, "CityName"));
          var cityNameGuid = LeafInt(record, "CityNameGuid");
          string name;
          string nameSource;
          if (!string.IsNullOrEmpty(cityName)) { name = cityName; nameSource = "city-name"; }
          else if (cityNameGuid.HasValue && cityNameGuid.Value != 0) {
            name = NeutralIslandName(cityNameGuid, areaId.Value);
            nameSource = "city-name-guid";
          }
          else { name = NeutralIslandName(cityNameGuid, areaId.Value); nameSource = "neutral"; }
          var row = new IslandRow {
            RegionId = regionId.Value,
            AreaId = areaId.Value,
            OwnerId = ownerId.Value,
            Name = name,
            NameSource = nameSource
          };
          DbNode managerNode;
          if (ownerId.Value == 0 && managersByArea.TryGetValue(areaId.Value, out managerNode)) {
            foreach (var stock in StockFromManager(managerNode, guids)) row.Stock.Add(stock);
            foreach (var building in BuildingsFromManager(managerNode, guids)) row.Buildings.Add(building);
          }
          output.Islands.Add(row);
        }
      }
      var lastSnapshot = FindLeafInt64(meta, "lastSnapshot", 8);
      if (lastSnapshot.HasValue && lastSnapshot.Value > 0) output.SimTime = lastSnapshot;
      if (!output.SimTime.HasValue) {
        ConsiderSimTime(output, FindLeafInt64(meta, "GameTime", 6));
        ConsiderSimTime(output, FindLeafInt64(meta, "SimulationTime", 6));
        ConsiderSimTime(output, FindLeafInt64(meta, "SessionTime", 6));
      }
      return output;
    }

    static DbNode ParseTree(byte[] buf) {
      int magicAt;
      int tagOff;
      int attrOff;
      if (!FindTrailer(buf, out magicAt, out tagOff, out attrOff)) return null;
      var tags = ReadDict(buf, tagOff);
      var attrs = ReadDict(buf, attrOff);
      var root = new DbNode { Tag = "root" };
      var stack = new List<DbNode> { root };
      int pos = 0;
      int nodeEnd = Math.Min(tagOff, buf.Length);
      while (pos + 8 <= nodeEnd) {
        int size = BitConverter.ToInt32(buf, pos);
        int id = BitConverter.ToUInt16(buf, pos + 4);
        pos += 8;
        if (id == 0) {
          if (stack.Count > 1) stack.RemoveAt(stack.Count - 1);
          continue;
        }
        if ((id & 0x8000) != 0) {
          byte[] payload = size > 0 ? SliceBuf(buf, pos, Math.Min(size, nodeEnd - pos)) : new byte[0];
          int pad = (8 - (size % 8)) % 8;
          pos += size + pad;
          string attr;
          if (!attrs.TryGetValue(id, out attr) && !attrs.TryGetValue(id & 0x7FFF, out attr))
            attr = id == 0x8000 ? "None" : ("attr_" + id);
          stack[stack.Count - 1].Leaves.Add(new DbLeaf { Attr = attr, Bytes = payload });
          if (IsNestedFileDb(payload)) {
            var nested = ParseTree(payload);
            if (nested != null) {
              var wrap = new DbNode { Tag = attr };
              wrap.Children.AddRange(nested.Children);
              wrap.Leaves.AddRange(nested.Leaves);
              stack[stack.Count - 1].Children.Add(wrap);
            }
          }
          continue;
        }
        string tag;
        var node = new DbNode { Tag = tags.TryGetValue(id, out tag) ? tag : ("tag_" + id) };
        stack[stack.Count - 1].Children.Add(node);
        stack.Add(node);
      }
      return root;
    }

    static bool FindTrailer(byte[] buf, out int magicAt, out int tagOff, out int attrOff) {
      magicAt = -1; tagOff = -1; attrOff = -1;
      if (buf == null || buf.Length < 20) return false;
      for (int end = buf.Length; end >= 20; end--) {
        if (BitConverter.ToUInt32(buf, end - 4) != 0xFFFFFFFD) continue;
        if (BitConverter.ToInt32(buf, end - 8) != 8) continue;
        int candidateTag = BitConverter.ToInt32(buf, end - 16);
        int candidateAttr = BitConverter.ToInt32(buf, end - 12);
        if (candidateTag <= 0 || candidateTag >= buf.Length || candidateAttr <= 0 || candidateAttr >= buf.Length) continue;
        magicAt = end; tagOff = candidateTag; attrOff = candidateAttr;
        return true;
      }
      return false;
    }

    static List<KeyValuePair<string, byte[]>> Unpack(byte[] buf) {
      var files = new List<KeyValuePair<string, byte[]>>();
      if (buf.Length < 0x318) return files;
      if (Encoding.ASCII.GetString(buf, 0, 18) != "Resource File V2.2") return files;
      long block = BitConverter.ToInt64(buf, 0x310);
      int guard = 0;
      while (block > 0 && block + 32 <= buf.Length && guard++ < 32) {
        int flags = BitConverter.ToInt32(buf, (int)block);
        long dirStored = BitConverter.ToInt64(buf, (int)block + 8);
        long next = BitConverter.ToInt64(buf, (int)block + 24);
        int dirAt = (int)(block - dirStored);
        if (dirAt < 0) break;
        byte[] dir = SliceBuf(buf, dirAt, (int)dirStored);
        if ((flags & 1) != 0) dir = InflateZlib(dir);
        for (int i = 0; i + 560 <= dir.Length; i += 560) {
          string name = Encoding.Unicode.GetString(dir, i, 520).TrimEnd('\0');
          long off = BitConverter.ToInt64(dir, i + 520);
          long stored = BitConverter.ToInt64(dir, i + 528);
          if (string.IsNullOrEmpty(name) || off < 0 || stored <= 0) continue;
          var payload = SliceBuf(buf, (int)off, (int)stored);
          files.Add(new KeyValuePair<string, byte[]>(name, InflateZlib(payload)));
        }
        block = next > 0 && next < buf.Length ? next : 0;
      }
      return files;
    }

    static byte[] SliceBuf(byte[] b, int off, int n) {
      if (off < 0 || n < 0 || off + n > b.Length) return new byte[0];
      var o = new byte[n];
      Buffer.BlockCopy(b, off, o, 0, n);
      return o;
    }

    static byte[] InflateZlib(byte[] payload) {
      if (payload == null || payload.Length < 4) return payload ?? new byte[0];
      try {
        using (var ms = new MemoryStream(payload, 2, Math.Max(0, payload.Length - 6)))
        using (var ds = new DeflateStream(ms, CompressionMode.Decompress))
        using (var outp = new MemoryStream()) {
          ds.CopyTo(outp);
          return outp.ToArray();
        }
      } catch { return payload; }
    }

    static void Visit(byte[] buf, Action<string, string, byte[]> onLeaf) {
      int magicAt;
      int tagOff;
      int attrOff;
      if (!FindTrailer(buf, out magicAt, out tagOff, out attrOff)) return;
      var tags = ReadDict(buf, tagOff);
      var attrs = ReadDict(buf, attrOff);
      var stack = new List<string>();
      int pos = 0;
      int nodeEnd = tagOff;
      if (nodeEnd > buf.Length) nodeEnd = buf.Length;
      while (pos + 8 <= nodeEnd) {
        int size = BitConverter.ToInt32(buf, pos);
        int id = BitConverter.ToUInt16(buf, pos + 4);
        pos += 8;
        if (id == 0) { if (stack.Count > 0) stack.RemoveAt(stack.Count - 1); continue; }
        if ((id & 0x8000) != 0) {
          byte[] payload = size > 0 ? SliceBuf(buf, pos, Math.Min(size, nodeEnd - pos)) : new byte[0];
          int pad = (8 - (size % 8)) % 8;
          pos += size + pad;
          string attr;
          if (!attrs.TryGetValue(id, out attr) && !attrs.TryGetValue(id & 0x7FFF, out attr))
            attr = id == 0x8000 ? "None" : ("attr_" + id);
          string path = string.Join("/", stack.ToArray());
          onLeaf(path, attr, payload);
          continue;
        }
        string tag;
        stack.Add(tags.TryGetValue(id, out tag) ? tag : ("tag_" + id));
      }
    }

    static Dictionary<int, string> ReadDict(byte[] buf, int offset) {
      var map = new Dictionary<int, string>();
      if (offset < 0 || offset + 4 > buf.Length) return map;
      int count = BitConverter.ToInt32(buf, offset);
      if (count <= 0 || count > 50000) return map;
      var ids = new int[count];
      int pos = offset + 4;
      for (int i = 0; i < count; i++) {
        if (pos + 2 > buf.Length) break;
        ids[i] = BitConverter.ToUInt16(buf, pos);
        pos += 2;
      }
      for (int i = 0; i < count; i++) {
        int z = pos;
        while (z < buf.Length && buf[z] != 0) z++;
        map[ids[i]] = Encoding.UTF8.GetString(buf, pos, Math.Max(0, z - pos));
        pos = z + 1;
      }
      return map;
    }
  }
}
'@
$guidCatalog = $guidJson | ConvertFrom-Json
$guidByNumber = @{}
foreach ($row in @($guidCatalog.rows)) { $guidByNumber[[string]$row.guid] = $row }
Add-Type -TypeDefinition $scanCs
$outJson = Join-Path $anno "harbor-live.json"
# Last scanned money for the coins delta. Public JSON uses economy.treasury; this sidecar is not the schema.
$moneyStatePath = Join-Path $anno "harbor-live.money.json"
$utf8Enc = [System.Text.Encoding]::UTF8
$utf16Enc = [System.Text.Encoding]::Unicode

function Write-HarborLiveCrashSafe([string]$Dest, [string]$Text) {
  $leaf = [System.IO.Path]::GetFileName($Dest)
  if ($leaf -ne "harbor-live.json") { throw "solo harbor-live.json" }
  $dir = [System.IO.Path]::GetDirectoryName($Dest)
  $lastGood = Join-Path $dir "harbor-live.last-good.json"
  $bytes = $utf8.GetBytes($Text)
  foreach ($target in @($Dest, $lastGood)) {
    $tmp = "$target.tmp"
    $fs = New-Object System.IO.FileStream($tmp, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try {
      $fs.Write($bytes, 0, $bytes.Length)
      $fs.Flush($true)
    } finally {
      $fs.Dispose()
    }
    if ([System.IO.File]::Exists($target)) {
      # PS 5.1 marshals $null as "" → File.Replace throws "path is not of a legal form".
      # OneDrive (typical Anno folder) can also reject ReplaceFile. Copy-overwrite is the fallback.
      $backup = "$target.bak"
      try {
        [System.IO.File]::Replace($tmp, $target, $backup)
      } catch {
        [System.IO.File]::Copy($tmp, $target, $true)
        [System.IO.File]::Delete($tmp)
      }
      if ([System.IO.File]::Exists($backup)) {
        try { [System.IO.File]::Delete($backup) } catch { }
      }
    } else {
      [System.IO.File]::Move($tmp, $target)
    }
  }
}

$nativeEndpoint = "http://127.0.0.1:8000/AnnoServer/Population"
$nativeProductionByIsland = @{}
$nativeCountsByIsland = @{}
$nativeCountsObservedAtByIsland = @{}
$nativeWasActive = $false
$nativeLastSuccessAt = $null
$nativeLastSignature = $null
$nativeLastWriteAt = $null
$nativeHeartbeatSeconds = 45
$nativeResidenceGuids = @{
  "1010343" = $true; "1010344" = $true; "1010345" = $true; "1010346" = $true
  "101254" = $true; "101255" = $true
}

function Test-NativeProperty($value, [string]$name) {
  return $value -and ($value.PSObject.Properties.Name -contains $name)
}

# Classifies a failed probe as timeout or connection_refused. Loopback-only endpoint: any other
# network fault (DNS, refused by a firewall, reset, ...) is reported as connection_refused, the
# overwhelming common case when Server.exe simply is not running. Never surfaces the raw .NET
# exception text to harbor-live.json or the UI (docs/native-telemetry.md).
function Get-NativeProbeReason($errorRecord) {
  $ex = $errorRecord.Exception
  while ($ex -and -not ($ex -is [System.Net.WebException])) { $ex = $ex.InnerException }
  if ($ex -and $ex.Status -eq [System.Net.WebExceptionStatus]::Timeout) { return "timeout" }
  return "connection_refused"
}

# connection.nativeProbe carries technical probe facts only (state/reason), separate from
# connection.native, which stays the last VALID OCR observation and is never cleared here just
# because this probe failed - the caller (main loop) is what could overwrite it, and only does so
# when this function itself writes a fresh one on a reachable probe.
function Update-HarborNative {
  if (-not (Test-Path -LiteralPath $outJson)) { return }
  $now = Get-Date
  $observedAt = $now.ToUniversalTime().ToString("o")
  $state = $null
  $reason = $null
  $response = $null
  $captureResult = $null
  try {
    $uri = "$nativeEndpoint`?lang=$NativeLanguage&optimalProductivity=false"
    $http = Invoke-WebRequest -UseBasicParsing -Uri $uri -Method Get -TimeoutSec 8 -ErrorAction Stop
    if ($http.StatusCode -eq 204) {
      $state = "reachable"
      $captureResult = "no_window"
    } else {
      try { $response = $http.Content | ConvertFrom-Json -ErrorAction Stop }
      catch { $state = "invalid_response"; $reason = "bad_payload" }
    }
  } catch {
    $state = "unreachable"
    $reason = Get-NativeProbeReason $_
  }

  $metricProps = @()
  if (-not $state) {
    $metricProps = @($response.PSObject.Properties | Where-Object { $_.Name -match '^\d+$' -and $_.Value })
    if (-not $response.version -and -not $response.islandName) {
      $state = "invalid_response"
      $reason = "bad_payload"
    } else {
      $state = "reachable"
      $captureResult = $(if ($response.islandName -and $metricProps.Count -gt 0) { "observation" } else { "no_observation" })
    }
  }

  $view = "unknown"
  $island = $null
  $production = @()

  if ($captureResult -eq "observation") {
    $hasProductivity = $false
    $hasAmountOrLimit = $false
    $hasCounts = $false
    foreach ($prop in $metricProps) {
      $hasProductivity = $hasProductivity -or (Test-NativeProperty $prop.Value "percentBoost")
      $hasAmountOrLimit = $hasAmountOrLimit -or (Test-NativeProperty $prop.Value "amount") -or (Test-NativeProperty $prop.Value "limit")
      $hasCounts = $hasCounts -or (Test-NativeProperty $prop.Value "existingBuildings")
    }
    if ($hasProductivity -or $hasAmountOrLimit) { $view = "production" }
    elseif ($hasCounts) {
      $factoryCountRows = @($metricProps | Where-Object {
          (Test-NativeProperty $_.Value "existingBuildings") -and -not $nativeResidenceGuids.ContainsKey([string]$_.Name)
        })
      $view = $(if ($factoryCountRows.Count -gt 0) { "finance" } else { "population" })
    }

    $island = [string]$response.islandName
    if ($island -and $view -eq "production") {
      $rows = @()
      foreach ($prop in $metricProps) {
        $guid = [int]$prop.Name
        $value = $prop.Value
        if (-not (Test-NativeProperty $value "percentBoost") -and -not (Test-NativeProperty $value "limit")) { continue }
        $known = $guidByNumber[[string]$guid]
        $metric = [ordered]@{
          guid       = $guid
          name       = $(if ($known -and $known.name) { [string]$known.name } else { "GUID $guid" })
          observedAt = $observedAt
          islandName = $island
        }
        if ($known -and $known.id) { $metric.id = [string]$known.id }
        if (Test-NativeProperty $value "amount") { $metric.amount = [double]$value.amount }
        if (Test-NativeProperty $value "limit") { $metric.requiredTMin = [double]$value.limit }
        if (Test-NativeProperty $value "percentBoost") { $metric.productivity = [double]$value.percentBoost }
        $rows += [pscustomobject]$metric
      }
      if ($rows.Count -gt 0) { $script:nativeProductionByIsland[$island] = @($rows) }
    }
    if ($island -and $hasCounts) {
      $counts = @{}
      foreach ($prop in $metricProps) {
        if (Test-NativeProperty $prop.Value "existingBuildings") {
          $counts[[string]$prop.Name] = [int]$prop.Value.existingBuildings
        }
      }
      if ($counts.Count -gt 0) {
        $script:nativeCountsByIsland[$island] = $counts
        $script:nativeCountsObservedAtByIsland[$island] = $observedAt
      }
    }

    # Finance's buildingCount is merged onto Production's cached rows here, but each keeps its own
    # timestamp: buildingCountObservedAt tracks Finance's sample time independent of the row's
    # observedAt (Production's), so Taller can flag either one going stale on its own.
    if ($island -and $script:nativeProductionByIsland.ContainsKey($island)) {
      $production = @($script:nativeProductionByIsland[$island])
      $counts = $script:nativeCountsByIsland[$island]
      $countsObservedAt = $script:nativeCountsObservedAtByIsland[$island]
      if ($counts) {
        foreach ($row in $production) {
          $count = $counts[[string]$row.guid]
          if ($count -ne $null) {
            $row | Add-Member -NotePropertyName buildingCount -NotePropertyValue ([int]$count) -Force
            if ($countsObservedAt) { $row | Add-Member -NotePropertyName buildingCountObservedAt -NotePropertyValue $countsObservedAt -Force }
          }
        }
      }
    }
  }

  # Rewrite policy (docs/native-telemetry.md): only on a state/observation change, or a 30-60s
  # heartbeat. An identical repeated failure (same state + reason) never rewrites in between.
  $rowsSig = ($production | ForEach-Object { "$($_.guid)=$($_.amount)|$($_.requiredTMin)|$($_.productivity)|$($_.buildingCount)" }) -join ","
  $signature = "$state|$reason|$captureResult|$view|$island|$rowsSig"
  $elapsed = if ($script:nativeLastWriteAt) { ($now - $script:nativeLastWriteAt).TotalSeconds } else { [double]::PositiveInfinity }
  $heartbeatDue = $elapsed -ge $nativeHeartbeatSeconds
  if ($signature -eq $script:nativeLastSignature -and -not $heartbeatDue) { return }

  $payload = Get-Content -LiteralPath $outJson -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $payload.connection) { $payload | Add-Member -NotePropertyName connection -NotePropertyValue ([pscustomobject]@{ mode = "manual" }) }
  if ($state -eq "reachable") { $script:nativeLastSuccessAt = $observedAt }
  $probe = [ordered]@{
    provider    = "ux-enhancer-ocr"
    state       = $state
    lastProbeAt = $observedAt
  }
  if ($script:nativeLastSuccessAt) { $probe.lastSuccessAt = $script:nativeLastSuccessAt }
  if ($reason) { $probe.reason = $reason }
  if ($captureResult) { $probe.result = $captureResult }
  $payload.connection | Add-Member -NotePropertyName nativeProbe -NotePropertyValue ([pscustomobject]$probe) -Force

  if ($captureResult -eq "observation") {
    $native = [ordered]@{
      provider   = "ux-enhancer-ocr"
      view       = $view
      observedAt = $observedAt
    }
    if ($island) { $native.islandName = $island }
    if ($response.version) { $native.serverVersion = [string]$response.version }
    $payload.connection | Add-Member -NotePropertyName native -NotePropertyValue ([pscustomobject]$native) -Force
    if ($production.Count -gt 0) {
      if (-not $payload.telemetry) { $payload | Add-Member -NotePropertyName telemetry -NotePropertyValue ([pscustomobject]@{}) }
      $payload.telemetry | Add-Member -NotePropertyName production -NotePropertyValue $production -Force
    }
  }

  $payload.updatedAt = $observedAt
  $json = $payload | ConvertTo-Json -Depth 10 -Compress
  $null = $json | ConvertFrom-Json
  Write-HarborLiveCrashSafe $outJson ($json + "`n")
  $script:nativeLastSignature = $signature
  $script:nativeLastWriteAt = $now

  if ($state -eq "reachable") {
    if (-not $script:nativeWasActive) {
      Write-Host "$(Get-Date -Format HH:mm:ss) OCR conectado: abrí Estadísticas > Producción y Finanzas en Anno."
    }
    $script:nativeWasActive = $true
  } else {
    if ($script:nativeWasActive) {
      Write-Host "$(Get-Date -Format HH:mm:ss) OCR desconectado; sigo leyendo saves."
    }
    $script:nativeWasActive = $false
  }
}

Write-Host "Harbor Buddy — vigilante del diario, listo para acompañarte"
Write-Host "Ya te encontré la carpeta de Anno: $anno"
Write-Host "Catálogo de títulos: $titlesPath"
Write-Host "Voy a escribir el diario en vivo acá: $outJson"
Write-Host "Dejá esta ventana abierta y jugá tranquilo. Guardá con Ctrl+F5 (o esperá el autoguardado). Ctrl+C para salir cuando quieras."
Write-Host "Si UXEnhancer Server.exe está abierto, también leo Producción y Finanzas por OCR cada 4 segundos."
Write-Host ""

$lastStamp = $null
while ($true) {
  try {
    Update-HarborNative
    $save = Get-NewestSave $anno
    if (-not $save) {
      Start-Sleep -Seconds 4
      continue
    }
    $stamp = "{0}|{1}" -f $save.FullName, $save.LastWriteTimeUtc.Ticks
    if ($stamp -eq $lastStamp) {
      Start-Sleep -Seconds 4
      continue
    }
    $lastStamp = $stamp
    $bytes = [System.IO.File]::ReadAllBytes($save.FullName)
    $scan = [HarborBuddy.A7sScan]::Run($bytes, $guidJson) | ConvertFrom-Json
    $previousPayload = $null
    if (Test-Path -LiteralPath $outJson) {
      try { $previousPayload = Get-Content -LiteralPath $outJson -Raw -Encoding UTF8 | ConvertFrom-Json } catch { }
    }
    $prevMoney = $null
    if (Test-Path -LiteralPath $moneyStatePath) {
      try {
        $moneyState = Get-Content -LiteralPath $moneyStatePath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($moneyState.PSObject.Properties.Name -contains "money") { $prevMoney = [int]$moneyState.money }
      } catch { }
    }

    $sessionName = [string]$scan.sessionName
    if (-not $sessionName) { $sessionName = [System.IO.Path]::GetFileNameWithoutExtension($save.Name) }
    if ($sessionName.Length -gt 200) { $sessionName = $sessionName.Substring(0, 200) }

    $buildings = @()
    foreach ($hit in @($scan.buildings)) {
      if ($hit.id -and $hit.name) { $buildings += [ordered]@{ id = [string]$hit.id; name = [string]$hit.name; count = [int]$hit.count } }
    }
    $storageOwner = "unknown"
    if ($scan.PSObject.Properties.Name -contains "storageOwner") {
      $storageOwner = [string]$scan.storageOwner
    }
    $playerStorage = $storageOwner -eq "player"
    $goods = @()
    if ($playerStorage) {
      foreach ($hit in @($scan.goods)) {
        if ($hit.id -and $hit.name) { $goods += [ordered]@{ id = [string]$hit.id; name = [string]$hit.name; amount = [int]$hit.amount } }
      }
    }
    $islands = @()
    foreach ($hit in @($scan.islands)) {
      if ($hit.id -and $hit.name) { $islands += [ordered]@{ id = [string]$hit.id; name = [string]$hit.name } }
    }
    $routes = @()
    foreach ($route in @($scan.routes)) {
      if (-not $route.name) { continue }
      $stops = @()
      foreach ($stop in @($route.stops)) {
        $routeGoods = @()
        foreach ($good in @($stop.goods)) {
          if ($good.guid) {
            $routeGood = [ordered]@{ guid = [int]$good.guid; amount = [int]$good.amount }
            $knownGood = $guidByNumber[[string]$good.guid]
            if ($knownGood -and $knownGood.id) { $routeGood.id = [string]$knownGood.id }
            if ($good.name) { $routeGood.name = [string]$good.name }
            if ($good.PSObject.Properties.Name -contains "isLoading") {
              $routeGood.isLoading = [bool]$good.isLoading
            }
            $routeGoods += $routeGood
          }
        }
        $routeStop = [ordered]@{ goods = @($routeGoods) }
        if ($stop.areaId -ne $null) { $routeStop.areaId = [int]$stop.areaId }
        $stops += $routeStop
      }
      $routeOut = [ordered]@{
        name      = [string]$route.name
        shipCount = [int]$route.shipCount
        stops     = @($stops)
      }
      if ($route.id -ne $null) { $routeOut.id = [int]$route.id }
      if ($route.ownerId -ne $null) { $routeOut.ownerId = [int]$route.ownerId }
      $ships = @()
      foreach ($ship in @($route.ships)) {
        if ($ship.name) { $ships += [ordered]@{ name = [string]$ship.name } }
      }
      if ($ships.Count -gt 0) { $routeOut.ships = @($ships) }
      if ($route.delivery -and $route.delivery.visitCount) {
        $deliveryGoods = @()
        foreach ($good in @($route.delivery.goods)) {
          if ($good.guid -eq $null) { continue }
          $row = [ordered]@{
            guid            = [int]$good.guid
            visitCount      = [int]$good.visitCount
            medianAbsAmount = [int]$good.medianAbsAmount
            lastAmount      = [int]$good.lastAmount
          }
          $knownGood = $guidByNumber[[string]$good.guid]
          if ($knownGood -and $knownGood.id) { $row.id = [string]$knownGood.id }
          if ($good.name) { $row.name = [string]$good.name }
          elseif ($knownGood -and $knownGood.name) { $row.name = [string]$knownGood.name }
          $deliveryGoods += $row
        }
        $delivery = [ordered]@{
          visitCount         = [int]$route.delivery.visitCount
          lastExecutionTime  = [int64]$route.delivery.lastExecutionTime
          goods              = @($deliveryGoods)
        }
        if ($route.delivery.intervalMsMedian -ne $null) {
          $delivery.intervalMsMedian = [int64]$route.delivery.intervalMsMedian
        }
        $deliveryStations = @()
        foreach ($station in @($route.delivery.stations)) {
          if ($station.guid -eq $null) { continue }
          $stationRow = [ordered]@{
            guid            = [int]$station.guid
            visitCount      = [int]$station.visitCount
            medianAbsAmount = [int]$station.medianAbsAmount
            lastAmount      = [int]$station.lastAmount
          }
          if ($station.areaId -ne $null) { $stationRow.areaId = [int]$station.areaId }
          if ($station.intervalMsMedian -ne $null) {
            $stationRow.intervalMsMedian = [int64]$station.intervalMsMedian
          }
          $knownStation = $guidByNumber[[string]$station.guid]
          if ($knownStation -and $knownStation.id) { $stationRow.id = [string]$knownStation.id }
          if ($station.name) { $stationRow.name = [string]$station.name }
          elseif ($knownStation -and $knownStation.name) { $stationRow.name = [string]$knownStation.name }
          $deliveryStations += $stationRow
        }
        if ($deliveryStations.Count -gt 0) { $delivery.stations = @($deliveryStations) }
        $routeOut.delivery = $delivery
      }
      $routes += $routeOut
    }
    $currentSavedAt = $save.LastWriteTimeUtc.ToString("o")
    $islandSnapshots = @()
    foreach ($row in @($scan.islandSnapshots)) {
      if ($row.regionId -eq $null -or $row.areaId -eq $null -or $row.ownerId -eq $null) { continue }
      $stock = @()
      foreach ($good in @($row.stock)) {
        if ($good.id -and $good.name -and $good.amount -ne $null) {
          $stock += [ordered]@{ id = [string]$good.id; name = [string]$good.name; amount = [int]$good.amount }
        }
      }
      $coverage = [ordered]@{
        identity = [ordered]@{ source = "save"; observedAt = $currentSavedAt; scope = "island" }
      }
      $islandOut = [ordered]@{
        regionId   = [int]$row.regionId
        areaId     = [int]$row.areaId
        ownerId    = [int]$row.ownerId
        name       = $(if ($row.name) { [string]$row.name } else { "area-$([int]$row.areaId)" })
        nameSource = $(if ($row.nameSource) { [string]$row.nameSource } else { "neutral" })
        coverage   = $coverage
      }
      if ($stock.Count -gt 0 -and $stock.Count -le 24) {
        $islandOut.stock = @($stock)
        $coverage.stock = [ordered]@{ source = "save"; observedAt = $currentSavedAt; scope = "island" }
      }
      $buildings = @()
      foreach ($hit in @($row.buildings)) {
        if ($hit.id -and $hit.name) {
          $building = [ordered]@{ id = [string]$hit.id; name = [string]$hit.name }
          if ($hit.count -ne $null -and [int]$hit.count -gt 0) { $building.count = [int]$hit.count }
          $buildings += $building
        }
      }
      if ($buildings.Count -gt 0 -and $buildings.Count -le 40) {
        $islandOut.buildings = @($buildings)
        $coverage.buildings = [ordered]@{ source = "save"; observedAt = $currentSavedAt; scope = "island" }
      }
      $islandSnapshots += $islandOut
    }
    $fleet = @()
    foreach ($ship in @($scan.fleet)) {
      if ($ship.ownerId -ne 0 -and $ship.ownerId -ne $null) { continue }
      if ($ship.ownerId -eq $null) { continue }
      $coverage = [ordered]@{
        identity = [ordered]@{ source = "save"; observedAt = $currentSavedAt; scope = "player" }
      }
      $shipOut = [ordered]@{
        ownerId  = 0
        coverage = $coverage
      }
      if ($ship.name) { $shipOut.name = [string]$ship.name }
      if ($ship.guid -ne $null) {
        $shipOut.guid = [int]$ship.guid
        $coverage.type = [ordered]@{ source = "save"; observedAt = $currentSavedAt }
        if ($ship.id) { $shipOut.id = [string]$ship.id }
        if ($ship.typeName) { $shipOut.typeName = [string]$ship.typeName }
        if ($ship.kind) { $shipOut.kind = [string]$ship.kind }
      }
      if ($ship.metaId -ne $null) { $shipOut.metaId = [int]$ship.metaId }
      if ($ship.assignment -and $ship.assignment.kind -eq "trade-route") {
        $assignment = [ordered]@{ kind = "trade-route" }
        if ($ship.assignment.routeId -ne $null) { $assignment.routeId = [int]$ship.assignment.routeId }
        if ($ship.assignment.routeName) { $assignment.routeName = [string]$ship.assignment.routeName }
        $shipOut.assignment = $assignment
        $coverage.assignment = [ordered]@{ source = "save"; observedAt = $currentSavedAt }
      }
      elseif ($ship.routeId -ne $null) {
        $assignment = [ordered]@{ kind = "trade-route"; routeId = [int]$ship.routeId }
        if ($ship.routeName) { $assignment.routeName = [string]$ship.routeName }
        $shipOut.assignment = $assignment
        $coverage.assignment = [ordered]@{ source = "save"; observedAt = $currentSavedAt }
      }
      if ($ship.location -or $ship.regionId -ne $null -or $ship.areaId -ne $null) {
        $location = [ordered]@{}
        $regionId = if ($ship.location -and $ship.location.regionId -ne $null) { $ship.location.regionId } else { $ship.regionId }
        $areaId = if ($ship.location -and $ship.location.areaId -ne $null) { $ship.location.areaId } else { $ship.areaId }
        if ($regionId -ne $null) { $location.regionId = [int]$regionId }
        if ($areaId -ne $null) { $location.areaId = [int]$areaId }
        if ($location.Count -gt 0) {
          $shipOut.location = $location
          $coverage.location = [ordered]@{ source = "save"; observedAt = $currentSavedAt; scope = "area" }
        }
      }
      $fleet += $shipOut
    }
    $goodsChanges = @()
    $previousSavedAt = $null
    if ($previousPayload -and [string]$previousPayload.savedAt) {
      try { $previousSavedAt = [datetime]$previousPayload.savedAt } catch { $previousSavedAt = $null }
    }
    $currentSavedStamp = $null
    try { $currentSavedStamp = [datetime]$currentSavedAt } catch { $currentSavedStamp = $null }
    $notRollback = $true
    if ($previousSavedAt -and $currentSavedStamp -and $currentSavedStamp -lt $previousSavedAt) { $notRollback = $false }
    if (
      $notRollback -and
      $previousPayload -and
      [string]$previousPayload.sessionName -eq $sessionName -and
      [string]$previousPayload.savedAt -and
      [string]$previousPayload.savedAt -ne $currentSavedAt -and
      $previousPayload.telemetry -and
      $previousPayload.telemetry.goods
    ) {
      $previousGoodsById = @{}
      foreach ($previousGood in @($previousPayload.telemetry.goods)) {
        if ($previousGood.id) { $previousGoodsById[[string]$previousGood.id] = $previousGood }
      }
      foreach ($good in $goods) {
        $previousGood = $previousGoodsById[[string]$good.id]
        if (-not $previousGood) { continue }
        $delta = [int]$good.amount - [int]$previousGood.amount
        if ($delta -eq 0) { continue }
        $goodsChanges += [ordered]@{
          id              = [string]$good.id
          name            = [string]$good.name
          previousAmount  = [int]$previousGood.amount
          amount          = [int]$good.amount
          delta           = $delta
          previousSavedAt = [string]$previousPayload.savedAt
        }
      }
    }
    $chainMap = @{
      lumberjack = "wood"; sawmill = "wood"; fishery = "fish"; sheep = "clothes"; knitters = "clothes"
      potato = "schnapps"; distillery = "schnapps"; sausage = "workers"; bread = "workers"; charcoal = "steel"
    }
    $chainLabel = @{ wood = "Wood"; fish = "Fish"; clothes = "Clothes"; schnapps = "Schnapps"; workers = "Worker food"; steel = "Steel" }
    $chains = @(); $seenChain = @{}
    foreach ($hit in $buildings) {
      $cid = $chainMap[$hit.id]
      if ($cid -and -not $seenChain[$cid]) {
        $seenChain[$cid] = $true
        $chains += [ordered]@{ id = $cid; name = [string]$chainLabel[$cid] }
      }
    }
    $hints = @()
    $workforce = [ordered]@{}
    if ($scan.farmers) { $workforce.farmers = $true; $hints += "farmers" }
    if ($scan.workers) { $workforce.workers = $true; $hints += "workers" }
    if ($scan.artisans) { $workforce.artisans = $true; $hints += "artisans" }
    if ($scan.engineers) { $workforce.engineers = $true; $hints += "engineers" }

    $coins = "unknown"
    if ($playerStorage -and ($scan.PSObject.Properties.Name -contains "money")) {
      $money = [int]$scan.money
      if ($money -lt 0) { $coins = "down" }
      elseif ($prevMoney -ne $null -and $money -ne $prevMoney) {
        $coins = if ($money -ge $prevMoney) { "up" } else { "down" }
      }
      try {
        $moneyJson = ([ordered]@{ money = $money } | ConvertTo-Json -Compress)
        [System.IO.File]::WriteAllText($moneyStatePath, $moneyJson, $utf8)
      } catch { }
    }
    $houses = Get-HousesPulse $scan $buildings $goods
    $pulseHint = [ordered]@{ coins = $coins; houses = $houses }

    $telemetry = [ordered]@{
      buildings = @($buildings)
      people    = @()
      chains    = @($chains)
      islands   = @($islands)
      hints     = @($hints)
      routes    = @($routes)
    }
    if ($goods.Count -gt 0) { $telemetry.goods = @($goods) }
    if ($goodsChanges.Count -gt 0) { $telemetry.goodsChanges = @($goodsChanges) }
    if ($fleet.Count -gt 0) { $telemetry.fleet = @($fleet) }

    $payload = [ordered]@{
      schema      = "harbor-live-v1"
      source      = "save"
      updatedAt   = (Get-Date).ToUniversalTime().ToString("o")
      savedAt     = $currentSavedAt
      game        = "anno-1800"
      sessionName = $sessionName
      connection  = [ordered]@{
        mode          = $(if ($save.Extension -eq ".save") { "ubisoft-cloud" } else { "documents-save" })
        fileName      = $save.Name
        buildingKinds = @($buildings).Count
        buildingTotal = [int](@($buildings) | Measure-Object -Property count -Sum).Sum
        goodsKinds    = @($goods).Count
        routeCount    = @($routes).Count
        islandCount   = @($islands).Count
        questCount    = 0
      }
    }
    $islandName = $null
    if ($islands.Count -gt 0) { $islandName = [string]$islands[0].name }
    if ($islandName) { $payload.islandName = $islandName }
    if ($scan.PSObject.Properties.Name -contains "simTime" -and $scan.simTime -ne $null) {
      $payload.simTime = [int64]$scan.simTime
    }
    if ($scan.PSObject.Properties.Name -contains "snapshotId" -and $scan.snapshotId) {
      $payload.snapshotId = [string]$scan.snapshotId
    }
    if ($scan.PSObject.Properties.Name -contains "playerId" -and $scan.playerId -ne $null) {
      $payload.playerId = [int]$scan.playerId
    }
    if ($islandSnapshots.Count -gt 0) { $payload.islandSnapshots = @($islandSnapshots) }
    if ($playerStorage -and ($scan.PSObject.Properties.Name -contains "money")) {
      $payload.economy = [ordered]@{
        treasury = [int]$scan.money
        coverage = [ordered]@{
          treasury = [ordered]@{ source = "save"; observedAt = $currentSavedAt; scope = "player" }
        }
      }
    }
    # Session/region name, not the player's colony. GUID presence is not an active quest.
    $payload.quests = @()
    $payload.reader = Get-HarborReaderFromScan $scan
    if ($workforce.Count -gt 0) { $payload.workforce = $workforce }
    $payload.pulseHint = $pulseHint
    # Preserve OCR evidence across a save-triggered rewrite: connection.native and
    # telemetry.production are OCR-owned (Update-HarborNative refreshes them on its own cadence),
    # so a fresh save write must carry them forward instead of dropping them mid-session.
    if ($previousPayload -and $previousPayload.telemetry -and $previousPayload.telemetry.production) {
      $telemetry.production = $previousPayload.telemetry.production
    }
    if ($previousPayload -and $previousPayload.connection) {
      if ($previousPayload.connection.native) { $payload.connection.native = $previousPayload.connection.native }
      if ($previousPayload.connection.nativeProbe) { $payload.connection.nativeProbe = $previousPayload.connection.nativeProbe }
    }
    $payload.telemetry = $telemetry
    $payload.coverage = Get-HarborCoverage $payload
    $json = ($payload | ConvertTo-Json -Depth 10 -Compress)
    $null = $json | ConvertFrom-Json
    Write-HarborLiveCrashSafe $outJson ($json + "`n")
    $bCount = @($telemetry.buildings).Count
    $gCount = @($goods).Count
    $coinsLabel = Get-CoinsLabel $coins
    $housesLabel = Get-HousesLabel $houses
    Write-Host "$(Get-Date -Format HH:mm:ss) $($save.Name) -> $bCount tipos de edificio / $gCount bienes / $(@($routes).Count) rutas | Monedas: $coinsLabel | Casas: $housesLabel"
    $namesLine = Get-BuildingsLogLine $buildings $catalog 10
    if ($namesLine) { Write-Host "  Edificios: $namesLine" }
    $goodsLine = Get-GoodsLogLine $goods 6
    if ($goodsLine) { Write-Host "  Bienes: $goodsLine" }
    Update-HarborNative
  } catch {
    Write-Host "$(Get-Date -Format HH:mm:ss) error: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 4
}
