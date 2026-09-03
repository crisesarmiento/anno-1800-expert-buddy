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
# No inyecta Anno. Lee el ultimo .a7s, busca titulos, escribe harbor-live.json.
# Deja esta ventana abierta. Guarda con F5 (o espera el autoguardado).

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
  Write-Host "No encuentro Documentos\Anno 1800 ni un .a7s reciente."
  $typed = Read-Host "Pegá la carpeta Anno 1800 (Enter para salir)"
  if (-not $typed) { throw "Cancelado." }
  $typed = $typed.Trim()
  if (-not (Test-Path -LiteralPath $typed)) { throw "Esa carpeta no existe." }
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
  throw "Solo sigo una carpeta Anno 1800 (o una que tenga accounts\*.a7s)."
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
      Write-Host "Carpeta Anno 1800: $path (todavía no hay .a7s)"
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
  Write-Host "Falta harbor-catalog.json. Lo bajo..."
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dest
  if (-not (Test-Path -LiteralPath $dest)) {
    throw "Falta harbor-catalog.json. Descargalo de Harbor Buddy junto a este script."
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
  return Find-LatestA7sUnder (Join-Path $anno "accounts")
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
        "Ditch Water"
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
      var guids = ParseGuids(guidJson);
      var files = Unpack(buf);
      var buildings = new Dictionary<string, string>();
      var goods = new Dictionary<string, int>();
      var islands = new Dictionary<string, string>();
      int? money = null;
      int? pending = null;
      var farmers = false; var workers = false; var artisans = false; var engineers = false;
      string session = "";
      byte[] data = null;
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
          if (path.EndsWith("CountsPerGUID") && v.HasValue) {
            if (pending == null) pending = v;
            else {
              GuidRow row;
              if (guids.TryGetValue(pending.Value, out row) && row.kind == "building" && v.Value > 0) {
                buildings[row.id] = row.name;
                if (row.id == "farmer-house") farmers = true;
                if (row.id == "worker-house") workers = true;
                if (row.id == "artisan-house") artisans = true;
                if (row.id == "engineer-house") engineers = true;
              }
              pending = null;
            }
          }
          if (attr == "StrgLrg" && payload != null && payload.Length >= 8) {
            for (int i = 0; i + 8 <= payload.Length; i += 8) {
              int g = BitConverter.ToInt32(payload, i);
              int amt = BitConverter.ToInt32(payload, i + 4);
              if (g == 1010017) {
                if (money == null || amt > money.Value) money = amt;
                continue;
              }
              GuidRow row;
              if (guids.TryGetValue(g, out row) && row.kind == "good") goods[row.id] = amt;
            }
          }
          if ((attr == "CurrentlyActiveSession" || attr == "LastActiveSession" || attr == "StartSessionGUID") && v.HasValue) {
            GuidRow row;
            if (guids.TryGetValue(v.Value, out row) && row.kind == "island") islands[row.id] = row.name;
          }
        });
      }
      var sb = new StringBuilder();
      sb.Append("{\"sessionName\":\"").Append(Esc(session)).Append("\"");
      if (money.HasValue) sb.Append(",\"money\":").Append(money.Value);
      sb.Append(",\"farmers\":").Append(farmers ? "true" : "false");
      sb.Append(",\"workers\":").Append(workers ? "true" : "false");
      sb.Append(",\"artisans\":").Append(artisans ? "true" : "false");
      sb.Append(",\"engineers\":").Append(engineers ? "true" : "false");
      sb.Append(",\"buildings\":[");
      bool first = true;
      foreach (var kv in buildings) {
        if (!first) sb.Append(",");
        first = false;
        sb.Append("{\"id\":\"").Append(Esc(kv.Key)).Append("\",\"name\":\"").Append(Esc(kv.Value)).Append("\"}");
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
      sb.Append("]}");
      return sb.ToString();
    }

    struct GuidRow { public string id; public string kind; public string name; }

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
      if (buf == null || buf.Length < 20) return;
      int magicAt = -1;
      for (int end = buf.Length; end >= 20; end--) {
        if (BitConverter.ToUInt32(buf, end - 4) != 0xFFFFFFFD) continue;
        if (BitConverter.ToInt32(buf, end - 8) != 8) continue;
        magicAt = end;
        break;
      }
      if (magicAt < 0) return;
      int tagOff = BitConverter.ToInt32(buf, magicAt - 16);
      int attrOff = BitConverter.ToInt32(buf, magicAt - 12);
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
Add-Type -TypeDefinition $scanCs -ReferencedAssemblies @("System.IO.Compression")
$outJson = Join-Path $anno "harbor-live.json"
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

