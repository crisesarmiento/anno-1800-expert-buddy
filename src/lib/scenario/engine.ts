/**
 * Pure produce-or-import comparison. Does not read live snapshots.
 *
 * High stock is not surplus. Local demand < capacity is not a pause.
 * The same verified surplus is never given to two destinations.
 * An impossible alternative cannot win on cost.
 * More supply is never treated as tax income.
 */

import {
  BUILDING_CONSTRUCTION,
  BUILDING_MAINTENANCE_FIGURE,
  BUILDING_SITE,
  BUILDING_WORKFORCE_FIGURE,
  chainConstruction,
} from "../sim/catalog-figures.ts";
import { BUILDINGS, chainByGood, chainLinks, outputTMinAt100 } from "../sim/chains.ts";
import type { BuildingId, PopulationTier } from "../sim/types.ts";
import type {
  AlternativeKind,
  ConstructionTotals,
  CutAdvice,
  MissingDatum,
  ScenarioAlternative,
  ScenarioInput,
  ScenarioIsland,
  ScenarioResult,
  ScenarioVerdict,
  SurplusAllocation,
} from "./types.ts";

const EMPTY_COST: ConstructionTotals = {
  coins: null,
  timber: null,
  bricks: null,
  steelBeams: null,
};

export function verifiedSurplusTMin(island: ScenarioIsland): number | null {
  if (island.capacityTMin == null || island.demandTMin == null) return null;
  const reserved = island.reservedExportTMin ?? 0;
  return Math.max(0, island.capacityTMin - island.demandTMin - reserved);
}

/**
 * Split one origin's verified surplus across destinations, in order.
 * Later destinations get only what remains. Stock is ignored.
 */
export function allocateVerifiedSurplus(input: {
  origins: Array<{ id: string; surplusTMin: number }>;
  destinations: Array<{ id: string; needTMin: number }>;
}): SurplusAllocation[] {
  const remaining = new Map(input.origins.map((row) => [row.id, row.surplusTMin]));
  const out: SurplusAllocation[] = [];
  for (const dest of input.destinations) {
    let need = dest.needTMin;
    if (need <= 0) continue;
    for (const origin of input.origins) {
      const left = remaining.get(origin.id) ?? 0;
      if (left <= 0 || need <= 0) continue;
      const take = Math.min(left, need);
      remaining.set(origin.id, left - take);
      need -= take;
      out.push({ originId: origin.id, destinationId: dest.id, amountTMin: take });
    }
  }
  return out;
}

export function neededTMin(island: ScenarioIsland): number | null {
  if (island.demandTMin == null || island.capacityTMin == null) return null;
  return Math.max(0, island.demandTMin - island.capacityTMin);
}

export function cutAdviceFor(input: ScenarioInput): CutAdvice {
  const consumer = input.islands.find((row) => row.id === input.consumerId);
  if (!consumer || consumer.demandTMin == null || consumer.capacityTMin == null) {
    return { recommendCut: false, reason: "demand-unknown" };
  }
  if (consumer.capacityTMin <= consumer.demandTMin) {
    return { recommendCut: false, reason: "not-local-surplus" };
  }
  if (consumer.hasOtherConsumers === true || (consumer.reservedExportTMin ?? 0) > 0) {
    return { recommendCut: false, reason: "consumers" };
  }
  return { recommendCut: false, reason: "consumers-unknown" };
}

function outputBuilding(goodId: ScenarioInput["goodId"]): BuildingId | null {
  const chain = chainByGood(goodId);
  if (!chain) return null;
  const last = chain.campaign[chain.campaign.length - 1];
  return last?.buildingId ?? null;
}

function perBuildingTMin(buildingId: BuildingId, productivity = 100): number {
  const building = BUILDINGS[buildingId];
  if (!building) return 0;
  return outputTMinAt100(building, 1, productivity);
}

