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
$titlesPath = Find-Catalog
$catalog = Get-Content -LiteralPath $titlesPath -Raw -Encoding UTF8 | ConvertFrom-Json
$guidJson = Get-Content -LiteralPath (Join-Path $PSScriptRoot "harbor-guids.json") -Raw -Encoding UTF8
$scanCs = Get-Content -LiteralPath (Join-Path $PSScriptRoot "a7s-scan.cs") -Raw -Encoding UTF8
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
