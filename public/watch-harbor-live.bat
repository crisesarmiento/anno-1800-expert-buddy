@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo Harbor Buddy vigilante 0.4.2 - un solo archivo
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
$outJson = Join-Path $anno "harbor-live.json"
$utf8Enc = [System.Text.Encoding]::UTF8
$utf16Enc = [System.Text.Encoding]::Unicode

Write-Host "Harbor Buddy vigilante"
Write-Host "Anno: $anno"
Write-Host "Catalogo: $titlesPath"
Write-Host "Salida: $outJson"
Write-Host "Juga, guarda con F5. Ctrl+C para salir."
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
      Write-Host "$(Get-Date -Format HH:mm:ss) demasiados titulos ($($found.Count)) - usa el buscador."
    }

    $hintHits = @()
    if ($catalog.hints) {
      foreach ($hint in $catalog.hints) {
        if (Test-Blob $blob @($hint.needles)) { $hintHits += [string]$hint.id }
      }
    }

    $telemetry = [ordered]@{
      buildings = @(Collect-Hits $catalog.buildings $blob $false)
      people    = @(Collect-Hits $catalog.people $blob $false)
      chains    = @(Collect-Hits $catalog.chains $blob $true)
      islands   = @(Collect-Hits $catalog.islands $blob $false)
      hints     = @($hintHits)
    }

    # Campos seguros: filesystem + needles. Sin conteos, stock ni inject.
    $sessionName = [System.IO.Path]::GetFileNameWithoutExtension($save.Name)
    if ($sessionName.Length -gt 200) { $sessionName = $sessionName.Substring(0, 200) }
    $islandName = $null
    $islandHits = @($telemetry.islands)
    if ($islandHits.Count -gt 0 -and $islandHits[0].name) {
      $islandName = [string]$islandHits[0].name
    }
    $workforce = [ordered]@{}
    foreach ($tier in @("farmers", "workers", "artisans", "engineers")) {
      if ($hintHits -contains $tier) { $workforce[$tier] = $true }
    }

    $payload = [ordered]@{
      schema      = "harbor-live-v1"
      source      = "save"
      updatedAt   = (Get-Date).ToUniversalTime().ToString("o")
      savedAt     = $save.LastWriteTimeUtc.ToString("o")
      game        = "anno-1800"
      sessionName = $sessionName
    }
    if ($islandName) { $payload.islandName = $islandName }
    $payload.quests = @($quests)
    if ($workforce.Count -gt 0) { $payload.workforce = $workforce }
    $payload.telemetry = $telemetry
    $json = ($payload | ConvertTo-Json -Depth 8 -Compress)
    [System.IO.File]::WriteAllText($outJson, $json + "`n", $utf8)
    $bCount = @($telemetry.buildings).Count
    $lastQuest = ""
    if ($quests.Count -gt 0) { $lastQuest = [string]$quests[$quests.Count - 1].title }
    if (-not $lastQuest) { $lastQuest = "(vacio - F5 o buscador)" }
    Write-Host "$(Get-Date -Format HH:mm:ss) $($save.Name) -> $lastQuest / $bCount edificios"
  } catch {
    Write-Host "$(Get-Date -Format HH:mm:ss) error: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 8
}