function siteBlockers(
  buildingId: BuildingId,
  island: ScenarioIsland,
): { impossible: string[]; missing: MissingDatum[] } {
  const site = BUILDING_SITE[buildingId];
  const impossible: string[] = [];
  const missing: MissingDatum[] = [];
  if (!site) {
    missing.push("fertility");
    return { impossible, missing };
  }
  if (site.fertility) {
    const has = island.fertility[site.fertility];
    if (has === false) impossible.push(`fertility:${site.fertility}`);
    else if (has == null) missing.push("fertility");
  }
  if (site.resource) {
    const has = island.resources[site.resource];
    if (has === false) impossible.push(`resource:${site.resource}`);
    else if (has == null) missing.push("resource");
  }
  return { impossible, missing };
}

function scaleCost(
  unit: ConstructionTotals,
  count: number,
): ConstructionTotals {
  const mul = (value: number | null) => (value == null ? null : value * count);
  return {
    coins: mul(unit.coins),
    timber: mul(unit.timber),
    bricks: mul(unit.bricks),
    steelBeams: mul(unit.steelBeams),
  };
}

function addCosts(parts: ConstructionTotals[]): ConstructionTotals {
  const sum = (key: keyof ConstructionTotals): number | null => {
    let total = 0;
    for (const part of parts) {
      const value = part[key];
      if (value == null) return null;
      total += value;
    }
    return parts.length ? total : null;
  };
  if (!parts.length) return { ...EMPTY_COST };
  return {
    coins: sum("coins"),
    timber: sum("timber"),
    bricks: sum("bricks"),
    steelBeams: sum("steelBeams"),
  };
}

function rawMaterials(row: {
  coins: { value: number } | null;
  timber: { value: number } | null;
  bricks: { value: number } | null;
  steelBeams: { value: number } | null;
}): ConstructionTotals {
  return {
    coins: row.coins?.value ?? null,
    timber: row.timber?.value ?? null,
    bricks: row.bricks?.value ?? null,
    steelBeams: row.steelBeams?.value ?? null,
  };
}

function costForBuildings(
  buildingsToAdd: Partial<Record<BuildingId, number>>,
  goodId: ScenarioInput["goodId"],
  world: ScenarioIsland["world"],
): ConstructionTotals {
  const entries = Object.entries(buildingsToAdd).filter(([, n]) => (n ?? 0) > 0) as Array<
    [BuildingId, number]
  >;
  if (!entries.length) return { coins: 0, timber: 0, bricks: 0, steelBeams: 0 };

  const perBuilding = entries.map(([id, count]) => {
    const unit = BUILDING_CONSTRUCTION[id];
    if (!unit) return null;
    return scaleCost(rawMaterials(unit), count);
  });
  if (perBuilding.every((row) => row != null)) return addCosts(perBuilding as ConstructionTotals[]);

  const chain = chainByGood(goodId);
  const perfect = chain ? chainLinks(chain, "perfect") : [];
  const matchesPerfect =
    perfect.length > 0 &&
    perfect.length === entries.length &&
    perfect.every((link) => buildingsToAdd[link.buildingId] === link.count);
  if (matchesPerfect) {
    const full = chainConstruction(goodId, world);
    if (full) return rawMaterials(full);
  }
  return { ...EMPTY_COST };
}

function workforceForBuildings(
  buildingsToAdd: Partial<Record<BuildingId, number>>,
): Partial<Record<PopulationTier, number>> | null {
  const totals: Partial<Record<PopulationTier, number>> = {};
  const entries = Object.entries(buildingsToAdd).filter(([, n]) => (n ?? 0) > 0) as Array<
    [BuildingId, number]
  >;
  if (!entries.length) return {};
  for (const [id, count] of entries) {
    const row = BUILDING_WORKFORCE_FIGURE[id]?.value ?? BUILDINGS[id]?.workforce;
    if (!row) return null;
    for (const [tier, amount] of Object.entries(row) as [PopulationTier, number][]) {
      totals[tier] = (totals[tier] ?? 0) + amount * count;
    }
  }
  return totals;
}

