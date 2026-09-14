import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LiveSnapshot } from "../live/types.ts";
import {
  GUID_TO_FACTORY,
  GUID_TO_HOUSE,
  mapSaveCountsToCitySeed,
} from "./save-count-seed.ts";
import type { CitySeed } from "./types.ts";

const MANUAL: CitySeed = {
  schema: "harbor-city-v1",
  game: "anno-1800",
  updatedAt: "2026-09-01T00:00:00.000Z",
  mode: "campaign",
  chapterId: "ch1",
  islands: [
    {
      id: "la-inapetente",
      world: "old",
      houses: { farmer: 10 },
      buildings: { lumberjack: 1, sawmill: 1, marketplace: 1 },
    },
  ],
};

function live(over: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    source: "save",
    updatedAt: "2026-09-14T00:00:00.000Z",
    game: "anno-1800",
    quests: [],
    ...over,
  };
}

describe("GUID to city-seed mapping table", () => {
  it("documents farmer house and lumberjack GUIDs", () => {
    assert.equal(GUID_TO_HOUSE[1010343], "farmer");
    assert.equal(GUID_TO_FACTORY[1010266], "lumberjack");
    assert.equal(GUID_TO_FACTORY[1010262], "grain");
    assert.equal(GUID_TO_FACTORY[1010269], "pig");
  });
});

describe("mapSaveCountsToCitySeed", () => {
  it("maps known GUID counts into houses and factories", () => {
    const result = mapSaveCountsToCitySeed({
      fill: "campaign",
      chapterId: "ch1",
      counts: [
        { guid: 1010343, count: 10 },
        { guid: 1010266, count: 2 },
        { guid: 1010294, count: 1 },
        { guid: 1010372, count: 1 },
      ],
    });
    assert.equal(result.degraded, false);
    if (result.degraded) return;
    assert.equal(result.keepManualSeed, false);
    assert.equal(result.houses.farmer, 10);
    assert.equal(result.buildings.lumberjack, 2);
    assert.equal(result.buildings.sawmill, 1);
    assert.equal(result.buildings.marketplace, 1);
    assert.equal("nextBuild" in result, false);
    assert.equal("chains" in result, false);
  });

  it("prefers live JSON building counts when present", () => {
    const result = mapSaveCountsToCitySeed({
      fill: "campaign",
      chapterId: "ch1",
      live: live({
        telemetry: {
          buildings: [
            { id: "farmer-house", name: "Farmer Residence", count: 8 },
            { id: "fishery", name: "Fishery", count: 1 },
          ],
        },
      }),
    });
    assert.equal(result.degraded, false);
    if (result.degraded) return;
    assert.equal(result.houses.farmer, 8);
    assert.equal(result.buildings.fishery, 1);
  });

  it("ignores unknown GUIDs and unmapped buildings", () => {
    const result = mapSaveCountsToCitySeed({
      fill: "sandbox",
      counts: [
        { guid: 9999999, count: 40 },
        { guid: 1010371, count: 3 },
        { id: "warehouse", count: 2 },
        { guid: 1010343, count: 4 },
      ],
    });
    assert.equal(result.degraded, false);
    if (result.degraded) return;
    assert.equal(result.houses.farmer, 4);
    assert.equal(Object.keys(result.buildings).length, 0);
    assert.equal((result.houses as Record<string, number>).warehouse, undefined);
  });

  it("sums duplicate sawmill GUIDs", () => {
    const result = mapSaveCountsToCitySeed({
      fill: "campaign",
      chapterId: "ch1",
      counts: [
        { guid: 1010294, count: 1 },
        { guid: 1010297, count: 2 },
      ],
    });
    assert.equal(result.degraded, false);
    if (result.degraded) return;
    assert.equal(result.buildings.sawmill, 3);
  });

  it("campaign chapter gate drops buildings the chapter has not unlocked", () => {
    const result = mapSaveCountsToCitySeed({
      fill: "campaign",
      chapterId: "ch1",
      counts: [
        { guid: 1010266, count: 1 },
        { guid: 1010298, count: 2 },
        { id: "rum-distillery", count: 1 },
        { guid: 101255, count: 6 },
      ],
    });
    assert.equal(result.degraded, false);
    if (result.degraded) return;
    assert.equal(result.buildings.lumberjack, 1);
    assert.equal(result.buildings.charcoal, undefined);
    assert.equal(result.buildings["rum-distillery"], undefined);
    assert.equal(result.houses.obrero, undefined);
  });

  it("sandbox may fill slots beyond the campaign chapter gate", () => {
    const result = mapSaveCountsToCitySeed({
      fill: "sandbox",
      chapterId: "ch1",
      counts: [
        { guid: 1010266, count: 1 },
        { guid: 1010298, count: 2 },
        { id: "rum-distillery", count: 1 },
        { guid: 101255, count: 6 },
      ],
    });
    assert.equal(result.degraded, false);
    if (result.degraded) return;
    assert.equal(result.buildings.lumberjack, 1);
    assert.equal(result.buildings.charcoal, 2);
    assert.equal(result.buildings["rum-distillery"], 1);
    assert.equal(result.houses.obrero, 6);
  });

  it("presence plus goods without counts degrades and does not invent numbers", () => {
    const result = mapSaveCountsToCitySeed({
      fill: "campaign",
      chapterId: "ch1",
      manualSeed: MANUAL,
      live: live({
        telemetry: {
          buildings: [
            { id: "lumberjack", name: "Lumberjacks Hut" },
            { id: "farmer-house", name: "Farmer Residence" },
          ],
          goods: [{ id: "fish", name: "Fish", amount: 80 }],
        },
      }),
    });
    assert.equal(result.degraded, true);
    if (!result.degraded) return;
    assert.equal(result.keepManualSeed, true);
    assert.equal(result.reason, "missing-counts");
    assert.equal("houses" in result, false);
    assert.equal("buildings" in result, false);
    assert.equal(MANUAL.islands[0]?.houses.farmer, 10);
  });

  it("missing live counts degrade and never overwrite a manual seed", () => {
    const before = structuredClone(MANUAL);
    const result = mapSaveCountsToCitySeed({
      fill: "campaign",
      chapterId: "ch1",
      live: live(),
      manualSeed: MANUAL,
    });
    assert.equal(result.degraded, true);
    if (!result.degraded) return;
    assert.equal(result.keepManualSeed, true);
    assert.deepEqual(MANUAL, before);
  });

  it("does not emit nextBuild, chains, or Home paint fields", () => {
    const result = mapSaveCountsToCitySeed({
      fill: "campaign",
      chapterId: "ch1",
      counts: [{ guid: 1010266, count: 1 }],
    });
    assert.equal(result.degraded, false);
    const keys = Object.keys(result).sort();
    assert.deepEqual(keys, ["buildings", "degraded", "fill", "houses", "keepManualSeed"]);
  });
});

