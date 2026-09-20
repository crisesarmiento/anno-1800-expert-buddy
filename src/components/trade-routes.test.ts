import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("./trade-routes.tsx", import.meta.url), "utf8");

describe("Rutas stage 4 honesty", () => {
  it("reuses structural health and never attributes a stock drop to the route", () => {
    assert.match(src, /tradeRouteHealth/);
    assert.match(src, /inspectRouteLogistics/);
    assert.match(src, /t\.routes\.stockWatch/);
    assert.match(src, /t\.routes\.guaranteedNever/);
    assert.doesNotMatch(src, /causó|caused the|throughput real/);
  });

  it("shows island and ship names from verified joins only", () => {
    assert.match(src, /islandByAreaId/);
    assert.match(src, /logistics\.ships/);
    assert.match(src, /t\.routes\.noShipNames/);
    assert.doesNotMatch(src, /La Inapetente/);
  });
});
