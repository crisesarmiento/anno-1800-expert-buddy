/**
 * Residence consumption. Source: https://anno1800.fandom.com/wiki/Needs
 *
 * Consumption is per residence at default max capacity, not per inhabitant.
 * C is tons/second. t/min house = C * 60.
 * Formula: C * (1+R) * (1+N) * (1+B). R/N/B default 0.
 *
 * Lifestyle needs (mail, DLC goods) are out of this pass — left uncoded.
 */

import type { BuildingId, ConsumptionModifiers, GoodId, PopulationTier } from "./types.ts";

export const NEEDS_WIKI = "https://anno1800.fandom.com/wiki/Needs" as const;

/** Default max residents per house (wiki Needs, excluding lifestyle). */
export const HOUSE_CAPACITY: Record<PopulationTier, number> = {
  farmer: 10,
  worker: 20,
  artisan: 30,
  engineer: 40,
  investor: 50,
  jornalero: 10,
  obrero: 20,
};

export type NeedKind = "basic" | "luxury" | "building";

export type ResidenceNeed = {
  id: string;
  kind: NeedKind;
  /** Wiki English id. */
  wikiId: string;
  nameEs: string;
  good: GoodId | null;
  buildingNeed?: BuildingId;
  /**
   * Base C tons/second at default max capacity.
   * Null for building-range needs (market, pub, school, church, chapel).
   */
  cTonsPerSecond: number | null;
  /** Wiki "Supply" column: residences per 1 t/min. Null if no good. */
  housesPerTonMin: number | null;
  influx: number | null;
  happiness: number | null;
  /** Local same-tier inhabitants to unlock. Null = always on / not listed. */
  unlockInhabitants: number | null;
};

export function tonsPerMinutePerHouse(cTonsPerSecond: number): number {
  return cTonsPerSecond * 60;
}

export function housesPerOneTonPerMinute(cTonsPerSecond: number): number {
  return 1 / tonsPerMinutePerHouse(cTonsPerSecond);
}

export function consumeTonsPerSecond(
  cTonsPerSecond: number,
  modifiers: ConsumptionModifiers = {},
): number {
  const r = modifiers.R ?? 0;
  const n = modifiers.N ?? 0;
  const b = modifiers.B ?? 0;
  return cTonsPerSecond * (1 + r) * (1 + n) * (1 + b);
}

export function consumeTonsPerMinute(
  cTonsPerSecond: number,
  modifiers: ConsumptionModifiers = {},
): number {
  return consumeTonsPerSecond(cTonsPerSecond, modifiers) * 60;
}

export const FARMER_NEEDS: readonly ResidenceNeed[] = [
  {
    id: "farmer-market",
    kind: "building",
    wikiId: "Marketplace",
    nameEs: "Mercado",
    good: null,
    buildingNeed: "marketplace",
    cTonsPerSecond: null,
    housesPerTonMin: null,
    influx: 5,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "farmer-fish",
    kind: "basic",
    wikiId: "Fish",
    nameEs: "Pescado",
    good: "fish",
    cTonsPerSecond: 0.0004166667,
    housesPerTonMin: 40,
    influx: 3,
    happiness: null,
    unlockInhabitants: 50,
  },
  {
    id: "farmer-clothes",
    kind: "basic",
    wikiId: "Work Clothes",
    nameEs: "Ropa de trabajo",
    good: "work-clothes",
    cTonsPerSecond: 0.000512821,
    housesPerTonMin: 32.5,
    influx: 2,
    happiness: null,
    unlockInhabitants: 100,
  },
  {
    id: "farmer-schnapps",
    kind: "luxury",
    wikiId: "Schnapps",
    nameEs: "Schnapps",
    good: "schnapps",
    cTonsPerSecond: 0.000555556,
    housesPerTonMin: 30,
    influx: null,
    happiness: 8,
    unlockInhabitants: 100,
  },
  {
    id: "farmer-pub",
    kind: "building",
    wikiId: "Pub",
    nameEs: "Taberna",
    good: null,
    buildingNeed: undefined,
    cTonsPerSecond: null,
    housesPerTonMin: null,
    influx: null,
    happiness: 12,
    unlockInhabitants: 150,
  },
];

