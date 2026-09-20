/**
 * Sourced catalog figures for Stage 3 scenarios.
 * Every number has unit, wiki source and DLC/modifier coverage.
 * Missing stays null — never filled with 0.
 *
 * Wiki (CC-BY-SA): https://anno1800.fandom.com/wiki/Production_chains
 * Per-building infoboxes: Lumberjack's Hut, Sawmill, Fishery, Potato Farm, …
 * Coverage is base game, 100% productivity, no electricity, no items, no newspaper.
 */

import { BUILDINGS } from "./chains.ts";
import { GOOD_NAME_ES } from "./goods.ts";
import type { BuildingId, GoodId, PopulationTier, World } from "./types.ts";

export const CATALOG_FIGURES_VERSION = "wiki-v1-2026-09" as const;
export const CHAINS_WIKI = "https://anno1800.fandom.com/wiki/Production_chains" as const;
export const PRODUCTION_WIKI = "https://anno1800.fandom.com/wiki/Production" as const;

export type CatalogDlc = "base";
export type CatalogModifiers = "no-electricity-no-items";

export type CatalogCoverage = {
  dlc: CatalogDlc;
  modifiers: CatalogModifiers;
};

export type CatalogSource = {
  url: string;
  kind: "wiki-cc-by-sa";
};

export type CatalogFigure<T> = {
  value: T;
  unit: string;
  source: CatalogSource;
  coverage: CatalogCoverage;
};

export const BASE_COVERAGE: CatalogCoverage = {
  dlc: "base",
  modifiers: "no-electricity-no-items",
};

function wiki(url: string): CatalogSource {
  return { url, kind: "wiki-cc-by-sa" };
}

function figure<T>(value: T, unit: string, url: string): CatalogFigure<T> {
  return { value, unit, source: wiki(url), coverage: BASE_COVERAGE };
}

/** Live / save stock ids → catalog GoodId. GUID 1010196 is Timber, stored as `wood`. */
export const LIVE_GOOD_TO_CATALOG: Record<string, GoodId> = {
  wood: "timber",
  "wood-log": "wood",
  clothes: "work-clothes",
  sausage: "sausages",
  bread: "bread",
  fish: "fish",
  potato: "potato",
  schnapps: "schnapps",
  wool: "wool",
  pigs: "pigs",
  grain: "grain",
  soap: "soap",
  steel: "steel",
  sails: "sails",
  timber: "timber",
  "work-clothes": "work-clothes",
  sausages: "sausages",
};

/** Watcher building ids that do not match BuildingId 1:1. */
export const LIVE_BUILDING_TO_CATALOG: Record<string, BuildingId> = {
  bread: "grain",
  sausage: "pig",
};

export type FertilityId = "potato" | "grain" | "plantain" | "sugar-cane";
export type ResourceId = "clay" | "iron" | "coal" | "coastline" | "forest";

export type BuildingSiteNeed = {
  fertility: FertilityId | null;
  resource: ResourceId | null;
  source: CatalogSource;
  coverage: CatalogCoverage;
};

const hut = "https://anno1800.fandom.com/wiki/Lumberjack%27s_Hut";
const sawmillPage = "https://anno1800.fandom.com/wiki/Sawmill";
const fisheryPage = "https://anno1800.fandom.com/wiki/Fishery";
const potatoPage = "https://anno1800.fandom.com/wiki/Potato_Farm";
const grainPage = "https://anno1800.fandom.com/wiki/Grain_Farm";
const clayPage = "https://anno1800.fandom.com/wiki/Clay_Pit";
const ironPage = "https://anno1800.fandom.com/wiki/Iron_Mine";
const charcoalPage = "https://anno1800.fandom.com/wiki/Charcoal_Kiln";
const plantainPage = "https://anno1800.fandom.com/wiki/Plantain_Plantation";
const sugarPage = "https://anno1800.fandom.com/wiki/Sugar_Cane_Plantation";
const fishOilPage = "https://anno1800.fandom.com/wiki/Fish_Oil_Factory";
const sheepPage = "https://anno1800.fandom.com/wiki/Sheep_Farm";
const pigPage = "https://anno1800.fandom.com/wiki/Pig_Farm";
const alpacaPage = "https://anno1800.fandom.com/wiki/Alpaca_Farm";

/**
 * Site constraints. `null` fertility/resource = wiki lists none (known).
 * Omitted buildings stay unknown — do not assume they need nothing.
 */
