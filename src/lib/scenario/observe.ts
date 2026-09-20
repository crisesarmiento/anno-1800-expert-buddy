/**
 * Adapter from harbor-live observations into a ScenarioInput.
 * Unknown fields stay null. Stock is copied, never turned into surplus.
 */

import { playerIslandsFromSave } from "../live/evidence.ts";
import { islandKey } from "../live/island-key.ts";
import type { LiveIslandSnapshot, LiveSnapshot } from "../live/types.ts";
import { liveBuildingToCatalog, liveGoodToCatalog } from "../sim/catalog-figures.ts";
import { BUILDINGS, outputTMinAt100 } from "../sim/chains.ts";
import type { BuildingId, GoodId, PopulationTier, World } from "../sim/types.ts";
import type { ScenarioInput, ScenarioIsland, Trilean } from "./types.ts";

const TIER_FROM_POP: Record<keyof NonNullable<LiveIslandSnapshot["population"]>, PopulationTier> = {
  farmers: "farmer",
  workers: "worker",
  artisans: "artisan",
  engineers: "engineer",
};

function worldOf(regionId: number): World {
  if (regionId === 180025) return "new";
  return "old";
}

function buildingsOf(island: LiveIslandSnapshot): Partial<Record<BuildingId, number>> {
  const out: Partial<Record<BuildingId, number>> = {};
  for (const hit of island.buildings ?? []) {
    const id = liveBuildingToCatalog(hit.id);
    if (!id) continue;
    const count = hit.count && hit.count > 0 ? hit.count : 1;
    out[id] = (out[id] ?? 0) + count;
  }
  return out;
}

function stockOf(island: LiveIslandSnapshot, goodId: GoodId): number | null {
  const rows = island.stock ?? [];
  const match = rows.find((row) => liveGoodToCatalog(row.id) === goodId);
  return match ? match.amount : null;
}

function ocrForIsland(snapshot: LiveSnapshot, island: LiveIslandSnapshot, goodId: GoodId) {
  const rows = snapshot.telemetry?.production ?? [];
  return rows.filter((row) => {
    const sameRef =
      row.islandRef &&
      row.islandRef.regionId === island.regionId &&
      row.islandRef.areaId === island.areaId;
    const uniqueName =
      !row.islandRef &&
      row.islandName &&
      row.islandName === island.name &&
      (snapshot.islandSnapshots ?? []).filter((item) => item.name === island.name).length === 1;
    if (!sameRef && !uniqueName) return false;
    const building = row.id ? BUILDINGS[row.id] : undefined;
    return building?.output === goodId;
  });
}

function productionOf(
  snapshot: LiveSnapshot,
  island: LiveIslandSnapshot,
  goodId: GoodId,
  buildings: Partial<Record<BuildingId, number>>,
): { demandTMin: number | null; capacityTMin: number | null; buildingCount: number | null } {
  const ocr = ocrForIsland(snapshot, island, goodId);
  const withDemand = ocr.find((row) => row.requiredTMin != null);
  const withCount = ocr.find((row) => row.buildingCount != null);
  const demandTMin = withDemand?.requiredTMin ?? null;
  let capacityTMin: number | null = null;
  let buildingCount: number | null = withCount?.buildingCount ?? null;
  if (withCount?.id && withCount.buildingCount != null && withCount.productivity != null) {
    const building = BUILDINGS[withCount.id];
    if (building) {
      capacityTMin = outputTMinAt100(building, withCount.buildingCount, withCount.productivity);
    }
  }
  if (buildingCount == null) {
    const outId = Object.entries(BUILDINGS).find(([, row]) => row.output === goodId)?.[0] as
      | BuildingId
      | undefined;
    if (outId && buildings[outId] != null) buildingCount = buildings[outId] ?? null;
  }
  return { demandTMin, capacityTMin, buildingCount };
}

function workforceAvailable(
  island: LiveIslandSnapshot,
): ScenarioIsland["workforceAvailable"] {
  const pop = island.population;
  if (!pop) return {};
  const out: ScenarioIsland["workforceAvailable"] = {};
  for (const [key, tier] of Object.entries(TIER_FROM_POP) as Array<
    [keyof typeof TIER_FROM_POP, PopulationTier]
  >) {
    const value = pop[key];
    if (typeof value === "number") out[tier] = value;
  }
  return out;
}