function maintenanceForBuildings(
  buildingsToAdd: Partial<Record<BuildingId, number>>,
): number | null {
  let total = 0;
  const entries = Object.entries(buildingsToAdd).filter(([, n]) => (n ?? 0) > 0) as Array<
    [BuildingId, number]
  >;
  if (!entries.length) return 0;
  for (const [id, count] of entries) {
    const figure = BUILDING_MAINTENANCE_FIGURE[id]?.value ?? BUILDINGS[id]?.maintenance;
    if (figure == null) return null;
    total += figure * count;
  }
  return total;
}

function workforceBlockers(
  need: Partial<Record<PopulationTier, number>> | null,
  island: ScenarioIsland,
): { impossible: string[]; missing: MissingDatum[] } {
  if (!need || !Object.keys(need).length) return { impossible: [], missing: [] };
  const impossible: string[] = [];
  const missing: MissingDatum[] = [];
  for (const [tier, amount] of Object.entries(need) as [PopulationTier, number][]) {
    const have = island.workforceAvailable[tier];
    if (have == null) missing.push("workforce");
    else if (have < amount) impossible.push(`workforce:${tier}`);
  }
  return { impossible, missing };
}

function blankAlt(kind: AlternativeKind): ScenarioAlternative {
  return {
    kind,
    viability: "unknown",
    blockers: [],
    missing: [],
    assumptions: [],
    buildingsToAdd: {},
    investment: { ...EMPTY_COST },
    recurrentMaintenance: null,
    workforce: null,
    logisticsViable: null,
    allocatedTMin: null,
    coversNeed: null,
    savings: null,
    roi: null,
  };
}

function finishAlt(
  alt: ScenarioAlternative,
  island: ScenarioIsland,
  need: number | null,
): ScenarioAlternative {
  const work = workforceBlockers(alt.workforce, island);
  const blockers = [...alt.blockers, ...work.impossible];
  const missing = [...new Set([...alt.missing, ...work.missing])];
  let viability = alt.viability;
  if (blockers.length) viability = "impossible";
  else if (missing.length) viability = "unknown";
  else if (alt.coversNeed === false) viability = "unknown";
  else if (need != null && alt.coversNeed === true && !missing.length && !blockers.length) {
    viability = alt.viability === "impossible" ? "impossible" : "viable";
  }
  return { ...alt, viability, blockers, missing };
}

function expandLocal(input: ScenarioInput, consumer: ScenarioIsland, need: number | null): ScenarioAlternative {
  const alt = blankAlt("expand-local");
  const outId = outputBuilding(input.goodId);
  if (!outId) {
    alt.viability = "impossible";
    alt.blockers.push("catalog");
    return alt;
  }
  const existing = consumer.buildings[outId] ?? consumer.buildingCount ?? 0;
  if (existing <= 0) {
    alt.viability = "impossible";
    alt.blockers.push("no-existing-capacity");
    return alt;
  }
  if (need == null) {
    alt.missing.push(consumer.demandTMin == null ? "consumer-demand" : "consumer-capacity");
    return alt;
  }
  if (need === 0) {
    alt.viability = "viable";
    alt.coversNeed = true;
    alt.allocatedTMin = 0;
    alt.investment = { coins: 0, timber: 0, bricks: 0, steelBeams: 0 };
    alt.recurrentMaintenance = 0;
    alt.workforce = {};
    alt.assumptions.push("local-already-covers");
    return alt;
  }
  const rate = perBuildingTMin(outId);
  if (rate <= 0) {
    alt.viability = "impossible";
    alt.blockers.push("catalog");
    return alt;
  }
  const extra = Math.max(1, Math.ceil(need / rate - 1e-9));
  alt.buildingsToAdd = { [outId]: extra };
  alt.allocatedTMin = extra * rate;
  alt.coversNeed = alt.allocatedTMin + 1e-9 >= need;
  alt.assumptions.push("productivity-100");
  const site = siteBlockers(outId, consumer);
  alt.blockers.push(...site.impossible);
  alt.missing.push(...site.missing);
  alt.investment = costForBuildings(alt.buildingsToAdd, input.goodId, consumer.world);
  if (alt.investment.coins == null) alt.missing.push("investment");
  alt.workforce = workforceForBuildings(alt.buildingsToAdd);
  alt.recurrentMaintenance = maintenanceForBuildings(alt.buildingsToAdd);
  alt.logisticsViable = true;
  if (BUILDINGS[outId]?.inputs.length) {
    alt.assumptions.push("inputs-already-fed");
  }
  return finishAlt(alt, consumer, need);
}

