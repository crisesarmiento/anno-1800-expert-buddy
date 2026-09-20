import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ps1 = readFileSync(join(root, "public/watch-harbor-live.ps1"), "utf8");
const bat = readFileSync(join(root, "public/watch-harbor-live.bat"), "utf8");
const scanCs = readFileSync(join(root, "src/lib/live/a7s-scan.cs"), "utf8");
const scanPublic = readFileSync(join(root, "public/a7s-scan.cs"), "utf8");
const snapshotTs = readFileSync(join(root, "src/lib/live/a7s-snapshot.ts"), "utf8");
const assets = readFileSync(
  join(root, "mod/harbor-buddy-telemetry/data/config/export/main/asset/assets.xml"),
  "utf8",
);
const matrix = readFileSync(join(root, "docs/evidence-matrix.md"), "utf8");

test("empty mod XML is not a data source", () => {
  assert.match(assets, /<ModOps>\s*<\/ModOps>/);
  assert.doesNotMatch(ps1, /mods\\harbor-buddy-telemetry/);
  assert.match(matrix, /Mod XML/);
  assert.match(matrix, /no inyecta/i);
});

test("C# scanner tracks ParticipantID and does not take max money across owners", () => {
  for (const src of [scanCs, scanPublic]) {
    assert.match(src, /lastParticipant/);
    assert.match(src, /ParticipantID/);
    assert.match(src, /storageOwner/);
    assert.match(src, /playerStorage/);
    assert.doesNotMatch(src, /amt > money\.Value/);
  }
});

test("watcher only uses money/goods when storageOwner is player", () => {
  assert.match(ps1, /\$playerStorage = \$storageOwner -eq "player"/);
  assert.match(ps1, /if \(\$playerStorage -and \(\$scan\.PSObject\.Properties\.Name -contains "money"\)\)/);
  assert.match(ps1, /if \(\$playerStorage\) \{/);
  assert.match(bat, /\$playerStorage = \$storageOwner -eq "player"/);
});

test("watcher keeps quests empty on purpose — GUID is not an active quest", () => {
  assert.match(ps1, /GUID presence is not an active quest/);
  assert.match(ps1, /\$payload\.quests = @\(\)/);
  assert.match(ps1, /questCount\s*=\s*0/);
  assert.doesNotMatch(ps1, /QuestGUID|QuestID/);
});

test("nested FileDB islands are extracted by id, not by display name", () => {
  for (const src of [scanCs, scanPublic]) {
    assert.match(src, /ExtractIslands/);
    assert.match(src, /IsNestedFileDb/);
    assert.match(src, /CityNameGuid/);
    assert.match(src, /AreaStorageManager/);
    assert.match(src, /islandSnapshots/);
    assert.match(src, /SessionTotalTime/);
    assert.match(src, /lastSnapshot/);
    assert.match(src, /AsInt64/);
    assert.match(src, /BuildingsFromManager/);
    assert.doesNotMatch(src, /stockCount >= 24\) break/);
    assert.match(src, /blobs\.Count == 0/);
    assert.match(src, /city-name-guid/);
  }
  assert.match(ps1, /islandSnapshots/);
  assert.match(ps1, /\$notRollback/);
  assert.match(ps1, /\$islandOut\.buildings/);
  assert.match(ps1, /\$stock\.Count -le 24/);
  assert.doesNotMatch(ps1, /campaignId\s*=\s*\$save\.Name/);
});

test("TypeScript research scanner does not label quest GUIDs active", () => {
  assert.match(snapshotTs, /Watcher emits quests: \[\]/);
  assert.doesNotMatch(snapshotTs, /quests\.push\(\{ title: row\.name, state: "active" \}\)/);
  assert.match(snapshotTs, /isPlayerParticipant\(lastParticipant\)/);
});

test("Get-HousesPulse does not treat missing fish as stock 0", () => {
  assert.doesNotMatch(ps1, /\$fishAmount = 0/);
  assert.match(ps1, /\$hasFishStock = \$false/);
  assert.match(ps1, /if \(\$scan\.farmers -and -not \$hasFishery -and -not \$hasFishStock\)/);
});
