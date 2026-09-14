import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { LiveSnapshot } from "../live/types.ts";
import {
  SAVE_COUNT_CHIP_LABEL,
  applySaveCountsChip,
} from "./save-count-chip.ts";
import { mapSaveCountsToCitySeed } from "./save-count-seed.ts";
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

const liveCounts = JSON.parse(
  readFileSync(new URL("./fixtures/live-save-counts.json", import.meta.url), "utf8"),
) as LiveSnapshot;
const liveMissing = JSON.parse(
  readFileSync(new URL("./fixtures/live-missing-counts.json", import.meta.url), "utf8"),
) as LiveSnapshot;
const guidCounts = JSON.parse(
  readFileSync(new URL("./fixtures/save-guid-counts.json", import.meta.url), "utf8"),
) as { counts: { guid: number; count: number }[] };

describe("save-count isolation", () => {
  it("keeps the manual seed when live JSON has presence but no counts", () => {
    const before = structuredClone(MANUAL);
    const mapped = mapSaveCountsToCitySeed({
      fill: "campaign",
      chapterId: "ch1",
      live: liveMissing,
      manualSeed: MANUAL,
    });
    const chip = applySaveCountsChip({ seed: MANUAL, live: liveMissing });
    assert.equal(mapped.degraded, true);
    if (!mapped.degraded) return;
    assert.equal(mapped.keepManualSeed, true);
    assert.equal(chip.applied, false);
    assert.equal(chip.seed, MANUAL);
    assert.equal(MANUAL.islands[0]?.houses.farmer, 10);
    assert.deepEqual(MANUAL, before);
  });

  it("maps known live counts and never puts unknown GUIDs into city-seed", () => {
    const live = applySaveCountsChip({ seed: structuredClone(MANUAL), live: liveCounts });
    assert.equal(live.applied, true);
    assert.equal(live.seed.islands[0]?.houses.farmer, 8);
    assert.equal(live.seed.islands[0]?.buildings.lumberjack, 2);
    assert.equal(live.seed.islands[0]?.buildings.sawmill, 1);
    assert.equal((live.seed.islands[0]?.buildings as Record<string, number>).warehouse, undefined);
    assert.equal((live.seed.islands[0]?.buildings as Record<string, number>).pub, undefined);
    assert.equal((live.seed.islands[0]?.houses as Record<string, number>).warehouse, undefined);

    const fromGuid = mapSaveCountsToCitySeed({
      fill: "campaign",
      chapterId: "ch1",
      counts: guidCounts.counts,
    });
    assert.equal(fromGuid.degraded, false);
    if (fromGuid.degraded) return;
    assert.equal(fromGuid.houses.farmer, 10);
    assert.equal(fromGuid.buildings.lumberjack, 2);
    assert.equal(fromGuid.buildings.sawmill, 1);
    assert.equal((fromGuid.buildings as Record<string, number>).warehouse, undefined);
    assert.equal((fromGuid.houses as Record<string, number>)["9999999"], undefined);
    assert.equal("nextBuild" in fromGuid, false);
    assert.equal("chains" in fromGuid, false);
  });

  it("uses the exact Spanish chip label only on /taller Ciudades", () => {
    const city = readFileSync(new URL("../../components/taller-city.tsx", import.meta.url), "utf8");
    const bench = readFileSync(new URL("../../components/taller-bench.tsx", import.meta.url), "utf8");
    const app = readFileSync(new URL("../../components/harbor-app.tsx", import.meta.url), "utf8");
    const desk = readFileSync(new URL("../../components/session-desk.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../../routes/index.tsx", import.meta.url), "utf8");
    const tablero = readFileSync(new URL("../../lib/tablero-focus.ts", import.meta.url), "utf8");
    assert.equal(SAVE_COUNT_CHIP_LABEL, "Usar conteos del save");
    assert.match(city, /Usar conteos del save|SAVE_COUNT_CHIP_LABEL/);
    assert.match(city, /data-taller-save-counts-chip/);
    assert.match(bench, /TallerCity/);
    assert.match(bench, /live=\{live\}/);
    assert.doesNotMatch(app, /SAVE_COUNT_CHIP_LABEL|data-taller-save-counts-chip|Usar conteos del save/);
    assert.doesNotMatch(desk, /SAVE_COUNT_CHIP_LABEL|data-taller-save-counts-chip|Usar conteos del save/);
    assert.doesNotMatch(home, /SAVE_COUNT_CHIP_LABEL|data-taller-save-counts-chip|Usar conteos del save/);
    assert.doesNotMatch(tablero, /SAVE_COUNT_CHIP_LABEL|data-taller-save-counts-chip|Usar conteos del save/);
  });

  it("does not paint nextBuild or chains on Home, desk, or tablero from this feature", () => {
    const chip = readFileSync(new URL("./save-count-chip.ts", import.meta.url), "utf8");
    const mapper = readFileSync(new URL("./save-count-seed.ts", import.meta.url), "utf8");
    const city = readFileSync(new URL("../../components/taller-city.tsx", import.meta.url), "utf8");
    const app = readFileSync(new URL("../../components/harbor-app.tsx", import.meta.url), "utf8");
    const desk = readFileSync(new URL("../../components/session-desk.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../../routes/index.tsx", import.meta.url), "utf8");
    const tablero = readFileSync(new URL("../../lib/tablero-focus.ts", import.meta.url), "utf8");
    assert.doesNotMatch(chip, /nextBuild:|chains:/);
    assert.doesNotMatch(mapper, /nextBuild:|chains:/);
    assert.doesNotMatch(city, /nextBuild:|chains:/);
    assert.doesNotMatch(app, /applySaveCountsChip|data-taller-save-counts-chip/);
    assert.doesNotMatch(desk, /applySaveCountsChip|data-taller-save-counts-chip/);
    assert.doesNotMatch(home, /applySaveCountsChip|TallerCity|data-taller-next-build/);
    assert.doesNotMatch(tablero, /applySaveCountsChip|data-taller-save-counts-chip|data-taller-next-build/);
  });

  it("does not inject counts into production mapping when the fixture is the only source", () => {
    const production = readFileSync(new URL("./save-count-seed.ts", import.meta.url), "utf8");
    assert.doesNotMatch(production, /live-save-counts|save-guid-counts|9999999/);
    const mapped = mapSaveCountsToCitySeed({ fill: "campaign", chapterId: "ch1", live: liveCounts });
    assert.equal(mapped.degraded, false);
    if (mapped.degraded) return;
    assert.equal(mapped.houses.farmer, 8);
  });

  it("campaign chapter-gates while sandbox may fill more from the same GUID fixture", () => {
    const campaign = mapSaveCountsToCitySeed({
      fill: "campaign",
      chapterId: "ch1",
      counts: [
        { guid: 1010266, count: 1 },
        { guid: 1010298, count: 2 },
      ],
    });
    const sandbox = mapSaveCountsToCitySeed({
      fill: "sandbox",
      chapterId: "ch1",
      counts: [
        { guid: 1010266, count: 1 },
        { guid: 1010298, count: 2 },
      ],
    });
    assert.equal(campaign.degraded, false);
    assert.equal(sandbox.degraded, false);
    if (campaign.degraded || sandbox.degraded) return;
    assert.equal(campaign.buildings.lumberjack, 1);
    assert.equal(campaign.buildings.charcoal, undefined);
    assert.equal(sandbox.buildings.charcoal, 2);
  });
});
