// Read-only probe: re-enters nested BinaryData FileDB blobs inside a .a7s
// session save to check for CityName / SessionTradeRouteManager paths.
// Never writes the .a7s. See prompts/PROMPT-FILEDB-PROBE.md and
// docs/filedb-spike-routes.md.
//
// Usage: node --experimental-strip-types scripts/filedb-probe.ts [path-to-save.a7s]
import { readFileSync } from "node:fs";
import { unpackA7s, visitFileDb, leafI32, leafText } from "../src/lib/live/a7s-read.ts";

const WATCH_ATTRS = new Set([
  "CityName",
  "CityNameGuid",
  "AreaID",
  "ProductGUID",
]);

const savePath = process.argv[2] ?? "tmp-saves/Cristian-Sarmien17.a7s";
const buf = readFileSync(savePath);

const files = unpackA7s(buf);
console.log(`RDA files: ${files.map((f) => f.name).join(", ")}`);

const data = files.find((f) => f.name === "data.a7s") ?? files[files.length - 1];
if (!data) {
  console.log("No data.a7s found.");
  process.exit(1);
}

type Leaf = { depth: number; path: string; attr: string; value: string };

const allAttrsSeen = new Set<string>();
const allDictNames = new Set<string>();
const watchHits: Leaf[] = [];
const routeLeaves: Leaf[] = [];
const areaInfoLeaves: Leaf[] = [];
const shipNameLeaves: Leaf[] = [];
let nestedFileDbCount = 0;
let maxDepth = 0;

function describe(bytes: Buffer): string {
  const text = leafText(bytes);
  if (text) return JSON.stringify(text);
  const i = leafI32(bytes);
  if (i != null) return String(i);
  return `<${bytes.length}b>`;
}

// Re-enter any leaf whose payload itself looks like a FileDB blob (trailer
// magic 0xfffffffd at end-4) -- this is how BinaryData / SessionData nest.
function looksLikeFileDb(bytes: Buffer): boolean {
  return bytes.length > 20 && bytes.readUInt32LE(bytes.length - 4) === 0xfffffffd;
}

function walk(bytes: Buffer, prefix: string, depth: number) {
  maxDepth = Math.max(maxDepth, depth);
  const { tags, attrs } = visitFileDb(bytes, (tagPath, attr, leafBytes) => {
    const path = prefix ? `${prefix}/${tagPath}` : tagPath;
    allAttrsSeen.add(attr);
    const wantsLeaf =
      WATCH_ATTRS.has(attr) ||
      path.includes("SessionTradeRouteManager") ||
      path.includes("AreaInfo") ||
      attr === "VehicleName";
    if (wantsLeaf) {
      const leaf: Leaf = { depth, path, attr, value: describe(leafBytes) };
      if (WATCH_ATTRS.has(attr)) watchHits.push(leaf);
      if (path.includes("SessionTradeRouteManager")) routeLeaves.push(leaf);
      if (path.includes("AreaInfo")) areaInfoLeaves.push(leaf);
      if (attr === "VehicleName") shipNameLeaves.push(leaf);
    }

    if (looksLikeFileDb(leafBytes)) {
      nestedFileDbCount++;
      walk(leafBytes, `${path}[${attr}]`, depth + 1);
    }
  });
  for (const name of tags.values()) allDictNames.add(name);
  for (const name of attrs.values()) allDictNames.add(name);
}

walk(data.bytes, "", 0);

console.log(`\nMax nesting depth reached: ${maxDepth}`);
console.log(`Nested FileDB blobs re-entered: ${nestedFileDbCount}`);
console.log(`Distinct attrs seen (all depths): ${allAttrsSeen.size}`);

for (const wanted of ["CityName", "CityNameGuid", "SessionTradeRouteManager", "RouteMap", "Stations"]) {
  console.log(`  ${wanted}: ${allDictNames.has(wanted) ? "in tag/attr dict" : "NOT in any dict (never serialized)"}`);
}

console.log(`\nCityNameGuid hits (nested AreaInfo, depth > 0 expected): ${watchHits.filter((h) => h.attr === "CityNameGuid").length}`);
for (const h of watchHits.filter((h) => h.attr === "CityNameGuid").slice(0, 5)) {
  console.log(`  [depth ${h.depth}] ${h.value} @ ${h.path}`);
}

console.log(`\nSessionTradeRouteManager leaves: ${routeLeaves.length}`);
console.log(`Distinct route Name values (first 60, dedup):`);
for (const name of new Set(routeLeaves.filter((l) => l.attr === "Name").map((l) => l.value))) {
  console.log(`  ${name}`);
}

console.log(`\nShip names (VehicleName) found: ${shipNameLeaves.length}`);
for (const l of shipNameLeaves.slice(0, 10)) {
  console.log(`  [depth ${l.depth}] ${l.value}`);
}

console.log(`\nAreaInfo leaves total: ${areaInfoLeaves.length}`);
