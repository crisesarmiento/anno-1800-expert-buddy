/**
 * City compute: demand, supply, gap, houses-supported, one nextBuild.
 * Taller only. Campaign default. Perfect ratios stay in Taller.
 *
 * Presence from harbor-live.json is names, not counts — confidence "presence"
 * returns null t/min instead of inventing.
 */

import { BUILDINGS, buildingById, chainByGood, chainLinks } from "./chains.ts";
import {
  HOUSE_CAPACITY,
  RESIDENCE_NEEDS,
  consumeTonsPerMinute,
} from "./needs.ts";
import {
  CITY_SEED_GAME,
  CITY_SEED_SCHEMA,
  type BuildingId,
  type CityAlert,
  type CitySeed,
  type CityStats,
  type Confidence,
  type GoodFlow,
  type GoodId,
  type HouseCounts,
  type HousesSupported,
  type Island,
  type IslandStats,
  type LivePresence,
  type NextBuild,
  type PopulationTier,
  type SimMode,
} from "./types.ts";

const TIERS: PopulationTier[] = [
  "farmer",
  "worker",
  "artisan",
  "engineer",
  "investor",
  "jornalero",
  "obrero",
];

const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

const CONSUMER_GOODS = new Set<GoodId>([
  "fish",
  "work-clothes",
  "schnapps",
  "sausages",
  "bread",
  "soap",
  "beer",
  "canned-food",
  "sewing-machines",
  "fur-coats",
  "glasses",
  "coffee",
  "fried-plantains",
  "ponchos",
  "rum",
  "tortillas",
  "bowler-hats",
]);

function asRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function intCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

export function parseCitySeed(raw: unknown): CitySeed {
  if (!asRecord(raw)) throw new Error("city-seed: no es un objeto");
  if (raw.schema !== CITY_SEED_SCHEMA) throw new Error("city-seed: schema distinto de harbor-city-v1");
  if (raw.game !== CITY_SEED_GAME) throw new Error("city-seed: game distinto de anno-1800");
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : "";
  if (!updatedAt) throw new Error("city-seed: falta updatedAt");
  const mode: SimMode = raw.mode === "perfect" ? "perfect" : "campaign";
  if (!Array.isArray(raw.islands) || raw.islands.length < 1) {
    throw new Error("city-seed: hace falta al menos una isla");
  }
  const islands = raw.islands.map((row, index) => parseIsland(row, index));
  const seed: CitySeed = {
    schema: CITY_SEED_SCHEMA,
    game: CITY_SEED_GAME,
    updatedAt,
    mode,
    islands,
  };
  if (typeof raw.missionHint === "string" && raw.missionHint.trim()) {
    seed.missionHint = raw.missionHint.trim();
  }
  return seed;
}

function parseIsland(raw: unknown, index: number): Island {
  if (!asRecord(raw)) throw new Error(`city-seed: isla ${index} inválida`);
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `island-${index}`;
  const world = raw.world === "new" ? "new" : "old";
  const houses: HouseCounts = {};
  if (asRecord(raw.houses)) {
    for (const tier of TIERS) {
      if (raw.houses[tier] !== undefined) houses[tier] = intCount(raw.houses[tier]);
    }
  }
  const buildings: Island["buildings"] = {};
  if (asRecord(raw.buildings)) {
    for (const [key, value] of Object.entries(raw.buildings)) {
      buildings[key as BuildingId] = intCount(value);
    }
  }
  const island: Island = { id, world, houses, buildings };
  if (typeof raw.name === "string" && raw.name.trim()) island.name = raw.name.trim();
  if (typeof raw.productivity === "number" && Number.isFinite(raw.productivity)) {
    island.productivity = raw.productivity;
  }
  if (asRecord(raw.modifiers)) {
    island.modifiers = {
      R: typeof raw.modifiers.R === "number" ? raw.modifiers.R : 0,
      N: typeof raw.modifiers.N === "number" ? raw.modifiers.N : 0,
      B: typeof raw.modifiers.B === "number" ? raw.modifiers.B : 0,
    };
  }
  if (asRecord(raw.pulse)) {
    const coins = raw.pulse.coins;
    const housePulse = raw.pulse.houses;
    island.pulse = {
      coins: coins === "up" || coins === "down" || coins === "unknown" ? coins : undefined,
      houses:
        housePulse === "ok" || housePulse === "yellow" || housePulse === "empty" || housePulse === "unknown"
          ? housePulse
          : undefined,
    };
  }
  if (typeof raw.notes === "string") island.notes = raw.notes;
  if (raw.confidence === "presence" || raw.confidence === "seed") {
    island.confidence = raw.confidence;
  }
  return island;
}

