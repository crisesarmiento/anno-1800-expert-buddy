import { Link } from "@tanstack/react-router";
import { AlertTriangle, Anchor, CheckCircle2, Route, Ship, Warehouse } from "lucide-react";
import { HarborCard, IconWell } from "@/components/harbor-card";
import { LanguageSelect } from "@/components/language-select";
import { LiveStatus } from "@/components/live-status";
import { Badge } from "@/components/ui/badge";
import { useHarbor } from "@/lib/store";
import { tradeRouteIssue, uniqueTradeGoods } from "@/lib/trade-route-health";

export function TradeRoutes() {
  const snapshot = useHarbor((state) => state.liveSnapshot);
  const routes = (snapshot?.telemetry?.routes ?? []).filter(
    (route) => route.ownerId == null || route.ownerId === 0,
  );
  const issues = routes.filter(tradeRouteIssue).length;
  const ships = routes.reduce((total, route) => total + route.shipCount, 0);

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <IconWell>
            <Anchor className="size-5" strokeWidth={1.75} />
          </IconWell>
          <div className="min-w-0">
            <p className="font-display text-lg leading-none font-semibold tracking-tight">
              Rutas comerciales
            </p>
            <p className="mt-1 truncate text-xs text-mist">
              Configuración leída del último guardado
            </p>
          </div>
          <LanguageSelect className="ml-auto" />
          <Link to="/" className="inline-flex min-h-11 items-center text-sm text-primary">
            Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        <LiveStatus />

        {routes.length === 0 ? (
          <HarborCard
            kicker="Rutas"
            title="Todavía no hay rutas leídas"
            hint="Conectá harbor-live.json después de que el vigilante lea un guardado. Esta pantalla no inventa rutas manuales."
            icon={<Route className="size-5" />}
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <HarborCard
                kicker="Tus rutas"
                title={String(routes.length)}
                icon={<Route className="size-5" />}
              />
              <HarborCard
                kicker="Barcos asignados"
                title={String(ships)}
                icon={<Ship className="size-5" />}
              />
              <HarborCard
                kicker="Revisar"
                title={String(issues)}
                icon={<AlertTriangle className="size-5" />}
              />
            </div>

            <section className="flex flex-col gap-3" aria-label="Rutas del jugador">
              {routes.map((route, index) => {
                const issue = tradeRouteIssue(route);
                const goods = uniqueTradeGoods(route);
                return (
                  <article
                    key={route.id ?? `${route.name}-${index}`}
                    className="rounded-xl bg-card p-4 shadow-border sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-xl font-medium tracking-tight">
                            {route.name}
                          </h2>
                          {issue ? (
                            <Badge>{issue}</Badge>
                          ) : (
                            <Badge variant="ok">
                              <CheckCircle2 className="size-3.5" aria-hidden="true" />
                              Configurada
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {route.shipCount} {route.shipCount === 1 ? "barco" : "barcos"} ·{" "}
                          {route.stops.length} {route.stops.length === 1 ? "parada" : "paradas"}
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
                          <Badge variant="muted">Sin bienes</Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {route.stops.map((stop, stopIndex) => (
                        <div
                          key={`${stop.areaId ?? "stop"}-${stopIndex}`}
                          className="rounded-lg bg-muted/60 p-3"
                        >
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <Warehouse className="size-4 text-mist" aria-hidden="true" />
                            Parada {stopIndex + 1}
                            {stop.areaId != null ? (
                              <span className="text-xs text-muted-foreground">
                                Área {stop.areaId}
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {stop.goods.length
                              ? stop.goods
                                  .map(
                                    (good) => `${good.name ?? `GUID ${good.guid}`} ${good.amount}`,
                                  )
                                  .join(" · ")
                              : "Sin bienes configurados en el save"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}

        <p className="text-sm leading-relaxed text-muted-foreground">
          Esta versión confirma la estructura de cada ruta. Todavía no afirma carga, descarga ni
          rendimiento: esos datos requieren la telemetría nativa.
        </p>
      </main>
    </div>
  );
}