export const WORKER_NEEDS: readonly ResidenceNeed[] = [
  {
    id: "worker-market",
    kind: "building",
    wikiId: "Marketplace",
    nameEs: "Mercado",
    good: null,
    buildingNeed: "marketplace",
    cTonsPerSecond: null,
    housesPerTonMin: null,
    influx: 5,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "worker-fish",
    kind: "basic",
    wikiId: "Fish",
    nameEs: "Pescado",
    good: "fish",
    cTonsPerSecond: 0.0008333334,
    housesPerTonMin: 20,
    influx: 3,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "worker-clothes",
    kind: "basic",
    wikiId: "Work Clothes",
    nameEs: "Ropa de trabajo",
    good: "work-clothes",
    cTonsPerSecond: 0.001025642,
    housesPerTonMin: 16.25,
    influx: 2,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "worker-sausages",
    kind: "basic",
    wikiId: "Sausages",
    nameEs: "Salchichas",
    good: "sausages",
    cTonsPerSecond: 0.000333334,
    housesPerTonMin: 50,
    influx: 3,
    happiness: null,
    unlockInhabitants: 1,
  },
  {
    id: "worker-bread",
    kind: "basic",
    wikiId: "Bread",
    nameEs: "Pan",
    good: "bread",
    cTonsPerSecond: 0.00030303,
    housesPerTonMin: 55,
    influx: 3,
    happiness: null,
    unlockInhabitants: 150,
  },
  {
    id: "worker-soap",
    kind: "basic",
    wikiId: "Soap",
    nameEs: "Jabón",
    good: "soap",
    cTonsPerSecond: 0.000138889,
    housesPerTonMin: 120,
    influx: 2,
    happiness: null,
    unlockInhabitants: 300,
  },
  {
    id: "worker-school",
    kind: "building",
    wikiId: "School",
    nameEs: "Escuela",
    good: null,
    cTonsPerSecond: null,
    housesPerTonMin: null,
    influx: 2,
    happiness: null,
    unlockInhabitants: 750,
  },
  {
    id: "worker-schnapps",
    kind: "luxury",
    wikiId: "Schnapps",
    nameEs: "Schnapps",
    good: "schnapps",
    cTonsPerSecond: 0.001111112,
    housesPerTonMin: 15,
    influx: null,
    happiness: 4,
    unlockInhabitants: null,
  },
  {
    id: "worker-pub",
    kind: "building",
    wikiId: "Pub",
    nameEs: "Taberna",
    good: null,
    cTonsPerSecond: null,
    housesPerTonMin: null,
    influx: null,
    happiness: 6,
    unlockInhabitants: null,
  },
  {
    id: "worker-church",
    kind: "building",
    wikiId: "Church",
    nameEs: "Iglesia",
    good: null,
    cTonsPerSecond: null,
    housesPerTonMin: null,
    influx: null,
    happiness: 7,
    unlockInhabitants: 150,
  },
  {
    id: "worker-beer",
    kind: "luxury",
    wikiId: "Beer",
    nameEs: "Cerveza",
    good: "beer",
    cTonsPerSecond: 0.00025641,
    housesPerTonMin: 65,
    influx: null,
    happiness: 3,
    unlockInhabitants: 500,
  },
];

/** Goods C from the prompt / Needs wiki. Building-range influx not copied this pass. */
export const ARTISAN_NEEDS: readonly ResidenceNeed[] = [
  {
    id: "artisan-sausages",
    kind: "basic",
    wikiId: "Sausages",
    nameEs: "Salchichas",
    good: "sausages",
    cTonsPerSecond: 0.000666667,
    housesPerTonMin: 25,
    influx: null,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "artisan-bread",
    kind: "basic",
    wikiId: "Bread",
    nameEs: "Pan",
    good: "bread",
    cTonsPerSecond: 0.000606061,
    housesPerTonMin: 27.5,
    influx: null,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "artisan-soap",
    kind: "basic",
    wikiId: "Soap",
    nameEs: "Jabón",
    good: "soap",
    cTonsPerSecond: 0.000277778,
    housesPerTonMin: 60,
    influx: null,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "artisan-canned",
    kind: "basic",
    wikiId: "Canned Food",
    nameEs: "Comida enlatada",
    good: "canned-food",
    cTonsPerSecond: 0.00017094,
    housesPerTonMin: 97.5,
    influx: null,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "artisan-sewing",
    kind: "basic",
    wikiId: "Sewing Machines",
    nameEs: "Máquinas de coser",
    good: "sewing-machines",
    cTonsPerSecond: 0.00047619,
    housesPerTonMin: 35,
    influx: null,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "artisan-fur",
    kind: "basic",
    wikiId: "Fur Coats",
    nameEs: "Abrigos de piel",
    good: "fur-coats",
    cTonsPerSecond: 0.000444444,
    housesPerTonMin: 37.5,
    influx: null,
    happiness: null,
    unlockInhabitants: null,
  },
];

export const ENGINEER_NEEDS: readonly ResidenceNeed[] = [
  {
    id: "engineer-canned",
    kind: "basic",
    wikiId: "Canned Food",
    nameEs: "Comida enlatada",
    good: "canned-food",
    cTonsPerSecond: 0.00034188,
    housesPerTonMin: 48.75,
    influx: null,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "engineer-sewing",
    kind: "basic",
    wikiId: "Sewing Machines",
    nameEs: "Máquinas de coser",
    good: "sewing-machines",
    cTonsPerSecond: 0.000952381,
    housesPerTonMin: 17.5,
    influx: null,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "engineer-fur",
    kind: "basic",
    wikiId: "Fur Coats",
    nameEs: "Abrigos de piel",
    good: "fur-coats",
    cTonsPerSecond: 0.000888889,
    housesPerTonMin: 18.75,
    influx: null,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "engineer-glasses",
    kind: "basic",
    wikiId: "Glasses",
    nameEs: "Anteojos",
    good: "glasses",
    cTonsPerSecond: 0.000148148,
    housesPerTonMin: 112.5,
    influx: null,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "engineer-coffee",
    kind: "basic",
    wikiId: "Coffee",
    nameEs: "Café",
    good: "coffee",
    cTonsPerSecond: 0.000784314,
    housesPerTonMin: 21.25,
    influx: null,
    happiness: null,
    unlockInhabitants: null,
  },
];