function countOf(island: Island, id: BuildingId): number {
  return Math.max(0, island.buildings[id] ?? 0);
}

function housesOf(island: Island, tier: PopulationTier): number {
  return Math.max(0, island.houses[tier] ?? 0);
}

function inhabitants(island: Island, tier: PopulationTier): number {
  return housesOf(island, tier) * HOUSE_CAPACITY[tier];
}

export function computeDemand(
  island: Island,
): Partial<Record<GoodId, number>> {
  const demand: Partial<Record<GoodId, number>> = {};
  const modifiers = island.modifiers ?? {};
  for (const tier of TIERS) {
    const houses = housesOf(island, tier);
    if (houses <= 0) continue;
    for (const need of RESIDENCE_NEEDS[tier]) {
      if (need.good == null || need.cTonsPerSecond == null) continue;
      const add = houses * consumeTonsPerMinute(need.cTonsPerSecond, modifiers);
      demand[need.good] = (demand[need.good] ?? 0) + add;
    }
  }
  return demand;
}

export function computeSupply(
  island: Island,
): Partial<Record<GoodId, number>> {
  const productivity = island.productivity ?? 100;
  const supply: Partial<Record<GoodId, number>> = {};
  for (const id of BUILDING_IDS) {
    const n = countOf(island, id);
    if (n <= 0) continue;
    const building = BUILDINGS[id];
    if (!building) continue;
    const rate = n * (1 / building.cycleMin) * (productivity / 100);
    supply[building.output] = (supply[building.output] ?? 0) + rate;
  }
  return supply;
}

function gapOf(
  supply: number | null | undefined,
  demand: number | null | undefined,
): number | null {
  if (supply == null || demand == null) return null;
  return supply - demand;
}

export function housesSupportedByGood(
  supply: Partial<Record<GoodId, number | null>>,
  modifiers: Island["modifiers"],
): HousesSupported {
  const out: HousesSupported = {};
  for (const tier of TIERS) {
    for (const need of RESIDENCE_NEEDS[tier]) {
      if (need.good == null || need.cTonsPerSecond == null) continue;
      const tons = supply[need.good];
      const perHouse = consumeTonsPerMinute(need.cTonsPerSecond, modifiers ?? {});
      const supported = tons == null ? null : perHouse === 0 ? null : tons / perHouse;
      const bucket = out[need.good] ?? {};
      bucket[tier] = supported;
      out[need.good] = bucket;
    }
  }
  return out;
}

function sumWorkforce(island: Island): Partial<Record<PopulationTier, number>> | null {
  const totals: Partial<Record<PopulationTier, number>> = {};
  let any = false;
  for (const id of BUILDING_IDS) {
    const n = countOf(island, id);
    if (n <= 0) continue;
    const building = BUILDINGS[id];
    if (!building) continue;
    if (building.workforce == null) return null;
    any = true;
    for (const [tier, amount] of Object.entries(building.workforce) as [PopulationTier, number][]) {
      totals[tier] = (totals[tier] ?? 0) + amount * n;
    }
  }
  return any ? totals : null;
}

function sumMaintenance(island: Island): number | null {
  let total = 0;
  let any = false;
  for (const id of BUILDING_IDS) {
    const n = countOf(island, id);
    if (n <= 0) continue;
    const building = BUILDINGS[id];
    if (!building) continue;
    if (building.maintenance == null) return null;
    any = true;
    total += building.maintenance * n;
  }
  return any ? total : null;
}

function toNullableMap(
  values: Partial<Record<GoodId, number>>,
  confidence: Confidence,
): Partial<Record<GoodId, number | null>> {
  if (confidence === "presence") {
    const out: Partial<Record<GoodId, number | null>> = {};
    for (const key of Object.keys(values) as GoodId[]) out[key] = null;
    return out;
  }
  return values;
}

function flowsOf(
  demand: Partial<Record<GoodId, number | null>>,
  supply: Partial<Record<GoodId, number | null>>,
): GoodFlow[] {
  const goods = new Set([...Object.keys(demand), ...Object.keys(supply)] as GoodId[]);
  return [...goods].map((good) => ({
    good,
    demandTMin: demand[good] ?? 0,
    supplyTMin: supply[good] ?? 0,
    gapTMin: gapOf(supply[good] ?? 0, demand[good] ?? 0),
  }));
}

