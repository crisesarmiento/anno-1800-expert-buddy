import {
  AlertTriangle,
  CheckCircle2,
  Route,
  Ship,
  TrendingDown,
  Warehouse,
} from "lucide-react";
import { HarborCard, IconWell } from "@/components/harbor-card";
import { HarborNavigation } from "@/components/harbor-navigation";
import { LiveStatus } from "@/components/live-status";
import { Badge } from "@/components/ui/badge";
import { fill, type UiDict } from "@/lib/i18n";
import { useHarbor } from "@/lib/store";
import { routeAnchor } from "@/lib/home-priorities";
import { inspectRouteLogistics, type LoadDirection, type RouteSupplyKind } from "@/lib/trade-route-logistics";
import { tradeRouteHealth, uniqueTradeGoods } from "@/lib/trade-route-health";
import { useT } from "@/lib/use-t";

function honestyLabel(t: UiDict, level: "confirmed" | "observed" | "inferred") {
  if (level === "confirmed") return t.routes.confirmed;
  if (level === "observed") return t.routes.observed;
  return t.routes.inferred;
}

function directionLabel(t: UiDict, direction: LoadDirection) {
  if (direction === "load") return t.routes.load;
  if (direction === "unload") return t.routes.unload;
  return t.routes.directionUnknown;
}

function supplyCopy(t: UiDict, kind: RouteSupplyKind) {
  if (kind === "configured-only") return t.routes.configuredOnly;
  if (kind === "observed-partial") return t.routes.observedPartial;
  if (kind === "observed") return t.routes.observedOk;
  return null;
}