/** Investor goods C not copied this pass (cap. 1–2). Capacity is 50. */
export const INVESTOR_NEEDS: readonly ResidenceNeed[] = [];

export const JORNALERO_NEEDS: readonly ResidenceNeed[] = [
  {
    id: "jornalero-market",
    kind: "building",
    wikiId: "Marketplace",
    nameEs: "Mercado",
    good: null,
    buildingNeed: "marketplace",
    cTonsPerSecond: null,
    housesPerTonMin: null,
    influx: 5,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "jornalero-plantains",
    kind: "basic",
    wikiId: "Fried Plantains",
    nameEs: "Plátanos fritos",
    good: "fried-plantains",
    cTonsPerSecond: 0.00047619,
    housesPerTonMin: 35,
    influx: 3,
    happiness: null,
    unlockInhabitants: 50,
  },
  {
    id: "jornalero-ponchos",
    kind: "basic",
    wikiId: "Ponchos",
    nameEs: "Ponchos",
    good: "ponchos",
    cTonsPerSecond: 0.000416667,
    housesPerTonMin: 40,
    influx: 2,
    happiness: null,
    unlockInhabitants: 200,
  },
  {
    id: "jornalero-rum",
    kind: "luxury",
    wikiId: "Rum",
    nameEs: "Ron",
    good: "rum",
    cTonsPerSecond: 0.000238095,
    housesPerTonMin: 70,
    influx: null,
    happiness: 6,
    unlockInhabitants: 100,
  },
  {
    id: "jornalero-chapel",
    kind: "building",
    wikiId: "Chapel",
    nameEs: "Capilla",
    good: null,
    cTonsPerSecond: null,
    housesPerTonMin: null,
    influx: null,
    happiness: 14,
    unlockInhabitants: 300,
  },
];

export const OBRERO_NEEDS: readonly ResidenceNeed[] = [
  {
    id: "obrero-market",
    kind: "building",
    wikiId: "Marketplace",
    nameEs: "Mercado",
    good: null,
    buildingNeed: "marketplace",
    cTonsPerSecond: null,
    housesPerTonMin: null,
    influx: 5,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "obrero-plantains",
    kind: "basic",
    wikiId: "Fried Plantains",
    nameEs: "Plátanos fritos",
    good: "fried-plantains",
    cTonsPerSecond: 0.000952381,
    housesPerTonMin: 17.5,
    influx: 3,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "obrero-ponchos",
    kind: "basic",
    wikiId: "Ponchos",
    nameEs: "Ponchos",
    good: "ponchos",
    cTonsPerSecond: 0.000833333,
    housesPerTonMin: 20,
    influx: 2,
    happiness: null,
    unlockInhabitants: null,
  },
  {
    id: "obrero-tortillas",
    kind: "basic",
    wikiId: "Tortillas",
    nameEs: "Tortillas",
    good: "tortillas",
    cTonsPerSecond: 0.00047619,
    housesPerTonMin: 35,
    influx: 4,
    happiness: null,
    unlockInhabitants: 1,
  },
  {
    id: "obrero-coffee",
    kind: "basic",
    wikiId: "Coffee",
    nameEs: "Café",
    good: "coffee",
    cTonsPerSecond: 0.000196079,
    housesPerTonMin: 85,
    influx: 2,
    happiness: null,
    unlockInhabitants: 300,
  },
  {
    id: "obrero-bowler",
    kind: "basic",
    wikiId: "Bowler Hats",
    nameEs: "Bombines",
    good: "bowler-hats",
    cTonsPerSecond: 0.000444444,
    housesPerTonMin: 37.5,
    influx: 2,
    happiness: null,
    unlockInhabitants: 600,
  },
];

export const RESIDENCE_NEEDS: Record<PopulationTier, readonly ResidenceNeed[]> = {
  farmer: FARMER_NEEDS,
  worker: WORKER_NEEDS,
  artisan: ARTISAN_NEEDS,
  engineer: ENGINEER_NEEDS,
  investor: INVESTOR_NEEDS,
  jornalero: JORNALERO_NEEDS,
  obrero: OBRERO_NEEDS,
};

export function needsFor(tier: PopulationTier): readonly ResidenceNeed[] {
  return RESIDENCE_NEEDS[tier];
}

export function goodNeed(
  tier: PopulationTier,
  good: GoodId,
): ResidenceNeed | undefined {
  return RESIDENCE_NEEDS[tier].find((row) => row.good === good);
}