function nextFromChain(
  island: Island,
  good: GoodId,
  mode: SimMode,
): NextBuild | null {
  const chain = chainByGood(good);
  if (!chain) return null;
  for (const link of chainLinks(chain, mode)) {
    if (countOf(island, link.buildingId) < 1) {
      const building = buildingById(link.buildingId);
      if (!building) continue;
      return {
        buildingId: building.id,
        nameEs: building.nameEs,
        wikiId: building.wikiId,
        line: buddyLine(building.id, island),
      };
    }
  }
  return null;
}

function buddyLine(id: BuildingId, island: Island): string {
  const farmers = housesOf(island, "farmer");
  switch (id) {
    case "marketplace":
      return "Poné el mercado cerca de las casas y del puerto.";
    case "lumberjack":
      return "Tirale una cabaña de leñador al bosque. Es el edificio número uno.";
    case "sawmill":
      return "El aserradero al lado del leñador. Uno alcanza para arrancar.";
    case "fishery":
      return `Poné una pescadería en la costa. Una cubre 80 casas de granjero.`;
    case "sheep":
      return "Ovejas afuera del 10×10. La lana alimenta los telares.";
    case "knitters":
      return farmers > 0
        ? `Con ${farmers} casas y 0 telares, la ropa va a ponerse amarilla al llegar a 100 granjeros.`
        : "Unos telares al borde de la ciudad. Una granja de ovejas alcanza un rato largo.";
    case "potato":
      return "Papas si la isla tiene fertilidad. Si no, comprá Schnapps un tiempo.";
    case "distillery":
      return "Una destilería. Es lujo, no supervivencia.";
    case "pig":
      return "Cerdos afuera. El matadero al borde, cuando los obreros lo pidan.";
    case "slaughterhouse":
      return "Un matadero. Una cadena cubre 50 casas de obrero.";
    case "grain":
      return "Trigo lejos, molino y panadería caminando al almacén.";
    case "mill":
      return "El molino entre el trigo y la panadería.";
    case "bakery":
      return "Una panadería cubre 55 casas de obrero. No armes las dos de la wiki todavía.";
    case "clay":
      return "Una fosa de arcilla. En campaña, una ladrillera alcanza.";
    case "brick":
      return "Una ladrillera. La wiki pide dos; en campaña, una.";
    case "iron-mine":
      return "La mina va en el yacimiento. La montaña elige el lugar.";
    case "charcoal":
      return "Una carbonera lejos de los bloques lindos. En campaña, una de cada.";
    case "furnace":
      return "Una fundición. En campaña, una de cada hasta que falte.";
    case "steelworks":
      return "Una acería al lado de la fundición. No armes las tres de la wiki.";
    case "kitchen":
      return "Cocina de plátanos: plantación, aceite y cocina. Una de cada.";
    case "plantain":
      return "Plantá plátanos afuera del 10×10.";
    case "fish-oil":
      return "Aceite de pescado en la costa. La cocina lo pide.";
    case "alpaca":
      return "Alpacas afuera. Un taller de ponchos cubre 80 casas de jornalero.";
    case "poncho":
      return "Un taller de ponchos. Se pone amarillo al llegar a 200 jornaleros.";
    case "sugar-cane":
      return "Caña para el ron. En campaña, una destilería alcanza.";
    case "rum-distillery":
      return "Una destilería de ron. Lujo de jornalero, no un pueblo entero.";
    case "sails":
      return "Un taller de velas al lado de la lana que ya tenés.";
    case "weapons":
      return "Una fábrica de armas. La historia quiere una, no seis.";
    case "soap":
      return "El jabón se cuelga de los cerdos. Si no hay sebo, primero los cerdos.";
    case "rendering":
      return "Sebo para el jabón. Se cuelga de la cadena de cerdos.";
    default:
      return "Una cadena. Si alcanza, no la toques.";
  }
}

