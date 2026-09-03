/**
 * City stats engine (Taller). Numbers come from the Anno 1800 Wiki
 * or from the player seed. Missing wiki/seed data stays null.
 *
 * Needs: https://anno1800.fandom.com/wiki/Needs
 * Production: https://anno1800.fandom.com/wiki/Production
 * Chains: https://anno1800.fandom.com/wiki/Production_chains
 */

export const CITY_SEED_SCHEMA = "harbor-city-v1" as const;
export const CITY_SEED_GAME = "anno-1800" as const;

export type SimMode = "campaign" | "perfect";
export type World = "old" | "new";
export type Confidence = "seed" | "presence";

export type PopulationTier =
  | "farmer"
  | "worker"
  | "artisan"
  | "engineer"
  | "investor"
  | "jornalero"
  | "obrero";

export type BuildingId =
  | "marketplace"
  | "lumberjack"
  | "sawmill"
  | "fishery"
  | "sheep"
  | "knitters"
  | "potato"
  | "distillery"
  | "pig"
  | "slaughterhouse"
  | "grain"
  | "mill"
  | "bakery"
  | "clay"
  | "brick"
  | "iron-mine"
  | "charcoal"
  | "furnace"
  | "steelworks"
  | "rendering"
  | "soap"
  | "sails"
  | "weapons"
  | "plantain"
  | "fish-oil"
  | "kitchen"
  | "alpaca"
  | "poncho"
  | "sugar-cane"
  | "rum-distillery";

export type GoodId =
  | "wood"
  | "timber"
  | "fish"
  | "wool"
  | "work-clothes"
  | "potato"
  | "schnapps"
  | "pigs"
  | "sausages"
  | "grain"
  | "flour"
  | "bread"
  | "clay"
  | "bricks"
  | "iron"
  | "coal"
  | "steel"
  | "steel-beams"
  | "tallow"
  | "soap"
  | "sails"
  | "weapons"
  | "plantains"
  | "fish-oil"
  | "fried-plantains"
  | "alpaca-wool"
  | "ponchos"
  | "sugar-cane"
  | "rum"
  | "canned-food"
  | "sewing-machines"
  | "fur-coats"
  | "glasses"
  | "coffee"
  | "beer"
  | "tortillas"
  | "bowler-hats";

export type HouseCounts = Partial<Record<PopulationTier, number>>;
export type BuildingCounts = Partial<Record<BuildingId, number>>;

/** t/min flow for one good. Null when the seed is presence-only. */
export type GoodFlow = {
  good: GoodId;
  demandTMin: number | null;
  supplyTMin: number | null;
  /** supply − demand. Negative = falta. Null if either side is null. */
  gapTMin: number | null;
};

export type ConsumptionModifiers = {
  /** Residence capacity increase, e.g. 0.2 for +20%. Default 0. */
  R?: number;
  /** Newspaper consumption change, e.g. -0.1. Default 0. */
  N?: number;
  /** Town hall / item consumption bonus sum. Default 0. */
  B?: number;
};

export type IslandPulse = {
  coins?: "up" | "down" | "unknown";
  houses?: "ok" | "yellow" | "empty" | "unknown";
};

export type Island = {
  id: string;
  world: World;
  name?: string;
  houses: HouseCounts;
  buildings: BuildingCounts;
  /** 100 = wiki default, no electricity. */
  productivity?: number;
  modifiers?: ConsumptionModifiers;
  pulse?: IslandPulse;
  notes?: string;
  /**
   * `presence` = watcher saw names, not counts. Compute must not invent t/min.
   * Default `seed` when the player typed counts.
   */
  confidence?: Confidence;
};

export type CitySeed = {
  schema: typeof CITY_SEED_SCHEMA;
  game: typeof CITY_SEED_GAME;
  updatedAt: string;
  /** Default campaign. Perfect ratios only in Taller. */
  mode?: SimMode;
  missionHint?: string;
  islands: Island[];
};

export type NextBuild = {
  buildingId: BuildingId;
  nameEs: string;
  wikiId: string;
  line: string;
};

export type CityAlert = {
  id: string;
  good?: GoodId;
  line: string;
};

export type HousesSupported = Partial<
  Record<GoodId, Partial<Record<PopulationTier, number | null>>>
>;

export type IslandStats = {
  id: string;
  world: World;
  confidence: Confidence;
  housesPresent: HouseCounts;
  housesSupported: HousesSupported;
  demand: Partial<Record<GoodId, number | null>>;
  supply: Partial<Record<GoodId, number | null>>;
  gap: Partial<Record<GoodId, number | null>>;
  flows: GoodFlow[];
  /** Null unless every counted production building has a wiki workforce row. */
  workforce: Partial<Record<PopulationTier, number>> | null;
  /** Null unless every counted production building has wiki maintenance. */
  maintenance: number | null;
  alerts: CityAlert[];
  nextBuild: NextBuild | null;
};

export type CityStats = {
  mode: SimMode;
  confidence: Confidence;
  islands: IslandStats[];
  demand: Partial<Record<GoodId, number | null>>;
  supply: Partial<Record<GoodId, number | null>>;
  gap: Partial<Record<GoodId, number | null>>;
  alerts: CityAlert[];
  nextBuild: NextBuild | null;
};

export type LivePresence = {
  buildingIds?: string[];
};
