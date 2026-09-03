#!/usr/bin/env node
import { mkdirSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32 } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "mod", "harbor-buddy-telemetry");
const outDir = join(root, "public");
const out = join(outDir, "harbor-buddy-telemetry.zip");

if (!existsSync(src)) {
  console.error("[pack-mod] missing", src);
  process.exit(1);
}

// Ceiling: dump_live.lua stays in tools/. Never pack Lua or a scripts/ dir.
// See docs/telemetry-ceiling.md. Regression: scripts/telemetry-ceiling.test.mjs.

const infoPath = join(src, "modinfo.json");
const info = JSON.parse(readFileSync(infoPath, "utf8"));
if (!info.ModID || !info.Version || typeof info.ModName !== "object" || typeof info.Category !== "object") {
  console.error("[pack-mod] modinfo.json must use localized objects for Category and ModName (Anno 1800 crashes on a string Category).");
  process.exit(1);
}
if (typeof info.Category.English !== "string") {
  console.error("[pack-mod] Category.English is required");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    if (name.endsWith(".lua")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "scripts") continue;
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function zipFolder(folder, dest, prefix) {
  const files = walk(folder).sort();
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const data = readFileSync(file);
    const name = `${prefix}/${relative(folder, file).replaceAll("\\", "/")}`;
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data) >>> 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const localFull = Buffer.concat([local, nameBuf, data]);
    locals.push(localFull);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, nameBuf]));
    offset += localFull.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  writeFileSync(dest, Buffer.concat([...locals, centralBuf, eocd]));
}

zipFolder(src, out, "harbor-buddy-telemetry");
{
  const packed = readFileSync(out);
  if (packed.includes("dump_live.lua") || packed.includes(".lua")) {
    console.error("[pack-mod] refuse: lua leaked into", out);
    process.exit(1);
  }
}
console.log("[pack-mod]", info.Version, out);

const SKIP = new Set(
  "mercado casas granjeros madera lenador aserradero ruinas escombros hannah almacen warehouse ditch visita isla fertilidad papa schnapps taberna pub destileria edvard cajas granja ovejas telares ropa atractivo pariente periodico prensa deuda esperar obreros workers school sausage bread soap cenizas lacayo chivos curiosity imprenta foto pedido hierro yacimiento montanas experto prision eli fianza acero mina carbonera fundicion aceria steel guerra armas contrabandista expedicion rebeldes jornaleros rescate bastion calor vigilancia lobos alpaca soltar defensa ataque refugiados evacuacion incendio pista confrontacion acusacion batalla llama ingenieros engineers prologue dynamite fish faro cardumen".split(
    " ",
  ),
);