function buildLocalChain(
  input: ScenarioInput,
  consumer: ScenarioIsland,
  need: number | null,
): ScenarioAlternative {
  const alt = blankAlt("build-local-chain");
  const chain = chainByGood(input.goodId);
  if (!chain) {
    alt.viability = "impossible";
    alt.blockers.push("catalog");
    return alt;
  }
  if (need == null) {
    alt.missing.push(consumer.demandTMin == null ? "consumer-demand" : "consumer-capacity");
    return alt;
  }
  const links = chainLinks(chain, "campaign");
  const outId = links[links.length - 1]?.buildingId;
  if (!outId) {
    alt.viability = "impossible";
    alt.blockers.push("catalog");
    return alt;
  }
  const outRate = perBuildingTMin(outId);
  if (outRate <= 0) {
    alt.viability = "impossible";
    alt.blockers.push("catalog");
    return alt;
  }
  const targetOut = need === 0 ? 0 : Math.max(1, Math.ceil(need / outRate - 1e-9));
  const campaignOut = links[links.length - 1]?.count ?? 1;
  const scale = campaignOut > 0 ? targetOut / campaignOut : targetOut;
  const toAdd: Partial<Record<BuildingId, number>> = {};
  for (const link of links) {
    const required = Math.max(0, Math.ceil(link.count * scale - 1e-9));
    const have = consumer.buildings[link.buildingId] ?? 0;
    const extra = Math.max(0, required - have);
    if (extra > 0) toAdd[link.buildingId] = extra;
    const site = siteBlockers(link.buildingId, consumer);
    alt.blockers.push(...site.impossible);
    alt.missing.push(...site.missing);
  }
  if (!Object.keys(toAdd).length) {
    alt.viability = need === 0 ? "viable" : "impossible";
    alt.blockers.push(need === 0 ? "" : "chain-already-present");
    alt.blockers = alt.blockers.filter(Boolean);
    alt.coversNeed = need === 0 ? true : false;
    alt.allocatedTMin = 0;
    alt.investment = { coins: 0, timber: 0, bricks: 0, steelBeams: 0 };
    alt.recurrentMaintenance = 0;
    alt.workforce = {};
    alt.logisticsViable = true;
    return finishAlt(alt, consumer, need);
  }
  alt.buildingsToAdd = toAdd;
  alt.allocatedTMin = targetOut * outRate;
  alt.coversNeed = need === 0 ? true : alt.allocatedTMin + 1e-9 >= need;
  alt.assumptions.push("campaign-ratio", "productivity-100");
  alt.investment = costForBuildings(toAdd, input.goodId, consumer.world);
  if (alt.investment.coins == null) alt.missing.push("investment");
  alt.workforce = workforceForBuildings(toAdd);
  alt.recurrentMaintenance = maintenanceForBuildings(toAdd);
  alt.logisticsViable = true;
  return finishAlt(alt, consumer, need);
}

function pickOrigin(
  input: ScenarioInput,
  consumer: ScenarioIsland,
): { origin: ScenarioIsland; surplus: number | null; missing: MissingDatum[] } | null {
  const others = input.islands.filter((row) => row.id !== consumer.id);
  if (!others.length) return null;
  let best: { origin: ScenarioIsland; surplus: number | null; missing: MissingDatum[] } | null =
    null;
  for (const origin of others) {
    const missing: MissingDatum[] = [];
    if (origin.hasOtherConsumers === true && origin.reservedExportTMin == null) {
      missing.push("origin-demand");
    }
    const surplus = verifiedSurplusTMin(origin);
    if (surplus == null) {
      missing.push(origin.capacityTMin == null ? "origin-capacity" : "origin-demand");
    }
    if (surplus != null && surplus > (best?.surplus ?? -1) && !missing.length) {
      best = { origin, surplus, missing };
    } else if (!best) {
      best = { origin, surplus, missing };
    }
  }
  return best;
}

