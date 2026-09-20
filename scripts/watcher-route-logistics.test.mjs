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

describe("stage 4 watcher logistics fields", () => {
  it("reads IsLoading only when present and never invents load", () => {
    assert.match(scanner, /Leaf\(goodNode, "IsLoading"\)/);
    assert.match(scanner, /"isLoading\\":/);
    assert.match(scanner, /IsLoading\.Value \? "true" : "false"/);
    assert.match(watcher, /\$routeGood\.isLoading = \[bool\]\$good\.isLoading/);
  });

  it("joins ship names by TradeRouteID + VehicleName, not by inventing titles", () => {
    assert.match(scanner, /PropertyTradeRouteVehicle/);
    assert.match(scanner, /VehicleName/);
    assert.match(scanner, /TradeRouteID/);
    assert.match(watcher, /\$routeOut\.ships = @\(\$ships\)/);
  });

  it("summarizes finalized TradeRouteEntries without causal stock attribution", () => {
    assert.match(scanner, /TradedGoods/);
    assert.match(scanner, /ExecutionTime/);
    assert.match(scanner, /medianAbsAmount/);
    assert.doesNotMatch(scanner, /causedByRoute|routeCaused|causal/);
    assert.match(watcher, /\$routeOut\.delivery = \$delivery/);
    assert.doesNotMatch(watcher, /causedByRoute|routeCaused|causal/);
  });

  it("keeps optional schema fields backward compatible", () => {
    const route = schema.properties.telemetry.properties.routes.items.properties;
    assert.equal(route.stops.items.properties.goods.items.properties.isLoading.type, "boolean");
    assert.equal(route.ships.items.required[0], "name");
    assert.ok(route.delivery.required.includes("visitCount"));
  });

  it("ships the same fields in the standalone bat after pack:mod", () => {
    assert.match(bundledWatcher, /\$routeGood\.isLoading = \[bool\]\$good\.isLoading/);
    assert.match(bundledWatcher, /\$routeOut\.ships = @\(\$ships\)/);
    assert.match(bundledWatcher, /\$routeOut\.delivery = \$delivery/);
  });
});
