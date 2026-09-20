/**
 * Stage 4 logistics: names, direction, and the three quantity lanes.
 * Configured routes are never guaranteed supply. Stock drops stay correlational.
 */

import { playerIslandsFromSave } from "./live/evidence.ts";
import type {
  LiveIslandSnapshot,
  LiveRouteDelivery,
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

/**
 * Inferred t/min from median |amount| and median interval.
 * Partial loads keep this below configured; never treat as nominal capacity.
 */
export function inferredDeliveryTMin(delivery: LiveRouteDelivery | undefined): number | null {
  if (!delivery?.intervalMsMedian || delivery.intervalMsMedian <= 0) return null;
  const amount = delivery.goods.reduce((max, good) => Math.max(max, good.medianAbsAmount), 0);
  if (amount <= 0) return null;
  return Math.round((amount / (delivery.intervalMsMedian / 60_000)) * 100) / 100;
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
  return {
    islandByAreaId,
    ships,
    directions,
    quantities,
    nominalCapacity: null,
    delivery,
    observedTMin: inferredDeliveryTMin(delivery ?? undefined),
    supplyKind: routeSupplyKind(route),
    guaranteedSupply: false,
  };
}
