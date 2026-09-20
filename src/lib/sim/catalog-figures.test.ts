import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BUILDINGS } from "./chains.ts";
import {
  BUILDING_SITE,
  CHAIN_CONSTRUCTION,
  LIVE_GOOD_TO_CATALOG,
  chainConstruction,
  liveBuildingToCatalog,
  liveGoodToCatalog,
} from "./catalog-figures.ts";

describe("catalog figures", () => {
  it("maps live timber stock id `wood` to catalog timber, not raw logs", () => {
    assert.equal(LIVE_GOOD_TO_CATALOG.wood, "timber");
    assert.equal(liveGoodToCatalog("wood"), "timber");
    assert.equal(liveGoodToCatalog("wood-log"), "wood");
    assert.equal(liveGoodToCatalog("clothes"), "work-clothes");
    assert.equal(liveGoodToCatalog("unknown-good"), null);
  });

  it("maps grain-farm watcher id `bread` to the grain building", () => {
    assert.equal(liveBuildingToCatalog("bread"), "grain");
    assert.equal(liveBuildingToCatalog("sausage"), "pig");
    assert.equal(liveBuildingToCatalog("fishery"), "fishery");
  });

  it("gives every construction figure a source, unit and DLC coverage", () => {
    const timber = chainConstruction("timber", "old");
    assert.ok(timber?.coins);
    assert.equal(timber.coins.unit, "credits");
    assert.equal(timber.coins.source.kind, "wiki-cc-by-sa");
    assert.match(timber.coins.source.url, /Production_chains/);
    assert.equal(timber.coins.coverage.dlc, "base");
    assert.equal(timber.coins.coverage.modifiers, "no-electricity-no-items");
    assert.equal(timber.coins.value, 200);
  });

  it("does not invent New World timber cost for an Old World island", () => {
    assert.equal(chainConstruction("fried-plantains", "old"), null);
    assert.ok(CHAIN_CONSTRUCTION["fried-plantains"]?.new?.coins);
  });

  it("registers site needs for every production building instead of assuming none", () => {
    for (const id of Object.keys(BUILDINGS)) {
      assert.ok(BUILDING_SITE[id as keyof typeof BUILDING_SITE], `missing site row for ${id}`);
    }
    assert.equal(BUILDING_SITE.potato?.fertility, "potato");
    assert.equal(BUILDING_SITE["iron-mine"]?.resource, "iron");
    assert.equal(BUILDING_SITE.fishery?.resource, "coastline");
    assert.equal(BUILDING_SITE.sawmill?.fertility, null);
  });
});
