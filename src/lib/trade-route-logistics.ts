/**
 * Stage 4 logistics: names, direction, and the three quantity lanes.
 * Configured routes are never guaranteed supply. Stock drops stay correlational.
 */

import { playerIslandsFromSave } from "./live/evidence.ts";
import type {
  LiveIslandSnapshot,
  LiveRouteDelivery,
  LiveRouteStationDelivery,
  LiveSnapshot,
  LiveTradeRoute,
  LiveTradeRouteGood,
} from "./live/types.ts";
import { tradeRouteIssue } from "./trade-route-health.ts";

export type EvidenceHonesty = "confirmed" | "observed" | "inferred";
export type LoadDirection = "load" | "unload" | "unknown";
export type RouteSupplyKind = "structural" | "configured-only" | "observed-partial" | "observed";

export type ResolvedStopIsland = {
  areaId: number;
  name: string;
  nameSource: LiveIslandSnapshot["nameSource"];
};

export type RouteGoodQuantities = {
  guid: number;
  id?: string;
  name: string;
  configured: number;
  realizedMedian: number | null;
  realizedLast: number | null;
  visitCount: number;
};

export type RouteLogistics = {
  islandByAreaId: Map<number, ResolvedStopIsland>;
  ships: string[];
  directions: Array<{
    good: LiveTradeRouteGood;
    direction: LoadDirection;
    evidence: EvidenceHonesty | null;
  }>;
  quantities: RouteGoodQuantities[];
  nominalCapacity: null;
  delivery: LiveRouteDelivery | null;
  observedTMin: number | null;
  stations: Array<LiveRouteStationDelivery & { inferredTMin: number | null }>;
  supplyKind: RouteSupplyKind;
  guaranteedSupply: false;
};

export function isGuaranteedSupply(_route?: LiveTradeRoute | null): false {
  return false;
}

export function stopIslandName(
  areaId: number | undefined,
  islands: readonly LiveIslandSnapshot[],
): ResolvedStopIsland | null {
  if (areaId == null) return null;
  const matches = islands.filter((island) => island.areaId === areaId);
  if (matches.length !== 1) return null;
  const island = matches[0]!;
  return { areaId, name: island.name, nameSource: island.nameSource };
}

export function loadDirectionOf(
  good: Pick<LiveTradeRouteGood, "isLoading">,
): { direction: LoadDirection; evidence: EvidenceHonesty | null } {
  if (good.isLoading === true) return { direction: "load", evidence: "confirmed" };
  if (good.isLoading === false) return { direction: "unload", evidence: "confirmed" };
  return { direction: "unknown", evidence: null };
}

export function configuredGoods(route: LiveTradeRoute): RouteGoodQuantities[] {
  const byGuid = new Map<number, RouteGoodQuantities>();
  for (const stop of route.stops) {
    for (const good of stop.goods) {
      const prev = byGuid.get(good.guid);
      if (!prev || Math.abs(good.amount) > Math.abs(prev.configured)) {
        byGuid.set(good.guid, {
          guid: good.guid,
          id: good.id,
          name: good.name ?? `GUID ${good.guid}`,
          configured: good.amount,
          realizedMedian: null,
          realizedLast: null,
          visitCount: 0,
        });
      }
    }
  }
  return [...byGuid.values()];
}

function attachRealized(
  configured: RouteGoodQuantities[],
  delivery: LiveRouteDelivery | undefined,
): RouteGoodQuantities[] {
  if (!delivery) return configured;
  const byGuid = new Map(configured.map((row) => [row.guid, { ...row }]));
  for (const good of delivery.goods) {
    const prev = byGuid.get(good.guid) ?? {
      guid: good.guid,
      id: good.id,
      name: good.name ?? `GUID ${good.guid}`,
      configured: 0,
      realizedMedian: null,
      realizedLast: null,
      visitCount: 0,
    };
    prev.realizedMedian = good.medianAbsAmount;
    prev.realizedLast = good.lastAmount;
    prev.visitCount = good.visitCount;
    if (good.id) prev.id = good.id;
    if (good.name) prev.name = good.name;
    byGuid.set(good.guid, prev);
  }
  return [...byGuid.values()];
}

function rateFromInterval(amount: number, intervalMs: number | undefined): number | null {
  if (!intervalMs || intervalMs <= 0 || amount <= 0) return null;
  return Math.round((amount / (intervalMs / 60_000)) * 100) / 100;
}

/**
 * Inferred t/min for one destination/good series.
 * A route-level interval mixed across stops is not a delivery rate.
 */
export function inferredStationDeliveryTMin(
  station: Pick<LiveRouteStationDelivery, "medianAbsAmount" | "intervalMsMedian" | "areaId">,
): number | null {
  if (station.areaId == null) return null;
  return rateFromInterval(station.medianAbsAmount, station.intervalMsMedian);
}

/**
 * Inferred t/min only when destination and good are known.
 * A global median across load and unload is not a destination rate.
 */
export function inferredDeliveryTMin(
  delivery: LiveRouteDelivery | undefined,
  scope?: { areaId?: number; guid?: number },
): number | null {
  if (!delivery) return null;
  const stations = delivery.stations ?? [];
  if (scope?.areaId != null || scope?.guid != null) {
    const match = stations.filter((row) => {
      if (scope.areaId != null && row.areaId !== scope.areaId) return false;
      if (scope.guid != null && row.guid !== scope.guid) return false;
      return true;
    });
    if (match.length !== 1) return null;
    return inferredStationDeliveryTMin(match[0]!);
  }
  const withDest = stations.filter((row) => row.areaId != null);
  if (withDest.length === 1) return inferredStationDeliveryTMin(withDest[0]!);
  return null;
}

export function routeSupplyKind(route: LiveTradeRoute): RouteSupplyKind {
  if (tradeRouteIssue(route)) return "structural";
  const delivery = route.delivery;
  if (!delivery || delivery.visitCount <= 0) return "configured-only";
  const configured = configuredGoods(route);
  const partial = configured.some((row) => {
    const realized = delivery.goods.find((good) => good.guid === row.guid);
    return !realized || realized.medianAbsAmount + 1e-9 < Math.abs(row.configured);
  });
  return partial ? "observed-partial" : "observed";
}

export function inspectRouteLogistics(
  route: LiveTradeRoute,
  snapshot: LiveSnapshot | null | undefined,
): RouteLogistics {
  const islands = playerIslandsFromSave(snapshot);
  const islandByAreaId = new Map<number, ResolvedStopIsland>();
  for (const stop of route.stops) {
    const resolved = stopIslandName(stop.areaId, islands);
    if (resolved) islandByAreaId.set(resolved.areaId, resolved);
  }
  const ships = (route.ships ?? []).map((ship) => ship.name).filter(Boolean);
  const directions = route.stops.flatMap((stop) =>
    stop.goods.map((good) => ({ good, ...loadDirectionOf(good) })),
  );
  const delivery = route.delivery ?? null;
  const quantities = attachRealized(configuredGoods(route), delivery ?? undefined);
  const stations = (delivery?.stations ?? []).map((row) => ({
    ...row,
    inferredTMin: inferredStationDeliveryTMin(row),
  }));
  return {
    islandByAreaId,
    ships,
    directions,
    quantities,
    nominalCapacity: null,
    delivery,
    observedTMin: inferredDeliveryTMin(delivery ?? undefined),
    stations,
    supplyKind: routeSupplyKind(route),
    guaranteedSupply: false,
  };
}
