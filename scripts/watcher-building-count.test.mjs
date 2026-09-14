import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ps1 = readFileSync(join(root, "public/watch-harbor-live.ps1"), "utf8");
const bat = readFileSync(join(root, "public/watch-harbor-live.bat"), "utf8");
const scanCsSrc = readFileSync(join(root, "src/lib/live/a7s-scan.cs"), "utf8");
const scanCsPublic = readFileSync(join(root, "public/a7s-scan.cs"), "utf8");
const schema = JSON.parse(readFileSync(join(root, "docs/harbor-live.schema.json"), "utf8"));
const fields = readFileSync(join(root, "docs/harbor-live-fields.md"), "utf8");

test("A7sScan.cs accumulates a per-building count and emits it", () => {
  for (const src of [scanCsSrc, scanCsPublic]) {
    assert.match(src, /var buildingCounts = new Dictionary<string, int>\(\);/);
    assert.match(src, /buildingCounts\[row\.id\] = \(buildingCounts\.TryGetValue\(row\.id, out prevCount\) \? prevCount : 0\) \+ v\.Value;/);
    assert.match(src, /Append\("\\",\\"count\\":"\)\.Append\(count\)/);
  }
});

test("public/a7s-scan.cs mirrors src/lib/live/a7s-scan.cs (pack-mod is the sync step)", () => {
  assert.equal(scanCsPublic.replace(/\r\n/g, "\n"), `${scanCsSrc.replace(/\r\n/g, "\n").trim()}\n`);
});

test("watcher forwards the scanned building count into telemetry.buildings", () => {
  assert.match(ps1, /\$buildings \+= \[ordered\]@\{ id = \[string\]\$hit\.id; name = \[string\]\$hit\.name; count = \[int\]\$hit\.count \}/);
  assert.match(bat, /\$buildings \+= \[ordered\]@\{ id = \[string\]\$hit\.id; name = \[string\]\$hit\.name; count = \[int\]\$hit\.count \}/);
});

test("schema: telemetry.buildings items may carry an optional positive count; other named hits cannot", () => {
  assert.deepEqual(schema.properties.telemetry.properties.buildings, { $ref: "#/$defs/buildingHits" });
  const buildingHits = schema.$defs.buildingHits;
  assert.equal(buildingHits.items.required.includes("count"), false);
  assert.equal(buildingHits.items.properties.count.type, "integer");
  assert.equal(buildingHits.items.properties.count.exclusiveMinimum, 0);
  assert.equal(schema.$defs.namedHits.items.properties.count, undefined);
  assert.deepEqual(schema.properties.telemetry.properties.people, { $ref: "#/$defs/namedHits" });
});

test("fields doc documents the optional building count", () => {
  assert.match(fields, /telemetry\.buildings[\s\S]*count/);
});