function transportSurplus(
  input: ScenarioInput,
  consumer: ScenarioIsland,
  need: number | null,
): ScenarioAlternative {
  const alt = blankAlt("transport-surplus");
  const picked = pickOrigin(input, consumer);
  if (!picked) {
    alt.viability = "impossible";
    alt.blockers.push("no-other-island");
    return alt;
  }
  alt.originId = picked.origin.id;
  alt.missing.push(...picked.missing);
  if (need == null) {
    alt.missing.push(consumer.demandTMin == null ? "consumer-demand" : "consumer-capacity");
    return alt;
  }
  alt.assumptions.push("stock-is-not-surplus");
  if (picked.origin.hasOtherConsumers === true) {
    alt.assumptions.push("origin-needs-preserved");
  }
  if (picked.surplus == null) {
    alt.missing.push("origin-capacity");
    alt.logisticsViable = null;
    return alt;
  }
  if (picked.origin.transportToConsumerTMin == null) {
    // Configured cargo, stock and observed visits are not throughput.
    alt.missing.push("transport-capacity");
    alt.logisticsViable = null;
    if (picked.origin.routeToConsumerOk === false) {
      alt.viability = "impossible";
      alt.blockers.push("route-not-ready");
      alt.logisticsViable = false;
    }
    return finishAlt(alt, picked.origin, need);
  }
  if (picked.origin.routeToConsumerOk === false) {
    alt.viability = "impossible";
    alt.blockers.push("route-not-ready");
    alt.logisticsViable = false;
    return alt;
  }
  const shippable = Math.min(picked.surplus, picked.origin.transportToConsumerTMin);
  alt.allocatedTMin = shippable;
  alt.coversNeed = shippable + 1e-9 >= need;
  alt.logisticsViable = true;
  alt.investment = { coins: 0, timber: 0, bricks: 0, steelBeams: 0 };
  alt.recurrentMaintenance = 0;
  alt.workforce = {};
  alt.assumptions.push("transport-capacity-explicit");
  if (!alt.coversNeed) alt.missing.push("origin-capacity");
  return finishAlt(alt, picked.origin, need);
}

function expandOriginAndTransport(
  input: ScenarioInput,
  consumer: ScenarioIsland,
  need: number | null,
): ScenarioAlternative {
  const alt = blankAlt("expand-origin-and-transport");
  const picked = pickOrigin(input, consumer);
  if (!picked) {
    alt.viability = "impossible";
    alt.blockers.push("no-other-island");
    return alt;
  }
  alt.originId = picked.origin.id;
  if (need == null) {
    alt.missing.push(consumer.demandTMin == null ? "consumer-demand" : "consumer-capacity");
    return alt;
  }
  const surplus = picked.surplus;
  if (surplus == null) {
    alt.missing.push(...picked.missing);
    return alt;
  }
  const shortfall = Math.max(0, need - surplus);
  const outId = outputBuilding(input.goodId);
  if (!outId) {
    alt.viability = "impossible";
    alt.blockers.push("catalog");
    return alt;
  }
  const rate = perBuildingTMin(outId);
  const extra = shortfall <= 0 ? 0 : Math.max(1, Math.ceil(shortfall / rate - 1e-9));
  if (extra > 0) {
    alt.buildingsToAdd = { [outId]: extra };
    const site = siteBlockers(outId, picked.origin);
    alt.blockers.push(...site.impossible);
    alt.missing.push(...site.missing);
  }
  if (picked.origin.transportToConsumerTMin == null) {
    alt.missing.push("transport-capacity");
    alt.logisticsViable = null;
    return finishAlt(alt, picked.origin, need);
  }
  if (picked.origin.routeToConsumerOk === false) {
    alt.viability = "impossible";
    alt.blockers.push("route-not-ready");
    alt.logisticsViable = false;
    return alt;
  }
  const produced = surplus + extra * rate;
  const shippable = Math.min(produced, picked.origin.transportToConsumerTMin);
  alt.allocatedTMin = shippable;
  alt.coversNeed = shippable + 1e-9 >= need;
  alt.logisticsViable = true;
  alt.investment = costForBuildings(alt.buildingsToAdd, input.goodId, picked.origin.world);
  if (Object.keys(alt.buildingsToAdd).length && alt.investment.coins == null) {
    alt.missing.push("investment");
  }
  alt.workforce = workforceForBuildings(alt.buildingsToAdd);
  alt.recurrentMaintenance = maintenanceForBuildings(alt.buildingsToAdd);
  alt.assumptions.push("origin-needs-preserved", "transport-capacity-explicit", "productivity-100");
  return finishAlt(alt, picked.origin, need);
}

