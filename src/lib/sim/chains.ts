/**
 * Early/mid campaign production. Source:
 * https://anno1800.fandom.com/wiki/Production_chains
 * https://anno1800.fandom.com/wiki/Production
 *
 * At 100% without electricity: t/min = 1 / cycle_min.
 * 1 t input = 1 t output. Perfect ratio equalizes t/min of each link.
 *
 * Campaign ≠ perfect. Cap. 1–2 steel is one of each, not the wiki 3 steelworks.
 * Maintenance is charged even if the building is zzz.
 */

import type { BuildingId, GoodId, PopulationTier, SimMode } from "./types.ts";

export const CHAINS_WIKI = "https://anno1800.fandom.com/wiki/Production_chains" as const;
export const PRODUCTION_WIKI = "https://anno1800.fandom.com/wiki/Production" as const;

export type WorkforceRow = Partial<Record<PopulationTier, number>>;

export type ProductionBuilding = {
  id: BuildingId;
  wikiId: string;
  nameEs: string;
  output: GoodId;
  inputs: readonly GoodId[];
  /** Minutes per 1 t at 100%, no electricity. t/min = 1 / cycleMin. */
  cycleMin: number;
  wikiUrl: string;
  /** Credits/min. Null if the wiki page infobox was not copied this pass. */
  maintenance: number | null;
  /** Null if the wiki page infobox was not copied this pass. */
  workforce: WorkforceRow | null;
};

export type ChainLink = {
  buildingId: BuildingId;
  count: number;
};

export type ProductionChain = {
  id: string;
  good: GoodId;
  titleEs: string;
  wikiUrl: string;
  /** Credits/min for the wiki ratio set (usually `perfect`). */
  maintenance: number | null;
  workforce: WorkforceRow | null;
  perfect: readonly ChainLink[];
  campaign: readonly ChainLink[];
  /**
   * Residences supplied by the *perfect* output t/min, wiki "Supplies".
   * Null for construction goods.
   */
  supplies: WorkforceRow | null;
};

function tMinAt100(cycleMin: number): number {
  return 1 / cycleMin;
}

