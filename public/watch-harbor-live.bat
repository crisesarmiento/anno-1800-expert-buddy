@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo Harbor Buddy vigilante 0.5.0 - un solo archivo
if exist "watch-harbor-live.ps1" (
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
      }
      var sb = new StringBuilder();
      sb.Append("{\"sessionName\":\"").Append(Esc(session)).Append("\"");
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
            sb.Append("}");
          }
          sb.Append("]}");
        }
        sb.Append("]}");
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
        if (island.Stock.Count > 0) {
          sb.Append(",\"stock\":[");
          bool firstStock = true;
          int stockCount = 0;
          foreach (var good in island.Stock) {
            if (stockCount >= 24) break;
            stockCount++;
            if (!firstStock) sb.Append(",");
            firstStock = false;
            sb.Append("{\"id\":\"").Append(Esc(good.Id)).Append("\",\"name\":\"").Append(Esc(good.Name)).Append("\",\"amount\":").Append(good.Amount).Append("}");
          }
          sb.Append("]");
        }
        sb.Append(",\"coverage\":{\"identity\":{\"source\":\"save\"}");
        if (island.Stock.Count > 0) sb.Append(",\"stock\":{\"source\":\"save\"}");
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
    sealed class RouteGood { public int Guid; public int Amount; public string Name; }
    sealed class RouteStop {
      public int? AreaId;
      public readonly List<RouteGood> Goods = new List<RouteGood>();
    }
    sealed class RouteRow {
      public int? Id;
      public string Name;
      public int? OwnerId;
      public int ShipCount;
      public readonly List<RouteStop> Stops = new List<RouteStop>();
    }
    sealed class IslandStock { public string Id; public string Name; public int Amount; }
    sealed class IslandRow {
      public int RegionId;
      public int AreaId;
      public int OwnerId;
      public string Name;
      public string NameSource;
      public readonly List<IslandStock> Stock = new List<IslandStock>();
    }
    sealed class IslandExtract {
      public readonly List<IslandRow> Islands = new List<IslandRow>();
      public int? SimTime;
      public string SnapshotId;
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
                stop.Goods.Add(new RouteGood {
                  Guid = guid.Value,
                  Amount = amount.Value,
                  Name = guids.TryGetValue(guid.Value, out guidRow) ? guidRow.name : ""
                });
              }
            }
            row.Stops.Add(stop);
          }
        }
        output.Add(row);
      }
      return output;
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

    static List<IslandStock> StockFromManager(DbNode manager, Dictionary<int, GuidRow> guids) {
      var output = new List<IslandStock>();
      var storage = FindDescendant(manager, "AreaStorageManager");
      if (storage == null) return output;
      CollectStrg(storage, guids, output);
      return output;
    }

    static void CollectStrg(DbNode node, Dictionary<int, GuidRow> guids, List<IslandStock> output) {
      foreach (var leaf in node.Leaves) {
        if (leaf.Attr != "StrgLrg" || leaf.Bytes == null) continue;
        var byId = new Dictionary<string, IslandStock>();
        for (int i = 0; i + 8 <= leaf.Bytes.Length; i += 8) {
          int g = BitConverter.ToInt32(leaf.Bytes, i);
          int amt = BitConverter.ToInt32(leaf.Bytes, i + 4);
          GuidRow row;
          if (!guids.TryGetValue(g, out row) || row.kind != "good") continue;
          byId[row.id] = new IslandStock { Id = row.id, Name = row.name, Amount = amt };
        }
        foreach (var item in byId.Values) output.Add(item);
      }
      foreach (var child in node.Children) CollectStrg(child, guids, output);
    }

    static IslandExtract ExtractIslands(byte[] data, Dictionary<int, GuidRow> guids) {
      var output = new IslandExtract();
      var root = ParseTree(data);
      if (root == null) return output;
      var meta = Child(root, "MetaGameManager") ?? root;
      output.SimTime = FindLeafInt(meta, "GameTime", 6) ?? FindLeafInt(meta, "SimulationTime", 6) ?? FindLeafInt(meta, "SessionTime", 6);
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
        if (!output.SimTime.HasValue) output.SimTime = LeafInt(manager, "GameTime");
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
          }
          output.Islands.Add(row);
        }
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
# Internal only: last scanned money, for the coins delta. Never read by the browser/UI, never part of the harbor-live-v1 schema.
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
      if ($stock.Count -gt 0) {
        $islandOut.stock = @($stock)
        $coverage.stock = [ordered]@{ source = "save"; observedAt = $currentSavedAt; scope = "island" }
      }
      $islandSnapshots += $islandOut
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
    # Session/region name, not the player's colony. GUID presence is not an active quest.
    $payload.quests = @()
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