function pickNextBuild(island: Island, mode: SimMode, confidence: Confidence): NextBuild | null {
  if (confidence === "presence") return null;

  const farmers = housesOf(island, "farmer");
  const workers = housesOf(island, "worker");
  const jornaleros = housesOf(island, "jornalero");
  const obreros = housesOf(island, "obrero");
  const oldPop = farmers + workers;
  const newPop = jornaleros + obreros;

  if (island.world === "new") {
    if (newPop > 0 && countOf(island, "marketplace") < 1) {
      return nextFromChainNamed("marketplace", island);
    }
    if (countOf(island, "lumberjack") < 1) return nextFromChainNamed("lumberjack", island);
    if (countOf(island, "sawmill") < 1) return nextFromChainNamed("sawmill", island);
    if (jornaleros > 0) {
      const food = nextFromChain(island, "fried-plantains", mode);
      if (food) return food;
    }
    if (jornaleros >= 20) {
      const clothes = nextFromChain(island, "ponchos", mode);
      if (clothes) return clothes;
    }
    return null;
  }

  if (oldPop > 0 && countOf(island, "marketplace") < 1) {
    return nextFromChainNamed("marketplace", island);
  }
  if (countOf(island, "lumberjack") < 1) return nextFromChainNamed("lumberjack", island);
  if (countOf(island, "sawmill") < 1) return nextFromChainNamed("sawmill", island);

  if (farmers > 0 && countOf(island, "fishery") < 1) {
    return nextFromChainNamed("fishery", island);
  }

  const demand = computeDemand(island);
  const supply = computeSupply(island);
  if ((supply.fish ?? 0) < (demand.fish ?? 0)) {
    return nextFromChainNamed("fishery", island);
  }

  if (inhabitants(island, "farmer") >= 100) {
    const clothes = nextFromChain(island, "work-clothes", mode);
    if (clothes) return clothes;
  }

  if (inhabitants(island, "farmer") >= 100) {
    const schnapps = nextFromChain(island, "schnapps", mode);
    if (schnapps) return schnapps;
  }

  if (workers > 0) {
    const sausages = nextFromChain(island, "sausages", mode);
    if (sausages) return sausages;
  }

  if (inhabitants(island, "worker") >= 150) {
    const bread = nextFromChain(island, "bread", mode);
    if (bread) return bread;
  }

  const steelStarted =
    countOf(island, "iron-mine") +
      countOf(island, "charcoal") +
      countOf(island, "furnace") +
      countOf(island, "steelworks") >
    0;
  if (steelStarted) {
    const steel = nextFromChain(island, "steel-beams", mode);
    if (steel) return steel;
  }

  return null;
}

function nextFromChainNamed(id: BuildingId, island: Island): NextBuild {
  const building = buildingById(id);
  return {
    buildingId: id,
    nameEs: building?.nameEs ?? id,
    wikiId: building?.wikiId ?? id,
    line: buddyLine(id, island),
  };
}

function islandAlerts(
  island: Island,
  confidence: Confidence,
  demand: Partial<Record<GoodId, number | null>>,
  supply: Partial<Record<GoodId, number | null>>,
  nextBuild: NextBuild | null,
): CityAlert[] {
  const alerts: CityAlert[] = [];
  const farmers = housesOf(island, "farmer");
  const jornaleros = housesOf(island, "jornalero");

  if (confidence === "presence") {
    alerts.push({
      id: "presence",
      line: "El watcher solo vio nombres. Anotá las casas y las fábricas en el seed; si no, no invento toneladas.",
    });
    return alerts;
  }

  if (island.pulse?.coins === "down") {
    alerts.push({
      id: "coins-down",
      line: "Las monedas bajan. Pausá o tirate las fábricas dormidas — el mantenimiento se cobra igual.",
    });
  }

  if (island.pulse?.houses === "empty") {
    alerts.push({
      id: "houses-empty",
      line:
        countOf(island, "marketplace") < 1
          ? "Las casas están vacías. Calle al mercado. Después esperá."
          : "Las casas están vacías. El mercado está; esperá a que se llenen.",
    });
  }

  if (island.world === "old" && farmers > 0 && countOf(island, "fishery") < 1) {
    alerts.push({
      id: "fish-missing",
      good: "fish",
      line: `Con ${farmers} casas y 0 pescaderías, el pescado se pone amarillo al llegar a 50 granjeros.`,
    });
  }

  if (island.world === "old" && farmers > 0 && countOf(island, "knitters") < 1) {
    alerts.push({
      id: "clothes-soon",
      good: "work-clothes",
      line: `Con ${farmers} casas y 0 telares, la ropa va a ponerse amarilla al llegar a 100 granjeros.`,
    });
  }

  if (island.world === "new" && jornaleros > 0 && countOf(island, "kitchen") < 1) {
    alerts.push({
      id: "plantains-missing",
      good: "fried-plantains",
      line: `Con ${jornaleros} casas y 0 cocinas, los plátanos se ponen amarillos al llegar a 50 jornaleros.`,
    });
  }

  const basicGapOpen = [...CONSUMER_GOODS].some((good) => {
    const need = [...RESIDENCE_NEEDS.farmer, ...RESIDENCE_NEEDS.worker, ...RESIDENCE_NEEDS.jornalero].find(
      (row) => row.good === good && row.kind === "basic",
    );
    if (!need) return false;
    const g = gapOf(supply[good] ?? 0, demand[good] ?? 0);
    return g != null && g < 0;
  });

  for (const good of CONSUMER_GOODS) {
    const g = gapOf(supply[good] ?? 0, demand[good] ?? 0);
    if (g == null || g >= 0) continue;
    if (alerts.some((row) => row.good === good)) continue;
    const need = [...RESIDENCE_NEEDS.farmer, ...RESIDENCE_NEEDS.worker, ...RESIDENCE_NEEDS.jornalero].find(
      (row) => row.good === good,
    );
    if (need?.kind === "luxury" && basicGapOpen) continue;
    const name = need?.nameEs ?? good;
    alerts.push({
      id: `gap-${good}`,
      good,
      line: `Falta ${name.toLowerCase()}. No armes doce fábricas: una cadena.`,
    });
  }

  if (nextBuild && !alerts.some((row) => row.id === "next")) {
    alerts.unshift({
      id: "next",
      line: nextBuild.line,
    });
  }

  return alerts;
}