export const BUILDINGS: Record<string, ProductionBuilding> = {
  lumberjack: {
    id: "lumberjack",
    wikiId: "Lumberjack's Hut",
    nameEs: "Cabaña de leñador",
    output: "wood",
    inputs: [],
    cycleMin: 0.25,
    wikiUrl: "https://anno1800.fandom.com/wiki/Lumberjack%27s_Hut",
    maintenance: null,
    workforce: null,
  },
  sawmill: {
    id: "sawmill",
    wikiId: "Sawmill",
    nameEs: "Aserradero",
    output: "timber",
    inputs: ["wood"],
    cycleMin: 0.25,
    wikiUrl: "https://anno1800.fandom.com/wiki/Sawmill",
    maintenance: null,
    workforce: null,
  },
  fishery: {
    id: "fishery",
    wikiId: "Fishery",
    nameEs: "Pescadería",
    output: "fish",
    inputs: [],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Fishery",
    maintenance: -40,
    workforce: { farmer: 25 },
  },
  sheep: {
    id: "sheep",
    wikiId: "Sheep Farm",
    nameEs: "Granja de ovejas",
    output: "wool",
    inputs: [],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Sheep_Farm",
    maintenance: null,
    workforce: null,
  },
  knitters: {
    id: "knitters",
    wikiId: "Framework Knitters",
    nameEs: "Telares",
    output: "work-clothes",
    inputs: ["wool"],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Framework_Knitters",
    maintenance: null,
    workforce: null,
  },
  potato: {
    id: "potato",
    wikiId: "Potato Farm",
    nameEs: "Granja de papas",
    output: "potato",
    inputs: [],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Potato_Farm",
    maintenance: null,
    workforce: null,
  },
  distillery: {
    id: "distillery",
    wikiId: "Schnapps Distillery",
    nameEs: "Destilería de Schnapps",
    output: "schnapps",
    inputs: ["potato"],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Schnapps_Distillery",
    maintenance: null,
    workforce: null,
  },
  pig: {
    id: "pig",
    wikiId: "Pig Farm",
    nameEs: "Granja de cerdos",
    output: "pigs",
    inputs: [],
    cycleMin: 1,
    wikiUrl: "https://anno1800.fandom.com/wiki/Pig_Farm",
    maintenance: null,
    workforce: null,
  },
  slaughterhouse: {
    id: "slaughterhouse",
    wikiId: "Slaughterhouse",
    nameEs: "Matadero",
    output: "sausages",
    inputs: ["pigs"],
    cycleMin: 1,
    wikiUrl: "https://anno1800.fandom.com/wiki/Slaughterhouse",
    maintenance: null,
    workforce: null,
  },
  grain: {
    id: "grain",
    wikiId: "Grain Farm",
    nameEs: "Granja de trigo",
    output: "grain",
    inputs: [],
    cycleMin: 1,
    wikiUrl: "https://anno1800.fandom.com/wiki/Grain_Farm",
    maintenance: null,
    workforce: null,
  },
  mill: {
    id: "mill",
    wikiId: "Flour Mill",
    nameEs: "Molino",
    output: "flour",
    inputs: ["grain"],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Flour_Mill",
    maintenance: null,
    workforce: null,
  },
  bakery: {
    id: "bakery",
    wikiId: "Bakery",
    nameEs: "Panadería",
    output: "bread",
    inputs: ["flour"],
    cycleMin: 1,
    wikiUrl: "https://anno1800.fandom.com/wiki/Bakery",
    maintenance: null,
    workforce: null,
  },
  clay: {
    id: "clay",
    wikiId: "Clay Pit",
    nameEs: "Fosa de arcilla",
    output: "clay",
    inputs: [],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Clay_Pit",
    maintenance: null,
    workforce: null,
  },
  brick: {
    id: "brick",
    wikiId: "Brick Factory",
    nameEs: "Ladrillera",
    output: "bricks",
    inputs: ["clay"],
    cycleMin: 1,
    wikiUrl: "https://anno1800.fandom.com/wiki/Brick_Factory",
    maintenance: null,
    workforce: null,
  },
  "iron-mine": {
    id: "iron-mine",
    wikiId: "Iron Mine",
    nameEs: "Mina de hierro",
    output: "iron",
    inputs: [],
    cycleMin: 0.25,
    wikiUrl: "https://anno1800.fandom.com/wiki/Iron_Mine",
    maintenance: null,
    workforce: null,
  },
  charcoal: {
    id: "charcoal",
    wikiId: "Charcoal Kiln",
    nameEs: "Carbonera",
    output: "coal",
    inputs: [],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Charcoal_Kiln",
    maintenance: null,
    workforce: null,
  },
  furnace: {
    id: "furnace",
    wikiId: "Furnace",
    nameEs: "Fundición",
    output: "steel",
    inputs: ["iron", "coal"],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Furnace",
    maintenance: null,
    workforce: null,
  },
  steelworks: {
    id: "steelworks",
    wikiId: "Steelworks",
    nameEs: "Acería",
    output: "steel-beams",
    inputs: ["steel"],
    cycleMin: 0.75,
    wikiUrl: "https://anno1800.fandom.com/wiki/Steelworks",
    maintenance: null,
    workforce: null,
  },
  rendering: {
    id: "rendering",
    wikiId: "Rendering Works",
    nameEs: "Fundición de sebo",
    output: "tallow",
    inputs: ["pigs"],
    cycleMin: 1,
    wikiUrl: "https://anno1800.fandom.com/wiki/Rendering_Works",
    maintenance: null,
    workforce: null,
  },
  soap: {
    id: "soap",
    wikiId: "Soap Factory",
    nameEs: "Fábrica de jabón",
    output: "soap",
    inputs: ["tallow"],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Soap_Factory",
    maintenance: null,
    workforce: null,
  },
  sails: {
    id: "sails",
    wikiId: "Sailmakers",
    nameEs: "Fábrica de velas",
    output: "sails",
    inputs: ["wool"],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Sailmakers",
    maintenance: null,
    workforce: null,
  },
  weapons: {
    id: "weapons",
    wikiId: "Weapon Factory",
    nameEs: "Fábrica de armas",
    output: "weapons",
    inputs: ["steel"],
    cycleMin: 1.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Weapon_Factory",
    maintenance: null,
    workforce: null,
  },
  plantain: {
    id: "plantain",
    wikiId: "Plantain Plantation",
    nameEs: "Plantación de plátanos",
    output: "plantains",
    inputs: [],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Plantain_Plantation",
    maintenance: null,
    workforce: null,
  },
  "fish-oil": {
    id: "fish-oil",
    wikiId: "Fish Oil Factory",
    nameEs: "Fábrica de aceite de pescado",
    output: "fish-oil",
    inputs: [],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Fish_Oil_Factory",
    maintenance: null,
    workforce: null,
  },
  kitchen: {
    id: "kitchen",
    wikiId: "Fried Plantain Kitchen",
    nameEs: "Cocina de plátanos",
    output: "fried-plantains",
    inputs: ["plantains", "fish-oil"],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Fried_Plantain_Kitchen",
    maintenance: null,
    workforce: null,
  },
  alpaca: {
    id: "alpaca",
    wikiId: "Alpaca Farm",
    nameEs: "Granja de alpacas",
    output: "alpaca-wool",
    inputs: [],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Alpaca_Farm",
    maintenance: null,
    workforce: null,
  },
  poncho: {
    id: "poncho",
    wikiId: "Poncho Darner",
    nameEs: "Taller de ponchos",
    output: "ponchos",
    inputs: ["alpaca-wool"],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Poncho_Darner",
    maintenance: null,
    workforce: null,
  },
  "sugar-cane": {
    id: "sugar-cane",
    wikiId: "Sugar Cane Plantation",
    nameEs: "Plantación de caña",
    output: "sugar-cane",
    inputs: [],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Sugar_Cane_Plantation",
    maintenance: null,
    workforce: null,
  },
  "rum-distillery": {
    id: "rum-distillery",
    wikiId: "Rum Distillery",
    nameEs: "Destilería de ron",
    output: "rum",
    inputs: ["wood", "sugar-cane"],
    cycleMin: 0.5,
    wikiUrl: "https://anno1800.fandom.com/wiki/Rum_Distillery",
    maintenance: null,
    workforce: null,
  },
};

