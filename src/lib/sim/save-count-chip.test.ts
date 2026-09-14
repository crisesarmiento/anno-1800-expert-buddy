import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { LiveSnapshot } from "../live/types.ts";
import {
  SAVE_COUNT_CHIP_LABEL,
  SAVE_COUNT_DEGRADE_ES,
  applySaveCountsChip,
  fillFromSimMode,
} from "./save-count-chip.ts";
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
      name: "La Inapetente",
      world: "old",
      houses: { farmer: 10 },
      buildings: { lumberjack: 1, sawmill: 1, marketplace: 1 },
      notes: "manual",
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

describe("applySaveCountsChip", () => {
  it("overlays mapped live counts onto the current city-seed houses and factories", () => {
    const before = structuredClone(MANUAL);
    const result = applySaveCountsChip({
      seed: MANUAL,
      live: live({
        telemetry: {
          buildings: [
            { id: "farmer-house", name: "Farmer Residence", count: 8 },
            { id: "lumberjack", name: "Lumberjacks Hut", count: 2 },
          ],
        },
      }),
    });
    assert.equal(result.applied, true);
    assert.equal(result.message, null);
    assert.equal(result.seed.islands[0]?.houses.farmer, 8);
    assert.equal(result.seed.islands[0]?.buildings.lumberjack, 2);
    assert.equal(result.seed.islands[0]?.id, "la-inapetente");
    assert.equal(result.seed.islands[0]?.notes, "manual");
    assert.equal("nextBuild" in result.seed, false);
    assert.equal("chains" in result.seed, false);
    assert.deepEqual(MANUAL, before);
  });

  it("keeps the manual seed and returns Spanish copy when live counts are missing", () => {
    const before = structuredClone(MANUAL);
    const result = applySaveCountsChip({
      seed: MANUAL,
      live: live({
        telemetry: {
          buildings: [{ id: "lumberjack", name: "Lumberjacks Hut" }],
          goods: [{ id: "fish", name: "Fish", amount: 80 }],
        },
      }),
    });
    assert.equal(result.applied, false);
    assert.equal(result.seed, MANUAL);
    assert.equal(result.message, SAVE_COUNT_DEGRADE_ES);
    assert.match(SAVE_COUNT_DEGRADE_ES, /conteos del save/);
    assert.match(SAVE_COUNT_DEGRADE_ES, /seed manual/);
    assert.doesNotMatch(SAVE_COUNT_DEGRADE_ES, /nextBuild|chains/i);
    assert.deepEqual(MANUAL, before);
  });

  it("keeps the manual seed when campaign counts are all chapter-gated", () => {
    const before = structuredClone(MANUAL);
    const result = applySaveCountsChip({
      seed: MANUAL,
      fill: "campaign",
      counts: [
        { guid: 1010298, count: 2 },
        { guid: 101255, count: 6 },
        { id: "rum-distillery", count: 1 },
      ],
    });
    assert.equal(result.applied, false);
    assert.equal(result.seed, MANUAL);
    assert.equal(result.message, SAVE_COUNT_DEGRADE_ES);
    assert.equal(result.seed.islands[0]?.houses.farmer, 10);
    assert.equal(result.seed.islands[0]?.buildings.marketplace, 1);
    assert.deepEqual(MANUAL, before);
  });

  it("wires campaign vs sandbox fill from the mapper, not the view", () => {
    assert.equal(fillFromSimMode("campaign"), "campaign");
    assert.equal(fillFromSimMode("perfect"), "sandbox");
    const campaign = applySaveCountsChip({
      seed: MANUAL,
      fill: "campaign",
      counts: [
        { guid: 1010266, count: 1 },
        { guid: 1010298, count: 2 },
      ],
    });
    const sandbox = applySaveCountsChip({
      seed: { ...MANUAL, mode: "perfect" },
      fill: "sandbox",
      counts: [
        { guid: 1010266, count: 1 },
        { guid: 1010298, count: 2 },
      ],
    });
    assert.equal(campaign.applied, true);
    assert.equal(sandbox.applied, true);
    assert.equal(campaign.seed.islands[0]?.buildings.lumberjack, 1);
    assert.equal(campaign.seed.islands[0]?.buildings.charcoal, undefined);
    assert.equal(sandbox.seed.islands[0]?.buildings.charcoal, 2);
  });
});

describe("Usar conteos del save chip surface", () => {
  const city = readFileSync(new URL("../../components/taller-city.tsx", import.meta.url), "utf8");
  const bench = readFileSync(new URL("../../components/taller-bench.tsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../../components/harbor-app.tsx", import.meta.url), "utf8");
  const desk = readFileSync(new URL("../../components/session-desk.tsx", import.meta.url), "utf8");
  const ahora = readFileSync(new URL("../../components/esto-ahora.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../../routes/index.tsx", import.meta.url), "utf8");

  it("puts the exact Spanish chip only on /taller Ciudades", () => {
    assert.equal(SAVE_COUNT_CHIP_LABEL, "Usar conteos del save");
    assert.match(city, /SAVE_COUNT_CHIP_LABEL/);
    assert.match(city, /data-taller-save-counts-chip/);
    assert.match(city, /applySaveCountsChip/);
    assert.match(city, /fillFromSimMode/);
    assert.doesNotMatch(city, /GUID_TO_HOUSE|GUID_TO_FACTORY|mapSaveCountsToCitySeed/);
    assert.doesNotMatch(app, /Usar conteos del save|SAVE_COUNT_CHIP_LABEL|data-taller-save-counts-chip/);
    assert.doesNotMatch(desk, /Usar conteos del save|SAVE_COUNT_CHIP_LABEL|data-taller-save-counts-chip/);
    assert.doesNotMatch(ahora, /Usar conteos del save|SAVE_COUNT_CHIP_LABEL|data-taller-save-counts-chip/);
    assert.doesNotMatch(home, /Usar conteos del save|SAVE_COUNT_CHIP_LABEL|data-taller-save-counts-chip/);
  });

  it("does not paint nextBuild or chains on Home from this chip", () => {
    assert.doesNotMatch(app, /data-taller-next-build|nextBuild|chains/);
    assert.doesNotMatch(home, /data-taller-next-build|TallerCity|applySaveCountsChip/);
    assert.doesNotMatch(city, /nextBuild:|chains:/);
    assert.match(bench, /TallerCity/);
    assert.match(bench, /live=\{live\}/);
  });
});