export const BUILDING_SITE: Partial<Record<BuildingId, BuildingSiteNeed>> = {
  lumberjack: { fertility: null, resource: "forest", source: wiki(hut), coverage: BASE_COVERAGE },
  sawmill: { fertility: null, resource: null, source: wiki(sawmillPage), coverage: BASE_COVERAGE },
  fishery: { fertility: null, resource: "coastline", source: wiki(fisheryPage), coverage: BASE_COVERAGE },
  sheep: { fertility: null, resource: null, source: wiki(sheepPage), coverage: BASE_COVERAGE },
  knitters: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Framework_Knitters"),
    coverage: BASE_COVERAGE,
  },
  potato: { fertility: "potato", resource: null, source: wiki(potatoPage), coverage: BASE_COVERAGE },
  distillery: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Schnapps_Distillery"),
    coverage: BASE_COVERAGE,
  },
  pig: { fertility: null, resource: null, source: wiki(pigPage), coverage: BASE_COVERAGE },
  slaughterhouse: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Slaughterhouse"),
    coverage: BASE_COVERAGE,
  },
  grain: { fertility: "grain", resource: null, source: wiki(grainPage), coverage: BASE_COVERAGE },
  mill: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Flour_Mill"),
    coverage: BASE_COVERAGE,
  },
  bakery: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Bakery"),
    coverage: BASE_COVERAGE,
  },
  clay: { fertility: null, resource: "clay", source: wiki(clayPage), coverage: BASE_COVERAGE },
  brick: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Brick_Factory"),
    coverage: BASE_COVERAGE,
  },
  "iron-mine": { fertility: null, resource: "iron", source: wiki(ironPage), coverage: BASE_COVERAGE },
  charcoal: { fertility: null, resource: "forest", source: wiki(charcoalPage), coverage: BASE_COVERAGE },
  furnace: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Furnace"),
    coverage: BASE_COVERAGE,
  },
  steelworks: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Steelworks"),
    coverage: BASE_COVERAGE,
  },
  rendering: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Rendering_Works"),
    coverage: BASE_COVERAGE,
  },
  soap: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Soap_Factory"),
    coverage: BASE_COVERAGE,
  },
  sails: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Sailmakers"),
    coverage: BASE_COVERAGE,
  },
  weapons: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Weapon_Factory"),
    coverage: BASE_COVERAGE,
  },
  plantain: { fertility: "plantain", resource: null, source: wiki(plantainPage), coverage: BASE_COVERAGE },
  "fish-oil": { fertility: null, resource: "coastline", source: wiki(fishOilPage), coverage: BASE_COVERAGE },
  kitchen: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Fried_Plantain_Kitchen"),
    coverage: BASE_COVERAGE,
  },
  alpaca: { fertility: null, resource: null, source: wiki(alpacaPage), coverage: BASE_COVERAGE },
  poncho: {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Poncho_Darner"),
    coverage: BASE_COVERAGE,
  },
  "sugar-cane": { fertility: "sugar-cane", resource: null, source: wiki(sugarPage), coverage: BASE_COVERAGE },
  "rum-distillery": {
    fertility: null,
    resource: null,
    source: wiki("https://anno1800.fandom.com/wiki/Rum_Distillery"),
    coverage: BASE_COVERAGE,
  },
};

export type ConstructionMaterials = {
  coins: CatalogFigure<number> | null;
  timber: CatalogFigure<number> | null;
  bricks: CatalogFigure<number> | null;
  steelBeams: CatalogFigure<number> | null;
};

/** Wiki perfect-ratio construction. Campaign subsets cannot use this total. */
export const CHAIN_CONSTRUCTION: Partial<
  Record<GoodId, Partial<Record<World, ConstructionMaterials>>>