export function TradeRoutes() {
  const snapshot = useHarbor((state) => state.liveSnapshot);
  const t = useT();
  const routes = (snapshot?.telemetry?.routes ?? []).filter(
    (route) => route.ownerId == null || route.ownerId === 0,
  );
  const goodsChanges = snapshot?.telemetry?.goodsChanges ?? [];
  const routeRows = routes.map((route) => ({
    route,
    health: tradeRouteHealth(route, goodsChanges),
    goods: uniqueTradeGoods(route),
    logistics: inspectRouteLogistics(route, snapshot),
  }));
  const confirmedIssues = routeRows.filter((row) => row.health.level === "confirmed").length;
  const stockSignals = routeRows.filter((row) => row.health.level === "watch").length;
  const issues = confirmedIssues + stockSignals;
  const ships = routes.reduce((total, route) => total + route.shipCount, 0);

  return (
    <div className="min-h-dvh bg-background">
      <div className="border-b border-border bg-card px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <HarborNavigation />
        </div>
      </div>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <IconWell>
            <Route className="size-5" strokeWidth={1.75} />
          </IconWell>
          <div className="min-w-0">
            <p className="font-display text-lg leading-none font-semibold tracking-tight">
              {t.routes.title}
            </p>
            <p className="mt-1 truncate text-xs text-mist">{t.routes.subtitle}</p>
          </div>
        </div>
        <LiveStatus />

        {routes.length === 0 ? (
          <HarborCard
            kicker={t.routes.title}
            title={t.routes.emptyTitle}
            hint={t.routes.emptyHint}
            icon={<Route className="size-5" />}
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <HarborCard
                kicker={t.routes.yourRoutes}
                title={String(routes.length)}
                icon={<Route className="size-5" />}
              />
              <HarborCard
                kicker={t.routes.assignedShips}
                title={String(ships)}
                icon={<Ship className="size-5" />}
              />
              <HarborCard
                kicker={t.routes.review}
                title={String(issues)}
                hint={fill(t.routes.reviewHint, confirmedIssues, stockSignals)}
                icon={<AlertTriangle className="size-5" />}
              />
            </div>

            <section className="flex flex-col gap-3" aria-label={t.routes.yourRoutes}>
              {routeRows.map(({ route, health, goods, logistics }, index) => {
                const supply = supplyCopy(t, logistics.supplyKind);
                return (
                  <article
                    id={routeAnchor(route, index)}
                    key={route.id ?? `${route.name}-${index}`}
                    className="rounded-xl bg-card p-4 shadow-border sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-xl font-medium tracking-tight">
                            {route.name}
                          </h2>
                          {health.level === "confirmed" ? (
                            <Badge>{health.message}</Badge>
                          ) : health.level === "watch" ? (
                            <Badge variant="outline">
                              <TrendingDown className="size-3.5" aria-hidden="true" />
                              {health.message}
                            </Badge>
                          ) : (
                            <Badge variant="ok">
                              <CheckCircle2 className="size-3.5" aria-hidden="true" />
                              {t.routes.configured}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {route.shipCount} {route.shipCount === 1 ? t.routes.oneShip : t.routes.manyShips}{" "}
                          · {route.stops.length}{" "}
                          {route.stops.length === 1 ? t.routes.oneStop : t.routes.manyStops}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {logistics.ships.length
                            ? logistics.ships.join(" · ")
                            : t.routes.noShipNames}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {goods.length ? (
                          goods.map((good) => (
                            <Badge key={good.name} variant="outline">
                              {good.name} · {good.amount}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="muted">{t.routes.noGoods}</Badge>
                        )}
                      </div>
                    </div>
                    {health.level === "watch" ? (
                      <div className="mt-4 rounded-lg border border-ochre/30 bg-ochre/10 p-3">
                        <p className="text-sm font-medium">
                          {fill(
                            t.routes.stockBetween,
                            health.change.previousAmount,
                            health.change.amount,
                            health.change.delta,
                          )}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {t.routes.stockWatch}
                        </p>
                      </div>
                    ) : null}
                    {supply && health.level !== "confirmed" ? (
                      <p className="mt-4 text-sm leading-relaxed" data-route-supply={logistics.supplyKind}>
                        <span className="text-xs tracking-wide text-muted-foreground uppercase">
                          {logistics.supplyKind === "configured-only"
                            ? honestyLabel(t, "confirmed")
                            : honestyLabel(t, "observed")}
                        </span>
                        <span className="mt-1 block">{supply}</span>
                      </p>
                    ) : null}
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {logistics.quantities.map((row) => (
                        <div key={row.guid} className="rounded-lg bg-muted/60 p-3">
                          <p className="text-sm font-medium">{row.name}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{t.routes.nominal}</p>
                          <p className="text-sm">{t.scenario.unknownAmount}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{t.routes.configuredQty}</p>
                          <p className="text-sm">
                            {row.configured} · {honestyLabel(t, "confirmed")}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">{t.routes.realized}</p>
                          <p className="text-sm">
                            {row.realizedMedian == null
                              ? t.scenario.unknownAmount
                              : `${row.realizedMedian} · ${honestyLabel(t, "observed")}`}
                          </p>
                        </div>
                      ))}
                    </div>
                    {logistics.delivery ? (
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        {fill(t.routes.visits, logistics.delivery.visitCount)}
                        {logistics.delivery.intervalMsMedian
                          ? ` · ${fill(
                              t.routes.interval,
                              Math.round((logistics.delivery.intervalMsMedian / 60_000) * 10) / 10,
                            )}`
                          : ""}
                        {logistics.observedTMin != null
                          ? ` · ${honestyLabel(t, "inferred")} ${logistics.observedTMin} t/min`
                          : ""}
                      </p>
                    ) : null}
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {route.stops.map((stop, stopIndex) => {
                        const island = stop.areaId != null ? logistics.islandByAreaId.get(stop.areaId) : null;
                        return (
                          <div
                            key={`${stop.areaId ?? "stop"}-${stopIndex}`}
                            className="rounded-lg bg-muted/60 p-3"
                          >
                            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                              <Warehouse className="size-4 text-mist" aria-hidden="true" />
                              {fill(t.routes.stopLabel, stopIndex + 1)}
                              {island ? (
                                <span className="text-xs text-muted-foreground">{island.name}</span>
                              ) : stop.areaId != null ? (
                                <span className="text-xs text-muted-foreground">
                                  {fill(t.routes.area, stop.areaId)}
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {stop.goods.length
                                ? stop.goods
                                    .map((good) => {
                                      const dir = loadDirectionLine(t, good.isLoading);
                                      return `${good.name ?? `GUID ${good.guid}`} ${good.amount} · ${dir}`;
                                    })
                                    .join(" · ")
                                : t.routes.noStopGoods}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                      {t.routes.guaranteedNever} {t.routes.unknownNominal}
                    </p>
                  </article>
                );
              })}
            </section>
          </>
        )}

        <p className="text-sm leading-relaxed text-muted-foreground">{t.routes.footer}</p>
      </main>
    </div>
  );
}

function loadDirectionLine(t: UiDict, isLoading: boolean | undefined) {
  if (isLoading === true) return `${directionLabel(t, "load")} · ${honestyLabel(t, "confirmed")}`;
  if (isLoading === false) return `${directionLabel(t, "unload")} · ${honestyLabel(t, "confirmed")}`;
  return directionLabel(t, "unknown");
}
