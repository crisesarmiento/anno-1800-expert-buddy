import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ps1 = readFileSync(join(root, "public/watch-harbor-live.ps1"), "utf8");
const bat = readFileSync(join(root, "public/watch-harbor-live.bat"), "utf8");

test("watcher computes pulseHint.houses instead of hardcoding unknown", () => {
  assert.doesNotMatch(ps1, /houses = "unknown" \}/);
  assert.match(ps1, /function Get-HousesPulse/);
  assert.match(ps1, /\$houses = Get-HousesPulse \$scan \$buildings \$goods/);
  assert.match(ps1, /\$pulseHint = \[ordered\]@\{ coins = \$coins; houses = \$houses \}/);
});

test("Get-HousesPulse mirrors src/lib/live/a7s-snapshot.ts housesHint: presence, not a guess", () => {
  assert.match(ps1, /hasHouses = \[bool\]\$scan\.farmers/);
  assert.match(ps1, /if \(-not \$hasHouses\) \{ return "empty" \}/);
  assert.match(ps1, /if \(-not \$hasMarket\) \{ return "empty" \}/);
  assert.match(ps1, /return "yellow"/);
  assert.match(ps1, /return "ok"/);
});

test("the bundled .bat ships the same houses computation as the .ps1 source", () => {
  assert.match(bat, /function Get-HousesPulse/);
  assert.doesNotMatch(bat, /houses = "unknown" \}/);
});

test("still read-only on .a7s: only harbor-live.json / last-good get written", () => {
  assert.doesNotMatch(ps1, /WriteAll(?:Bytes|Text)\(\$save/);
  assert.match(ps1, /if \(\$leaf -ne "harbor-live\.json"\) \{ throw "solo harbor-live\.json" \}/);
});