function nextDatum(alts: ScenarioAlternative[]): MissingDatum {
  const order: MissingDatum[] = [
    "consumer-demand",
    "consumer-capacity",
    "origin-capacity",
    "origin-demand",
    "fertility",
    "resource",
    "workforce",
    "transport-capacity",
    "investment",
    "paused-count",
  ];
  const seen = new Set(alts.flatMap((row) => row.missing));
  return order.find((key) => seen.has(key)) ?? "consumer-demand";
}

function verdictOf(
  alts: ScenarioAlternative[],
  need: number | null,
): ScenarioVerdict {
  if (need === 0) return { kind: "already-covered" };
  const viable = alts.filter((row) => row.viability === "viable" && row.coversNeed === true);
  if (!viable.length) {
    if (alts.some((row) => row.viability === "unknown" || row.missing.length)) {
      return { kind: "insufficient-data", nextDatum: nextDatum(alts) };
    }
    return { kind: "none-viable", reason: "no-viable-alternative" };
  }
  const withCost = viable.filter((row) => row.investment.coins != null);
  if (withCost.length !== viable.length) {
    if (viable.length === 1) return { kind: "pick", winner: viable[0]!.kind, reason: "only-viable" };
    return { kind: "insufficient-data", nextDatum: "investment" };
  }
  const ranked = [...withCost].sort((a, b) => (a.investment.coins ?? 0) - (b.investment.coins ?? 0));
  return { kind: "pick", winner: ranked[0]!.kind, reason: "lowest-known-investment" };
}

export function compareScenarios(input: ScenarioInput): ScenarioResult {
  const consumer = input.islands.find((row) => row.id === input.consumerId);
  const cutAdvice = cutAdviceFor(input);
  const notes = ["stock-is-not-surplus", "no-tax-from-supply"];
  if (!consumer) {
    return {
      consumerId: input.consumerId,
      goodId: input.goodId,
      neededTMin: null,
      alternatives: [],
      verdict: { kind: "insufficient-data", nextDatum: "consumer-demand" },
      cutAdvice,
      notes,
      evidence: "inferred",
    };
  }
  const need = neededTMin(consumer);
  const alternatives = [
    expandLocal(input, consumer, need),
    buildLocalChain(input, consumer, need),
    transportSurplus(input, consumer, need),
    expandOriginAndTransport(input, consumer, need),
  ];
  if (cutAdvice.reason === "consumers") notes.push("exporter-has-consumers");
  return {
    consumerId: input.consumerId,
    goodId: input.goodId,
    neededTMin: need,
    alternatives,
    verdict: verdictOf(alternatives, need),
    cutAdvice,
    notes,
    evidence: "inferred",
  };
}

export function competingDestinationsBlockDoubleCount(input: {
  originSurplusTMin: number;
  destinations: Array<{ id: string; needTMin: number }>;
}): Record<string, number> {
  const rows = allocateVerifiedSurplus({
    origins: [{ id: "origin", surplusTMin: input.originSurplusTMin }],
    destinations: input.destinations,
  });
  const out: Record<string, number> = {};
  for (const dest of input.destinations) out[dest.id] = 0;
  for (const row of rows) out[row.destinationId] = (out[row.destinationId] ?? 0) + row.amountTMin;
  return out;
}