> = {
  timber: {
    old: {
      coins: figure(200, "credits", CHAINS_WIKI),
      timber: null,
      bricks: null,
      steelBeams: null,
    },
    new: {
      coins: figure(1000, "credits", `${CHAINS_WIKI}#Timber_2`),
      timber: null,
      bricks: null,
      steelBeams: null,
    },
  },
  fish: {
    old: {
      coins: figure(100, "credits", CHAINS_WIKI),
      timber: figure(2, "t", CHAINS_WIKI),
      bricks: null,
      steelBeams: null,
    },
  },
  schnapps: {
    old: {
      coins: figure(272, "credits", CHAINS_WIKI),
      timber: figure(4, "t", CHAINS_WIKI),
      bricks: null,
      steelBeams: null,
    },
  },
  "work-clothes": {
    old: {
      coins: figure(245, "credits", CHAINS_WIKI),
      timber: figure(4, "t", CHAINS_WIKI),
      bricks: null,
      steelBeams: null,
    },
  },
  bricks: {
    old: {
      coins: figure(1500, "credits", CHAINS_WIKI),
      timber: figure(20, "t", CHAINS_WIKI),
      bricks: null,
      steelBeams: null,
    },
  },
  sausages: {
    old: {
      coins: figure(1125, "credits", CHAINS_WIKI),
      timber: figure(8, "t", CHAINS_WIKI),
      bricks: figure(5, "t", CHAINS_WIKI),
      steelBeams: null,
    },
  },
  bread: {
    old: {
      coins: figure(4940, "credits", CHAINS_WIKI),
      timber: figure(20, "t", CHAINS_WIKI),
      bricks: figure(15, "t", CHAINS_WIKI),
      steelBeams: null,
    },
  },
  sails: {
    old: {
      coins: figure(645, "credits", CHAINS_WIKI),
      timber: figure(10, "t", CHAINS_WIKI),
      bricks: figure(10, "t", CHAINS_WIKI),
      steelBeams: null,
    },
  },
  "steel-beams": {
    old: {
      coins: figure(5800, "credits", CHAINS_WIKI),
      timber: figure(44, "t", CHAINS_WIKI),
      bricks: figure(45, "t", CHAINS_WIKI),
      steelBeams: null,
    },
  },
  soap: {
    old: {
      coins: figure(2750, "credits", CHAINS_WIKI),
      timber: figure(20, "t", CHAINS_WIKI),
      bricks: figure(15, "t", CHAINS_WIKI),
      steelBeams: figure(12, "t", CHAINS_WIKI),
    },
  },
  weapons: {
    old: {
      coins: figure(5500, "credits", CHAINS_WIKI),
      timber: figure(76, "t", CHAINS_WIKI),
      bricks: figure(85, "t", CHAINS_WIKI),
      steelBeams: figure(48, "t", CHAINS_WIKI),
    },
  },
  "fried-plantains": {
    new: {
      coins: figure(2780, "credits", `${CHAINS_WIKI}#Fried_Plantains`),
      timber: figure(14, "t", `${CHAINS_WIKI}#Fried_Plantains`),
      bricks: null,
      steelBeams: null,
    },
  },
  ponchos: {
    new: {
      coins: figure(1060, "credits", `${CHAINS_WIKI}#Ponchos`),
      timber: figure(12, "t", `${CHAINS_WIKI}#Ponchos`),
      bricks: null,
      steelBeams: null,
    },
  },
  rum: {
    new: {
      coins: figure(3780, "credits", `${CHAINS_WIKI}#Rum`),
      timber: figure(24, "t", `${CHAINS_WIKI}#Rum`),
      bricks: null,
      steelBeams: null,
    },
  },
};

/** Per-building construction when the wiki infobox (or 1-building chain) is unique. Old World. */
export const BUILDING_CONSTRUCTION: Partial<Record<BuildingId, ConstructionMaterials>> = {
  lumberjack: {
    coins: figure(100, "credits", hut),
    timber: null,
    bricks: null,
    steelBeams: null,
  },
  sawmill: {
    coins: figure(100, "credits", sawmillPage),
    timber: null,
    bricks: null,
    steelBeams: null,
  },
  fishery: {
    coins: figure(100, "credits", CHAINS_WIKI),
    timber: figure(2, "t", CHAINS_WIKI),
    bricks: null,
    steelBeams: null,
  },
};

export const BUILDING_WORKFORCE_FIGURE: Partial<
  Record<BuildingId, CatalogFigure<Partial<Record<PopulationTier, number>>>>
> = {
  lumberjack: figure({ farmer: 5 }, "workforce", hut),
  sawmill: figure({ farmer: 10 }, "workforce", sawmillPage),
  fishery: figure({ farmer: 25 }, "workforce", fisheryPage),
};

export const BUILDING_MAINTENANCE_FIGURE: Partial<Record<BuildingId, CatalogFigure<number>>> = {
  lumberjack: figure(-10, "credits/min", hut),
  sawmill: figure(-10, "credits/min", sawmillPage),
  fishery: figure(-40, "credits/min", fisheryPage),
};

export function liveGoodToCatalog(id: string | undefined | null): GoodId | null {
  if (!id) return null;
  const mapped = LIVE_GOOD_TO_CATALOG[id] ?? (id as GoodId);
  return mapped in GOOD_NAME_ES ? mapped : null;
}

export function liveBuildingToCatalog(id: string | undefined | null): BuildingId | null {
  if (!id) return null;
  const mapped = LIVE_BUILDING_TO_CATALOG[id] ?? id;
  return mapped in BUILDINGS ? (mapped as BuildingId) : null;
}

export function chainConstruction(good: GoodId, world: World): ConstructionMaterials | null {
  return CHAIN_CONSTRUCTION[good]?.[world] ?? null;
}

export function catalogGoodIds(): GoodId[] {
  return Object.keys(GOOD_NAME_ES) as GoodId[];
}