export function buildingById(id: BuildingId): ProductionBuilding | undefined {
  return BUILDINGS[id];
}

export function outputTMinAt100(building: ProductionBuilding, count: number, productivity = 100): number {
  return count * tMinAt100(building.cycleMin) * (productivity / 100);
}

export const CHAINS: readonly ProductionChain[] = [
  {
    id: "timber",
    good: "timber",
    titleEs: "Tablones",
    wikiUrl: `${CHAINS_WIKI}#Timber`,
    maintenance: -20,
    workforce: { farmer: 15 },
    perfect: [
      { buildingId: "lumberjack", count: 1 },
      { buildingId: "sawmill", count: 1 },
    ],
    campaign: [
      { buildingId: "lumberjack", count: 1 },
      { buildingId: "sawmill", count: 1 },
    ],
    supplies: null,
  },
  {
    id: "fish",
    good: "fish",
    titleEs: "Pescado",
    wikiUrl: `${CHAINS_WIKI}#Fish`,
    maintenance: -40,
    workforce: { farmer: 25 },
    perfect: [{ buildingId: "fishery", count: 1 }],
    campaign: [{ buildingId: "fishery", count: 1 }],
    supplies: { farmer: 80, worker: 40 },
  },
  {
    id: "work-clothes",
    good: "work-clothes",
    titleEs: "Ropa de trabajo",
    wikiUrl: `${CHAINS_WIKI}#Work_Clothes`,
    maintenance: -70,
    workforce: { farmer: 60 },
    perfect: [
      { buildingId: "sheep", count: 1 },
      { buildingId: "knitters", count: 1 },
    ],
    campaign: [
      { buildingId: "sheep", count: 1 },
      { buildingId: "knitters", count: 1 },
    ],
    supplies: { farmer: 65, worker: 32.5 },
  },
  {
    id: "schnapps",
    good: "schnapps",
    titleEs: "Schnapps",
    wikiUrl: `${CHAINS_WIKI}#Schnapps`,
    maintenance: -60,
    workforce: { farmer: 70 },
    perfect: [
      { buildingId: "potato", count: 1 },
      { buildingId: "distillery", count: 1 },
    ],
    campaign: [
      { buildingId: "potato", count: 1 },
      { buildingId: "distillery", count: 1 },
    ],
    supplies: { farmer: 60, worker: 30 },
  },
  {
    id: "sausages",
    good: "sausages",
    titleEs: "Salchichas",
    wikiUrl: `${CHAINS_WIKI}#Sausages`,
    maintenance: -120,
    workforce: { farmer: 30, worker: 50 },
    perfect: [
      { buildingId: "pig", count: 1 },
      { buildingId: "slaughterhouse", count: 1 },
    ],
    campaign: [
      { buildingId: "pig", count: 1 },
      { buildingId: "slaughterhouse", count: 1 },
    ],
    supplies: { worker: 50, artisan: 25 },
  },
  {
    id: "bread",
    good: "bread",
    titleEs: "Pan",
    wikiUrl: `${CHAINS_WIKI}#Bread`,
    maintenance: -210,
    workforce: { farmer: 50, worker: 100 },
    perfect: [
      { buildingId: "grain", count: 2 },
      { buildingId: "mill", count: 1 },
      { buildingId: "bakery", count: 2 },
    ],
    campaign: [
      { buildingId: "grain", count: 1 },
      { buildingId: "mill", count: 1 },
      { buildingId: "bakery", count: 1 },
    ],
    supplies: { worker: 110, artisan: 55 },
  },
  {
    id: "bricks",
    good: "bricks",
    titleEs: "Ladrillos",
    wikiUrl: `${CHAINS_WIKI}#Bricks`,
    maintenance: -50,
    workforce: { worker: 100 },
    perfect: [
      { buildingId: "clay", count: 1 },
      { buildingId: "brick", count: 2 },
    ],
    campaign: [
      { buildingId: "clay", count: 1 },
      { buildingId: "brick", count: 1 },
    ],
    supplies: null,
  },
  {
    id: "steel-beams",
    good: "steel-beams",
    titleEs: "Vigas de acero",
    wikiUrl: `${CHAINS_WIKI}#Steel_Beams`,
    maintenance: -890,
    workforce: { worker: 870 },
    perfect: [
      { buildingId: "iron-mine", count: 1 },
      { buildingId: "charcoal", count: 2 },
      { buildingId: "furnace", count: 2 },
      { buildingId: "steelworks", count: 3 },
    ],
    campaign: [
      { buildingId: "iron-mine", count: 1 },
      { buildingId: "charcoal", count: 1 },
      { buildingId: "furnace", count: 1 },
      { buildingId: "steelworks", count: 1 },
    ],
    supplies: null,
  },
  {
    id: "soap",
    good: "soap",
    titleEs: "Jabón",
    wikiUrl: `${CHAINS_WIKI}#Soap`,
    maintenance: -210,
    workforce: { farmer: 60, worker: 130 },
    perfect: [
      { buildingId: "pig", count: 2 },
      { buildingId: "rendering", count: 2 },
      { buildingId: "soap", count: 1 },
    ],
    campaign: [
      { buildingId: "pig", count: 1 },
      { buildingId: "rendering", count: 1 },
      { buildingId: "soap", count: 1 },
    ],
    supplies: { worker: 240, artisan: 120 },
  },
  {
    id: "sails",
    good: "sails",
    titleEs: "Velas",
    wikiUrl: `${CHAINS_WIKI}#Sails`,
    maintenance: -95,
    workforce: { farmer: 10, worker: 50 },
    perfect: [
      { buildingId: "sheep", count: 1 },
      { buildingId: "sails", count: 1 },
    ],
    campaign: [
      { buildingId: "sheep", count: 1 },
      { buildingId: "sails", count: 1 },
    ],
    supplies: null,
  },
  {
    id: "weapons",
    good: "weapons",
    titleEs: "Armas",
    wikiUrl: `${CHAINS_WIKI}#Weapons`,
    maintenance: -1190,
    workforce: { worker: 570 },
    perfect: [
      { buildingId: "iron-mine", count: 1 },
      { buildingId: "charcoal", count: 2 },
      { buildingId: "furnace", count: 2 },
      { buildingId: "weapons", count: 6 },
    ],
    campaign: [
      { buildingId: "iron-mine", count: 1 },
      { buildingId: "charcoal", count: 1 },
      { buildingId: "furnace", count: 1 },
      { buildingId: "weapons", count: 1 },
    ],
    supplies: null,
  },
  {
    id: "fried-plantains",
    good: "fried-plantains",
    titleEs: "Plátanos fritos",
    wikiUrl: `${CHAINS_WIKI}#Fried_Plantains`,
    maintenance: -25,
    workforce: { jornalero: 50 },
    perfect: [
      { buildingId: "plantain", count: 1 },
      { buildingId: "fish-oil", count: 1 },
      { buildingId: "kitchen", count: 1 },
    ],
    campaign: [
      { buildingId: "plantain", count: 1 },
      { buildingId: "fish-oil", count: 1 },
      { buildingId: "kitchen", count: 1 },
    ],
    supplies: { jornalero: 70, obrero: 35 },
  },
  {
    id: "ponchos",
    good: "ponchos",
    titleEs: "Ponchos",
    wikiUrl: `${CHAINS_WIKI}#Ponchos`,
    maintenance: -20,
    workforce: { jornalero: 40 },
    perfect: [
      { buildingId: "alpaca", count: 1 },
      { buildingId: "poncho", count: 1 },
    ],
    campaign: [
      { buildingId: "alpaca", count: 1 },
      { buildingId: "poncho", count: 1 },
    ],
    supplies: { jornalero: 80, obrero: 40 },
  },
  {
    id: "rum",
    good: "rum",
    titleEs: "Ron",
    wikiUrl: `${CHAINS_WIKI}#Rum`,
    maintenance: -120,
    workforce: { jornalero: 90 },
    perfect: [
      { buildingId: "lumberjack", count: 1 },
      { buildingId: "sugar-cane", count: 2 },
      { buildingId: "rum-distillery", count: 2 },
    ],
    campaign: [
      { buildingId: "sugar-cane", count: 1 },
      { buildingId: "rum-distillery", count: 1 },
    ],
    supplies: { jornalero: 280, obrero: 140 },
  },
];