Write-Host "Harbor Buddy vigilante"
Write-Host "Anno: $anno"
Write-Host "Catalogo: $titlesPath"
Write-Host "Salida: $outJson"
Write-Host "Juga, guarda con Ctrl+F5 (o espera el autoguardado). Ctrl+C para salir."
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
    $scan = [HarborBuddy.A7sScan]::Run($bytes, $guidJson) | ConvertFrom-Json
    $prevMoney = $null
    if (Test-Path -LiteralPath $outJson) {
      try {
        $prev = Get-Content -LiteralPath $outJson -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($prev.pulseHint -and $prev.telemetry -and $prev.telemetry.goods) { }
        if ($prev.PSObject.Properties.Name -contains "money") { $prevMoney = [int]$prev.money }
      } catch { }
    }

    $sessionName = [string]$scan.sessionName
    if (-not $sessionName) { $sessionName = [System.IO.Path]::GetFileNameWithoutExtension($save.Name) }
    if ($sessionName.Length -gt 200) { $sessionName = $sessionName.Substring(0, 200) }

    $buildings = @()
    foreach ($hit in @($scan.buildings)) {
      if ($hit.id -and $hit.name) { $buildings += [ordered]@{ id = [string]$hit.id; name = [string]$hit.name } }
    }
    $goods = @()
    foreach ($hit in @($scan.goods)) {
      if ($hit.id -and $hit.name) { $goods += [ordered]@{ id = [string]$hit.id; name = [string]$hit.name; amount = [int]$hit.amount } }
    }
    $islands = @()
    foreach ($hit in @($scan.islands)) {
      if ($hit.id -and $hit.name) { $islands += [ordered]@{ id = [string]$hit.id; name = [string]$hit.name } }
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
    if ($scan.PSObject.Properties.Name -contains "money") {
      $money = [int]$scan.money
      if ($money -lt 0) { $coins = "down" }
      elseif ($prevMoney -ne $null -and $money -ne $prevMoney) {
        $coins = if ($money -ge $prevMoney) { "up" } else { "down" }
      }
    }
    $pulseHint = [ordered]@{ coins = $coins; houses = "unknown" }

    $telemetry = [ordered]@{
      buildings = @($buildings)
      people    = @()
      chains    = @($chains)
      islands   = @($islands)
      hints     = @($hints)
    }
    if ($goods.Count -gt 0) { $telemetry.goods = @($goods) }

    $payload = [ordered]@{
      schema      = "harbor-live-v1"
      source      = "save"
      updatedAt   = (Get-Date).ToUniversalTime().ToString("o")
      savedAt     = $save.LastWriteTimeUtc.ToString("o")
      game        = "anno-1800"
      sessionName = $sessionName
    }
    $islandName = $null
    if ($islands.Count -gt 0) { $islandName = [string]$islands[0].name }
    if ($islandName) { $payload.islandName = $islandName }
    $payload.quests = @()
    if ($workforce.Count -gt 0) { $payload.workforce = $workforce }
    $payload.pulseHint = $pulseHint
    $payload.telemetry = $telemetry
    $json = ($payload | ConvertTo-Json -Depth 8 -Compress)
    $null = $json | ConvertFrom-Json
    Write-HarborLiveCrashSafe $outJson ($json + "`n")
    $bCount = @($telemetry.buildings).Count
    $gCount = @($goods).Count
    Write-Host "$(Get-Date -Format HH:mm:ss) $($save.Name) -> $bCount edificios / $gCount bienes"
  } catch {
    Write-Host "$(Get-Date -Format HH:mm:ss) error: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 8
}
