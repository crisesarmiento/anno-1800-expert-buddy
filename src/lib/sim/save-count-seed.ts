/**
 * Pure mapper from known save-file building GUIDs (and live JSON counts)
 * into city-seed houses/factories. No nextBuild, no chains, no Home paint.
 *
 * Prefer explicit counts. Presence + goods without counts is not a count:
 * degrade and keep the manual seed. Unknown GUIDs are ignored.
 * Campaign fill gates by chapter; sandbox may fill more slots.
 */

import { lookupGuid } from "../data/guids.ts";
import type { LiveSnapshot } from "../live/types.ts";
import { chapterAllowsBuilding } from "./compute.ts";
import type {
  BuildingCounts,
  BuildingId,
  CampaignChapterId,
  CitySeed,
  HouseCounts,
  PopulationTier,
} from "./types.ts";

/** GUID to house tier. Residences only. */
export const GUID_TO_HOUSE: Record<number, PopulationTier> = {
  1010343: "farmer",
  1010344: "worker",
  1010345: "artisan",
  1010346: "engineer",
  101254: "jornalero",
  101255: "obrero",
};

/** GUID to factory slot. Warehouse/pub/school/church stay unmapped. */
export const GUID_TO_FACTORY: Record<number, BuildingId> = {
  1010266: "lumberjack",
  1010267: "sheep",
  1010294: "sawmill",
  1010297: "sawmill",
  1010298: "charcoal",
  1010372: "marketplace",
  101257: "marketplace",
  1010278: "fishery",
  1010265: "potato",
  1010262: "grain",
  1010269: "pig",
  1010316: "knitters",
  1010312: "distillery",
};

const ID_TO_HOUSE: Record<string, PopulationTier> = {
  "farmer-house": "farmer",
  "worker-house": "worker",
  "artisan-house": "artisan",
  "engineer-house": "engineer",
  jornalero: "jornalero",
  obrero: "obrero",
};

const ID_TO_FACTORY: Record<string, BuildingId> = {
  lumberjack: "lumberjack",
  sheep: "sheep",
  sawmill: "sawmill",
  charcoal: "charcoal",
  marketplace: "marketplace",
  fishery: "fishery",
  potato: "potato",
  grain: "grain",
  bread: "grain",
  pig: "pig",
  sausage: "pig",
  knitters: "knitters",
  distillery: "distillery",
  mill: "mill",
  bakery: "bakery",
  clay: "clay",
  brick: "brick",
  "iron-mine": "iron-mine",
  furnace: "furnace",
  steelworks: "steelworks",
  rendering: "rendering",
  soap: "soap",
  sails: "sails",
  weapons: "weapons",
  plantain: "plantain",
  "fish-oil": "fish-oil",
  kitchen: "kitchen",
  alpaca: "alpaca",
  poncho: "poncho",
  "sugar-cane": "sugar-cane",
  "rum-distillery": "rum-distillery",
  slaughterhouse: "slaughterhouse",
};

const HOUSE_CHAPTER: Record<PopulationTier, CampaignChapterId> = {
  farmer: "ch1",
  worker: "ch1",
  artisan: "ch2",
  engineer: "ch4",
  investor: "end",
  jornalero: "ch3",
  obrero: "ch3",
};

const CHAPTER_RANK: Record<CampaignChapterId, number> = {
  prologue: 0,
  ch1: 1,
  ch2: 2,
  ch3: 3,
  ch4: 4,
  end: 5,
};

export type SaveCountFill = "campaign" | "sandbox";

export type SaveCountHit = {
  guid?: number;
  id?: string;
  count: number;
};

export type SaveCountMapInput = {
  fill: SaveCountFill;
  chapterId?: CampaignChapterId;
  live?: LiveSnapshot | null;
  counts?: SaveCountHit[];
  manualSeed?: CitySeed | null;
};

export type SaveCountMapped = {
  degraded: false;
  keepManualSeed: false;
  fill: SaveCountFill;
  houses: HouseCounts;
  buildings: BuildingCounts;
};

export type SaveCountDegraded = {
  degraded: true;
  keepManualSeed: true;
  reason: "missing-counts";
};

export type SaveCountMapResult = SaveCountMapped | SaveCountDegraded;

function asIntCount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Math.floor(value);
}

function add(map: Record<string, number>, key: string, n: number) {
  map[key] = (map[key] ?? 0) + n;
}

function houseFor(guid?: number, id?: string): PopulationTier | undefined {
  if (guid != null && GUID_TO_HOUSE[guid]) return GUID_TO_HOUSE[guid];
  if (guid != null) {
    const row = lookupGuid(guid);
    if (row?.kind === "building" && ID_TO_HOUSE[row.id]) return ID_TO_HOUSE[row.id];
  }
  if (id && ID_TO_HOUSE[id]) return ID_TO_HOUSE[id];
  return undefined;
}

function factoryFor(guid?: number, id?: string): BuildingId | undefined {
  if (guid != null && GUID_TO_FACTORY[guid]) return GUID_TO_FACTORY[guid];
  if (guid != null) {
    const row = lookupGuid(guid);
    if (row?.kind === "building" && ID_TO_FACTORY[row.id]) return ID_TO_FACTORY[row.id];
  }
  if (id && ID_TO_FACTORY[id]) return ID_TO_FACTORY[id];
  return undefined;
}

function chapterAllowsHouse(seen: CampaignChapterId, tier: PopulationTier): boolean {
  return CHAPTER_RANK[seen] >= CHAPTER_RANK[HOUSE_CHAPTER[tier]];
}

function collectHits(input: SaveCountMapInput): SaveCountHit[] {
  if (input.counts && input.counts.length > 0) return input.counts;
  const buildings = input.live?.telemetry?.buildings ?? [];
  const hits: SaveCountHit[] = [];
  for (const row of buildings) {
    const rec = row as { id?: string; guid?: number; count?: unknown };
    const count = asIntCount(rec.count);
    if (count === undefined) continue;
    hits.push({ id: rec.id, guid: rec.guid, count });
  }
  return hits;
}

function degrade(): SaveCountDegraded {
  return { degraded: true, keepManualSeed: true, reason: "missing-counts" };
}

export function mapSaveCountsToCitySeed(input: SaveCountMapInput): SaveCountMapResult {
  const hits = collectHits(input);
  if (hits.length === 0) return degrade();

  const seen: CampaignChapterId = input.chapterId ?? "ch1";
  const sandbox = input.fill === "sandbox";
  const housesAcc: Record<string, number> = {};
  const buildingsAcc: Record<string, number> = {};
  let usable = false;

  for (const hit of hits) {
    const count = asIntCount(hit.count);
    if (count === undefined) continue;
    const house = houseFor(hit.guid, hit.id);
    if (house) {
      usable = true;
      if (sandbox || chapterAllowsHouse(seen, house)) add(housesAcc, house, count);
      continue;
    }
    const factory = factoryFor(hit.guid, hit.id);
    if (!factory) continue;
    usable = true;
    if (sandbox || chapterAllowsBuilding(seen, factory)) add(buildingsAcc, factory, count);
  }

  if (!usable) return degrade();

  return {
    degraded: false,
    keepManualSeed: false,
    fill: input.fill,
    houses: housesAcc,
    buildings: buildingsAcc,
  };
}