function foldKey(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function englishLead(extra) {
  const words = extra.split(/\s+/);
  const lead = [];
  for (const word of words) {
    const folded = foldKey(word);
    if (!/^[a-z']+$/i.test(word)) break;
    if (SKIP.has(folded) || /^\d+$/.test(word)) break;
    lead.push(word);
    if (lead.length >= 8) break;
  }
  return lead.length >= 2 ? lead.join(" ") : "";
}

function packTitles() {
  const campaign = readFileSync(join(root, "src/lib/data/campaign.ts"), "utf8");
  const findSrc = readFileSync(join(root, "src/lib/data/find.ts"), "utf8");
  const extra = {};
  for (const match of findSrc.matchAll(/"([^"]+)":\s*"([^"]+)"/g)) {
    extra[match[1]] = match[2];
  }
  const part = campaign.split("export const missions")[1] ?? "";
  const missions = [];
  for (const match of part.matchAll(/id:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"/g)) {
    const id = match[1];
    const title = match[2];
    const titles = [title];
    const lead = extra[id] ? englishLead(extra[id]) : "";
    if (lead && foldKey(lead) !== foldKey(title)) titles.push(lead.replace(/\b\w/g, (ch) => ch.toUpperCase()));
    missions.push({ id, titles });
  }
  const payload = { schema: "harbor-titles-v1", missions };
  const dest = join(outDir, "harbor-titles.json");
  writeFileSync(dest, `${JSON.stringify(payload, null, 2)}\n`);
  console.log("[pack-mod] titles", missions.length, dest);
  return missions;
}

const EN_BUILDING = {
  lumberjack: "Lumberjack's Hut",
  sawmill: "Sawmill",
  marketplace: "Marketplace",
  "farmer-house": "Farmer Residence",
  fishery: "Fishery",
  sheep: "Sheep Farm",
  knitters: "Knitter's Hut",
  potato: "Potato Farm",
  distillery: "Schnapps Distillery",
  pub: "Pub",
  warehouse: "Warehouse",
  fire: "Fire Station",
  chapel: "Chapel",
  school: "School",
  pig: "Pig Farm",
  sausage: "Slaughterhouse",
  wheat: "Grain Farm",
  mill: "Mill",
  bakery: "Bakery",
  iron: "Iron Mine",
  coal: "Charcoal Kiln",
  furnace: "Furnace",
  steelworks: "Steelworks",
  sailmaker: "Sailmaker",
};

function namedFromTs(file, kind) {
  const src = readFileSync(file, "utf8");
  const items = [];
  for (const match of src.matchAll(/id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"/g)) {
    items.push({ id: match[1], names: [match[2]] });
  }
  if (kind === "building") {
    for (const item of items) {
      const extra = EN_BUILDING[item.id];
      if (extra && !item.names.includes(extra)) item.names.push(extra);
    }
  }
  return items;
}

function packCatalog(missions) {
  const buildings = namedFromTs(join(root, "src/lib/data/buildings.ts"), "building");
  const people = namedFromTs(join(root, "src/lib/data/harbor-life.ts"), "people");
  const chainSrc = readFileSync(join(root, "src/lib/data/chains.ts"), "utf8");
  const chains = [];
  for (const match of chainSrc.matchAll(/id:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"[\s\S]*?steps:\s*\[([\s\S]*?)\]/g)) {
    const needles = [...match[3].matchAll(/label:\s*"([^"]+)"/g)].map((item) => item[1]);
    chains.push({ id: match[1], names: [match[2]], needles });
  }
  const catalog = {
    schema: "harbor-catalog-v1",
    missions,
    buildings,
    people,
    chains,
    islands: [
      { id: "bright-sands", names: ["Bright Sands"] },
      { id: "ditchwater", names: ["Ditchwater", "Ditch Water"] },
      { id: "crown-falls", names: ["Crown Falls"] },
      { id: "la-isla", names: ["La Isla"] },
      { id: "cape", names: ["Cape Trelawney"] },
      { id: "old-world", names: ["Old World", "Viejo Mundo"] },
      { id: "new-world", names: ["New World", "Nuevo Mundo"] },
    ],
    hints: [
      { id: "farmers", needles: ["granjeros", "farmers"] },
      { id: "workers", needles: ["obreros", "workers"] },
      { id: "artisans", needles: ["artesanos", "artisans"] },
      { id: "engineers", needles: ["ingenieros", "engineers"] },
      { id: "schnapps", needles: ["Schnapps"] },
      { id: "steel", needles: ["acero", "steel"] },
      { id: "war", needles: ["guerra", "war", "Krieg"] },
      { id: "taxes", needles: ["impuestos", "taxes", "Steuern"] },
    ],
  };
  const dest = join(outDir, "harbor-catalog.json");
  writeFileSync(dest, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log("[pack-mod] catalog", dest);
}

const packedMissions = packTitles();
packCatalog(packedMissions);

function stampBom(name) {
  const dest = join(outDir, name);
  let text = readFileSync(dest, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  writeFileSync(dest, `\uFEFF${text.replace(/\r?\n/g, "\r\n")}`);
}

stampBom("watch-harbor-live.ps1");
stampBom("install-harbor-buddy.ps1");
console.log("[pack-mod] utf8-bom scripts");

function packWatcherBundle() {
  let ps = readFileSync(join(outDir, "watch-harbor-live.ps1"), "utf8");
  if (ps.charCodeAt(0) === 0xfeff) ps = ps.slice(1);
  ps = ps.replace(/\r\n/g, "\n");
  const catalog = readFileSync(join(outDir, "harbor-catalog.json"), "utf8").trim();
  const guids = readFileSync(join(outDir, "harbor-guids.json"), "utf8").trim();
  const scanCs = readFileSync(join(root, "src/lib/live/a7s-scan.cs"), "utf8").replace(/\r\n/g, "\n").trim();
  writeFileSync(join(outDir, "a7s-scan.cs"), `${scanCs}\n`);
  const needle = "$titlesPath = Find-Catalog\n$catalog = Get-Content -LiteralPath $titlesPath -Raw -Encoding UTF8 | ConvertFrom-Json";
  const guidNeedle =
    "$guidJson = Get-Content -LiteralPath (Join-Path $PSScriptRoot \"harbor-guids.json\") -Raw -Encoding UTF8\n$scanCs = Get-Content -LiteralPath (Join-Path $PSScriptRoot \"a7s-scan.cs\") -Raw -Encoding UTF8";
  if (!ps.includes(needle) || !ps.includes(guidNeedle)) {
    console.error("[pack-mod] watcher bundle: catalog or guid load block not found");
    process.exit(1);
  }
  const injected = ps
    .replace(needle, `$titlesPath = "embedded"\n$catalog = @'\n${catalog}\n'@ | ConvertFrom-Json`)
    .replace(
      guidNeedle,
      `$guidJson = @'\n${guids}\n'@\n$scanCs = @'\n${scanCs}\n'@`,
    );
  const header = [
    "@echo off",
    "setlocal EnableExtensions",
    "cd /d \"%~dp0\"",
    "echo Harbor Buddy vigilante 0.5.0 - un solo archivo",
    "if exist \"watch-harbor-live.ps1\" (",
    "  echo Encontre un .ps1 viejo en esta carpeta. Lo renombro a .old para no usarlo.",
    "  move /Y \"watch-harbor-live.ps1\" \"watch-harbor-live.ps1.old\" >nul",
    ")",
    "powershell -NoProfile -ExecutionPolicy Bypass -Command \"$p='%~f0'; $b=[IO.File]::ReadAllBytes($p); $t=[Text.Encoding]::UTF8.GetString($b); $m='::'+'HARBOR_WATCHER_SCRIPT_V1'; $i=$t.IndexOf($m); if($i -lt 0){ throw 'archivo incompleto' }; iex $t.Substring($i+$m.Length)\"",
    "if errorlevel 1 pause",
    "exit /b 0",
    "::HARBOR_WATCHER_SCRIPT_V1",
    "",
  ].join("\r\n");
  writeFileSync(join(outDir, "watch-harbor-live.bat"), header + injected.replace(/\n/g, "\r\n"));
  console.log("[pack-mod] bundled watcher bat");
}

packWatcherBundle();