function routeFacts(
  snapshot: LiveSnapshot,
  origin: LiveIslandSnapshot,
  consumer: LiveIslandSnapshot,
  goodId: GoodId,
): { routeToConsumerOk: Trilean; hasOtherConsumers: Trilean } {
  const routes = (snapshot.telemetry?.routes ?? []).filter((route) => (route.ownerId ?? 0) === 0);
  if (!routes.length) return { routeToConsumerOk: null, hasOtherConsumers: null };
  let toConsumer = false;
  let toConsumerReady = false;
  let other = false;
  for (const route of routes) {
    const stops = route.stops;
    const originStop = stops.find((stop) => stop.areaId === origin.areaId);
    if (!originStop) continue;
    const carries = originStop.goods.some((good) => liveGoodToCatalog(good.id) === goodId);
    if (!carries) continue;
    const otherStops = stops.filter((stop) => stop.areaId != null && stop.areaId !== origin.areaId);
    for (const stop of otherStops) {
      if (stop.areaId === consumer.areaId) {
        toConsumer = true;
        toConsumerReady = route.shipCount > 0 && stops.length >= 2;
      } else {
        other = true;
      }
    }
  }
  return {
    routeToConsumerOk: toConsumer ? toConsumerReady : null,
    hasOtherConsumers: other ? true : toConsumer ? false : null,
  };
}

function regionIdOf(island: LiveIslandSnapshot): number {
  return island.regionId;
}

export function goodsOnSnapshot(snapshot: LiveSnapshot | null): GoodId[] {
  const ids = new Set<GoodId>();
  for (const island of playerIslandsFromSave(snapshot)) {
    for (const row of island.stock ?? []) {
      const id = liveGoodToCatalog(row.id);
      if (id) ids.add(id);
    }
  }
  for (const row of snapshot?.telemetry?.goods ?? []) {
    const id = liveGoodToCatalog(row.id);
    if (id) ids.add(id);
  }
  for (const route of snapshot?.telemetry?.routes ?? []) {
    for (const stop of route.stops) {
      for (const good of stop.goods) {
        const id = liveGoodToCatalog(good.id);
        if (id) ids.add(id);
      }
    }
  }
  for (const row of snapshot?.telemetry?.production ?? []) {
    const building = row.id ? BUILDINGS[row.id] : undefined;
    if (building) ids.add(building.output);
  }
  return [...ids];
}

export function observeScenario(input: {
  snapshot: LiveSnapshot | null;
  consumerId: string;
  goodId: GoodId;
}): ScenarioInput {
  const islands = playerIslandsFromSave(input.snapshot);
  const consumerSnap = islands.find(
    (island) => islandKey(island.regionId, island.areaId) === input.consumerId,
  );
  const mapped: ScenarioIsland[] = islands.map((island) => {
    const buildings = buildingsOf(island);
    const production = input.snapshot
      ? productionOf(input.snapshot, island, input.goodId, buildings)
      : { demandTMin: null, capacityTMin: null, buildingCount: null };
    const routes = input.snapshot && consumerSnap
      ? routeFacts(input.snapshot, island, consumerSnap, input.goodId)
      : { routeToConsumerOk: null, hasOtherConsumers: null };
    const row: ScenarioIsland = {
      id: islandKey(island.regionId, island.areaId),
      name: island.name,
      world: worldOf(regionIdOf(island)),
      stockAmount: stockOf(island, input.goodId),
      demandTMin: production.demandTMin,
      capacityTMin: production.capacityTMin,
      buildingCount: production.buildingCount,
      pausedCount: null,
      fertility: {},
      resources: {},
      workforceAvailable: workforceAvailable(island),
      buildings,
      reservedExportTMin: null,
      hasOtherConsumers: routes.hasOtherConsumers,
      transportToConsumerTMin: null,
      routeToConsumerOk: island === consumerSnap ? true : routes.routeToConsumerOk,
    };
    return row;
  });
  return {
    consumerId: input.consumerId,
    goodId: input.goodId,
    islands: mapped,
  };
}
