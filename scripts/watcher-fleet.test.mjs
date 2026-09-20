import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const watcher = readFileSync(new URL("../public/watch-harbor-live.ps1", import.meta.url), "utf8");
const bundledWatcher = readFileSync(
  new URL("../public/watch-harbor-live.bat", import.meta.url),
  "utf8",
);
const schema = JSON.parse(
  readFileSync(new URL("../docs/harbor-live.schema.json", import.meta.url), "utf8"),
);
const scanner = readFileSync(new URL("../src/lib/live/a7s-scan.cs", import.meta.url), "utf8");

describe("stage 6 watcher fleet fields", () => {
  it("extracts player ships with Owner id 0 and never ConstructionAI maintenance", () => {
    assert.match(scanner, /ExtractFleet/);
    assert.match(scanner, /VehicleName/);
    assert.match(scanner, /ownerId\.Value == 0/);
    assert.doesNotMatch(scanner, /ShipMaintenance|TaxBalance|ConstructionAI/);
    assert.match(watcher, /\$telemetry\.fleet = @\(\$fleet\)/);
    assert.match(watcher, /if \(\$ship\.ownerId -eq \$null\) \{ continue \}/);
  });

  it("keeps fleet optional and player-owned in the schema", () => {
    const fleet = schema.properties.telemetry.properties.fleet;
    assert.equal(fleet.maxItems, 80);
    assert.equal(schema.$defs.fleetShip.properties.ownerId.const, 0);
    assert.equal(schema.$defs.fleetShip.properties.maintenance, undefined);
  });

  it("does not inject or write saves", () => {
    assert.doesNotMatch(scanner, /File\.WriteAllBytes|inject|\.a7s"\s*,/);
    assert.doesNotMatch(watcher, /Set-Content.*\.a7s|inject/);
  });
});

describe("bundled watcher after pack", () => {
  it("carries fleet mapping", () => {
    assert.match(bundledWatcher, /\$telemetry\.fleet = @\(\$fleet\)/);
  });
});