function computeIsland(island: Island, mode: SimMode, live?: LivePresence): IslandStats {
  const liveIds = live?.buildingIds ?? [];
  const hasCounts = Object.values(island.buildings).some((n) => (n ?? 0) > 0)
    || TIERS.some((tier) => housesOf(island, tier) > 0);
  const confidence: Confidence =
    island.confidence ?? (hasCounts ? "seed" : liveIds.length > 0 ? "presence" : "seed");

  const rawDemand = computeDemand(island);
  const rawSupply = computeSupply(island);
  for (const good of new Set([...Object.keys(rawDemand), ...Object.keys(rawSupply)] as GoodId[])) {
    if (rawDemand[good] == null) rawDemand[good] = 0;
    if (rawSupply[good] == null) rawSupply[good] = 0;
  }
  const demand = toNullableMap(rawDemand, confidence);
  const supply = toNullableMap(rawSupply, confidence);
  const gap: Partial<Record<GoodId, number | null>> = {};
  const goods = new Set([...Object.keys(demand), ...Object.keys(supply)] as GoodId[]);
  for (const good of goods) {
    gap[good] = confidence === "presence" ? null : gapOf(supply[good] ?? 0, demand[good] ?? 0);
  }

  const nextBuild = pickNextBuild(island, mode, confidence);
  const alerts = islandAlerts(island, confidence, demand, supply, nextBuild);

  return {
    id: island.id,
    world: island.world,
    confidence,
    housesPresent: { ...island.houses },
    housesSupported:
      confidence === "presence" ? {} : housesSupportedByGood(rawSupply, island.modifiers),
    demand,
    supply,
    gap,
    flows: confidence === "presence" ? [] : flowsOf(demand, supply),
    workforce: confidence === "presence" ? null : sumWorkforce(island),
    maintenance: confidence === "presence" ? null : sumMaintenance(island),
    alerts,
    nextBuild,
  };
}

function mergeMaps(
  islands: IslandStats[],
  key: "demand" | "supply" | "gap",
): Partial<Record<GoodId, number | null>> {
  const out: Partial<Record<GoodId, number | null>> = {};
  for (const island of islands) {
    const map = island[key];
    for (const [good, value] of Object.entries(map) as [GoodId, number | null][]) {
      if (value == null || out[good] === null) {
        out[good] = null;
        continue;
      }
      out[good] = (out[good] ?? 0) + value;
    }
  }
  return out;
}

export function compute(seed: CitySeed, live?: LivePresence): CityStats {
  const mode: SimMode = seed.mode ?? "campaign";
  const islands = seed.islands.map((island) => computeIsland(island, mode, live));
  const confidence: Confidence = islands.every((row) => row.confidence === "presence")
    ? "presence"
    : islands.some((row) => row.confidence === "seed")
      ? "seed"
      : "presence";
  const alerts = islands.flatMap((row) => row.alerts);
  const nextBuild = islands.find((row) => row.nextBuild)?.nextBuild ?? null;
  return {
    mode,
    confidence,
    islands,
    demand: mergeMaps(islands, "demand"),
    supply: mergeMaps(islands, "supply"),
    gap: mergeMaps(islands, "gap"),
    alerts,
    nextBuild,
  };
}

export function housesSupportedFish(fisheryCount: number, tier: "farmer" | "worker"): number {
  const building = BUILDINGS.fishery;
  const supply = fisheryCount * (1 / building.cycleMin);
  const need = RESIDENCE_NEEDS[tier].find((row) => row.good === "fish");
  if (!need?.cTonsPerSecond) return 0;
  return supply / consumeTonsPerMinute(need.cTonsPerSecond);
}
