/**
 * Taller Ciudades chip: apply mapper overlay to the current city-seed.
 * Mapping lives in mapSaveCountsToCitySeed — this file only overlays or keeps.
 * Never writes nextBuild or chains. Never paints Home.
 */

import type { LiveSnapshot } from "../live/types.ts";
import { mapSaveCountsToCitySeed } from "./save-count-seed.ts";
import type { SaveCountFill, SaveCountHit } from "./save-count-seed.ts";
import type {
  BuildingCounts,
  CitySeed,
  HouseCounts,
  Island,
  SimMode,
} from "./types.ts";

export const SAVE_COUNT_CHIP_LABEL = "Usar conteos del save";

export const SAVE_COUNT_DEGRADE_ES =
  "No hay conteos del save. Dejé el seed manual sin cambios.";

export function fillFromSimMode(mode: SimMode): SaveCountFill {
  return mode === "perfect" ? "sandbox" : "campaign";
}

export type ApplySaveCountsInput = {
  seed: CitySeed;
  live?: LiveSnapshot | null;
  counts?: SaveCountHit[];
  fill?: SaveCountFill;
};

export type DiagnosisSource = "save" | "example-seed" | "manual" | "mixed";

export type ApplySaveCountsResult = {
  seed: CitySeed;
  applied: boolean;
  message: string | null;
  diagnosis: DiagnosisSource;
};

export const EXAMPLE_SEED_ISLAND_ID = "la-inapetente";
export const EXAMPLE_SEED_NOTES =
  "primera isla, mercado cerca del puerto. Bright Sands es de Edvard.";

export function isExampleCampaignSeed(seed: CitySeed): boolean {
  const island = seed.islands[0];
  return (
    seed.chapterId === "ch1" &&
    island?.id === EXAMPLE_SEED_ISLAND_ID &&
    island?.notes === EXAMPLE_SEED_NOTES
  );
}

export function diagnosisSourceOf(input: {
  seed: CitySeed;
  applied: boolean;
}): DiagnosisSource {
  const example = isExampleCampaignSeed(input.seed);
  if (input.applied && example) return "mixed";
  if (input.applied) return "save";
  if (example) return "example-seed";
  return "manual";
}

function overlayIsland(island: Island, houses: HouseCounts, buildings: BuildingCounts): Island {
  return {
    ...island,
    houses: { ...houses },
    buildings: { ...buildings },
    confidence: "seed",
  };
}

function overlaySeed(seed: CitySeed, houses: HouseCounts, buildings: BuildingCounts): CitySeed {
  if (seed.islands.length === 0) return seed;
  return {
    ...seed,
    islands: seed.islands.map((island, index) =>
      index === 0 ? overlayIsland(island, houses, buildings) : island,
    ),
  };
}

export function applySaveCountsChip(input: ApplySaveCountsInput): ApplySaveCountsResult {
  const fill = input.fill ?? fillFromSimMode(input.seed.mode ?? "campaign");
  const mapped = mapSaveCountsToCitySeed({
    fill,
    chapterId: input.seed.chapterId,
    live: input.live,
    counts: input.counts,
    manualSeed: input.seed,
  });
  if (mapped.degraded || mapped.keepManualSeed) {
    return {
      seed: input.seed,
      applied: false,
      message: SAVE_COUNT_DEGRADE_ES,
      diagnosis: diagnosisSourceOf({ seed: input.seed, applied: false }),
    };
  }
  const next = overlaySeed(input.seed, mapped.houses, mapped.buildings);
  const applied = true;
  return {
    seed: next,
    applied,
    message: null,
    diagnosis: diagnosisSourceOf({ seed: input.seed, applied }),
  };
}
