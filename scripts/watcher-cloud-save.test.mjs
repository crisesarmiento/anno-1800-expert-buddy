import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const watcher = readFileSync(join(root, "public/watch-harbor-live.ps1"), "utf8");
const scanner = readFileSync(join(root, "src/lib/live/a7s-scan.cs"), "utf8");
const schema = JSON.parse(readFileSync(join(root, "docs/harbor-live.schema.json"), "utf8"));

test("watcher discovers Ubisoft and Steam cloud save caches without touching saves", () => {
  assert.match(watcher, /Ubisoft\\Ubisoft Game Launcher\\savegames/);
  assert.match(watcher, /foreach \(\$gameId in @\("4553", "4554"\)\)/);
  assert.match(watcher, /Filter "\*\.save"/);
  assert.match(watcher, /Test-AnnoArchive/);
  assert.doesNotMatch(watcher, /WriteAll(?:Bytes|Text)\(\$save/);
});

test("scanner unwraps a Ubisoft header before reading the RDA archive", () => {
  assert.match(scanner, /NormalizeArchive\(buf\)/);
  assert.match(scanner, /Resource File V2\.2/);
  assert.match(scanner, /Math\.Min\(256, buf\.Length - magic\.Length\)/);
});

test("watcher publishes connection evidence and player trade routes", () => {
  assert.match(watcher, /mode\s+= \$\(if \(\$save\.Extension -eq "\.save"\)/);
  assert.match(watcher, /routeCount\s+= @\(\$routes\)\.Count/);
  assert.match(scanner, /ownerId\.Value != 0/);
  assert.ok(schema.properties.connection);
  assert.ok(schema.properties.telemetry.properties.routes);
});