export function chainById(id: string): ProductionChain | undefined {
  return CHAINS.find((row) => row.id === id);
}

export function chainByGood(good: GoodId): ProductionChain | undefined {
  return CHAINS.find((row) => row.good === good);
}

export function chainLinks(chain: ProductionChain, mode: SimMode): readonly ChainLink[] {
  return mode === "perfect" ? chain.perfect : chain.campaign;
}

export function chainOutputTMin(chain: ProductionChain, mode: SimMode): number {
  const links = chainLinks(chain, mode);
  const final = links[links.length - 1];
  if (!final) return 0;
  const building = BUILDINGS[final.buildingId];
  if (!building) return 0;
  return outputTMinAt100(building, final.count);
}

/**
 * Fields still null this pass, with the wiki page to copy next.
 * Do not invent these numbers.
 */
export const MISSING_WIKI: readonly { field: string; source: string }[] = [
  { field: "BUILDINGS.lumberjack.maintenance", source: "https://anno1800.fandom.com/wiki/Lumberjack%27s_Hut" },
  { field: "BUILDINGS.lumberjack.workforce", source: "https://anno1800.fandom.com/wiki/Lumberjack%27s_Hut" },
  { field: "BUILDINGS.sawmill.maintenance", source: "https://anno1800.fandom.com/wiki/Sawmill" },
  { field: "BUILDINGS.sawmill.workforce", source: "https://anno1800.fandom.com/wiki/Sawmill" },
  { field: "BUILDINGS.sheep.maintenance", source: "https://anno1800.fandom.com/wiki/Sheep_Farm" },
  { field: "BUILDINGS.sheep.workforce", source: "https://anno1800.fandom.com/wiki/Sheep_Farm" },
  { field: "BUILDINGS.knitters.maintenance", source: "https://anno1800.fandom.com/wiki/Framework_Knitters" },
  { field: "BUILDINGS.knitters.workforce", source: "https://anno1800.fandom.com/wiki/Framework_Knitters" },
  { field: "BUILDINGS.potato.maintenance", source: "https://anno1800.fandom.com/wiki/Potato_Farm" },
  { field: "BUILDINGS.potato.workforce", source: "https://anno1800.fandom.com/wiki/Potato_Farm" },
  { field: "BUILDINGS.distillery.maintenance", source: "https://anno1800.fandom.com/wiki/Schnapps_Distillery" },
  { field: "BUILDINGS.distillery.workforce", source: "https://anno1800.fandom.com/wiki/Schnapps_Distillery" },
  { field: "BUILDINGS.pig.maintenance", source: "https://anno1800.fandom.com/wiki/Pig_Farm" },
  { field: "BUILDINGS.pig.workforce", source: "https://anno1800.fandom.com/wiki/Pig_Farm" },
  { field: "BUILDINGS.slaughterhouse.maintenance", source: "https://anno1800.fandom.com/wiki/Slaughterhouse" },
  { field: "BUILDINGS.slaughterhouse.workforce", source: "https://anno1800.fandom.com/wiki/Slaughterhouse" },
  { field: "INVESTOR_NEEDS.*.cTonsPerSecond", source: "https://anno1800.fandom.com/wiki/Needs#Investors" },
  { field: "ARTISAN_NEEDS.market.influx", source: "https://anno1800.fandom.com/wiki/Needs#Artisans" },
  { field: "ENGINEER_NEEDS.market.influx", source: "https://anno1800.fandom.com/wiki/Needs#Engineers" },
  { field: "OBRERO_NEEDS.rum.cTonsPerSecond", source: "https://anno1800.fandom.com/wiki/Needs#Obreros" },
  { field: "island.workforce when mixed buildings", source: "per-building infobox on each wiki page" },
];
