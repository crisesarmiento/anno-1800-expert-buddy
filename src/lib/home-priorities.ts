import type { HistorySample } from "./history/types.ts";
import type { LiveSnapshot, LiveTradeRoute } from "./live/types.ts";
import { analyzeNativeProduction, type NativeProductionAdvice } from "./native-production.ts";
import { isOcrSampleStale } from "./native-freshness.ts";
import { tradeRouteHealth } from "./trade-route-health.ts";
import {
  essentialStockDrops,
  samplesOnBranch,
  treasuryHealth,
} from "./treasury-health.ts";

export type HomePriority =
  | {
      kind: "route";
      key: string;
      route: LiveTradeRoute;
      anchor: string;
      issue: "ship" | "stops" | "goods";
      observedAt?: string;
    }
  | { kind: "production"; key: string; advice: NativeProductionAdvice; anchor: string }
  | {
      kind: "stock";
      key: string;
      name: string;
      before: number;
      after: number;
      observedAt?: string;
      previousSavedAt: string;
      anchor: string;
    }
  | {
      kind: "treasury";
      key: string;
      from: number;
      to: number;
      observedAt?: string;
      previousSavedAt: string;
      anchor: string;
    }
  | {
      kind: "essential";
      key: string;
      name: string;
      before: number;
      after: number;
      observedAt?: string;
      previousSavedAt: string;
      anchor: string;
    };

export type ProductionReadiness =
  "off" | "historical" | "production" | "finance" | "catalog" | "ready";

export function routeAnchor(route: LiveTradeRoute, index: number) {
  return `route-${route.id ?? index}`;
}

/** The timestamp of an observation is not the JSON writer/probe timestamp. */
export function homePriorities(
  snapshot: LiveSnapshot | null,
  now: number,
  enabled = true,
  samples: HistorySample[] = [],
) {
  const native = snapshot?.connection?.native;
  const probe = snapshot?.connection?.nativeProbe;
  const production = snapshot?.telemetry?.production ?? [];
  const currentIsland = native?.islandName?.trim();
  const stale = (at: string | undefined) =>
    isOcrSampleStale({ observedAt: at, savedAt: snapshot?.savedAt, now });
  const historical =
    !enabled ||
    (probe != null && probe.state !== "reachable") ||
    probe?.result === "no_observation" ||
    probe?.result === "no_window" ||
    (native != null && stale(native.observedAt));
  const islandRows = currentIsland
    ? production.filter((row) => row.islandName?.trim() === currentIsland)
    : [];
  const productionRows = islandRows.filter(
    (row) => !stale(row.observedAt) && row.requiredTMin != null && row.productivity != null,
  );
  const eligible = productionRows.filter(
    (row) => row.buildingCount != null && !stale(row.buildingCountObservedAt),
  );
  const advice =
    historical || !snapshot
      ? []
      : analyzeNativeProduction({ ...snapshot, telemetry: { production: eligible } });
  const readiness: ProductionReadiness =
    historical && native
      ? "historical"
      : !native
        ? "off"
        : !productionRows.length
          ? "production"
          : !eligible.length
            ? "finance"
            : !advice.length
              ? "catalog"
              : "ready";
  const routes = (snapshot?.telemetry?.routes ?? []).filter(
    (route) => route.ownerId == null || route.ownerId === 0,
  );
  const structural: HomePriority[] = [];
  const stock = new Map<string, HomePriority>();
  routes.forEach((route, index) => {
    const health = tradeRouteHealth(route, snapshot?.telemetry?.goodsChanges);
    const anchor = routeAnchor(route, index);
    if (health.level === "confirmed") {
      structural.push({
        kind: "route",
        key: anchor,
        route,
        anchor,
        issue: route.shipCount === 0 ? "ship" : route.stops.length < 2 ? "stops" : "goods",
        observedAt: snapshot?.savedAt,
      });
    } else if (health.level === "watch" && !stock.has(health.change.id)) {
      stock.set(health.change.id, {
        kind: "stock",
        key: `stock-${health.change.id}`,
        name: health.change.name,
        before: health.change.previousAmount,
        after: health.change.amount,
        observedAt: snapshot?.savedAt,
        previousSavedAt: health.change.previousSavedAt,
        anchor,
      });
    }
  });
  const toPriority = (row: NativeProductionAdvice): HomePriority => ({
    kind: "production",
    key: `production-${row.guid}`,
    anchor: `production-${row.guid}`,
    advice: row,
  });
  const shortfall = advice.filter((row) => row.status === "falta").map(toPriority);
  const excess = advice.filter((row) => row.status === "sobra").map(toPriority);
  const branch = samplesOnBranch(samples);
  const cash = treasuryHealth(branch);
  const treasury: HomePriority[] =
    cash.kind === "recurrent"
      ? [
          {
            kind: "treasury",
            key: "treasury-recurrent",
            from: cash.from,
            to: cash.to,
            observedAt: cash.savedAt,
            previousSavedAt: cash.previousSavedAt,
            anchor: "economy",
          },
        ]
      : [];
  const essential: HomePriority[] = essentialStockDrops(branch).map((row) => ({
    kind: "essential",
    key:
      row.scope === "island"
        ? `essential-${row.campaignId}-${row.branchId}-${row.regionId}-${row.areaId}-${row.id}`
        : `essential-${row.campaignId}-${row.branchId}-global-${row.id}`,
    name: row.name,
    before: row.from,
    after: row.to,
    observedAt: row.savedAt,
    previousSavedAt: row.previousSavedAt,
    anchor: "economy",
  }));
  return {
    priorities: [
      ...treasury,
      ...structural,
      ...essential,
      ...shortfall,
      ...excess,
      ...stock.values(),
    ].slice(0, 3),
    readiness,
    island: currentIsland,
    hasRoutes: snapshot?.telemetry?.routes != null,
  };
}
