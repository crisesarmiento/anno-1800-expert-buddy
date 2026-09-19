import type { LiveGoodChange, LiveTradeRoute } from "@/lib/live/types.ts";

export type TradeRouteHealth =
  | { level: "confirmed"; message: string }
  | { level: "watch"; message: string; change: LiveGoodChange }
  | { level: "ok"; message: "Configurada" };

export function tradeRouteIssue(route: LiveTradeRoute): string | null {
  if (route.shipCount === 0) return "Sin barco asignado";
  if (route.stops.length < 2) return "Sólo tiene una parada";
  if (route.stops.every((stop) => stop.goods.length === 0)) return "No tiene bienes configurados";
  return null;
}

export function uniqueTradeGoods(route: LiveTradeRoute) {
  const goods = new Map<number, { name: string; amount: number }>();
  for (const stop of route.stops) {
    for (const good of stop.goods) {
      goods.set(good.guid, { name: good.name ?? `GUID ${good.guid}`, amount: good.amount });
    }
  }
  return [...goods.values()];
}

function normalizedGoodName(value: string | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");
}

function isMeaningfulDrop(change: LiveGoodChange) {
  if (change.delta >= 0) return false;
  const threshold = Math.max(5, Math.ceil(Math.max(1, change.previousAmount) * 0.1));
  return Math.abs(change.delta) >= threshold;
}

/**
 * Finds a save-wide stock drop for cargo configured on this route. This is
 * correlation only: production, consumption and other routes can move stock.
 */
export function routeStockDrop(
  route: LiveTradeRoute,
  changes: readonly LiveGoodChange[],
): LiveGoodChange | null {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const stop of route.stops) {
    for (const good of stop.goods) {
      if (good.id) ids.add(good.id);
      const name = normalizedGoodName(good.name);
      if (name) names.add(name);
    }
  }

  let strongest: LiveGoodChange | null = null;
  for (const change of changes) {
    const matches = ids.has(change.id) || names.has(normalizedGoodName(change.name));
    if (!matches || !isMeaningfulDrop(change)) continue;
    if (!strongest || Math.abs(change.delta) > Math.abs(strongest.delta)) strongest = change;
  }
  return strongest;
}

export function tradeRouteHealth(
  route: LiveTradeRoute,
  changes: readonly LiveGoodChange[] = [],
): TradeRouteHealth {
  const issue = tradeRouteIssue(route);
  if (issue) return { level: "confirmed", message: issue };
  const change = routeStockDrop(route, changes);
  if (change) return { level: "watch", message: `Stock global de ${change.name} bajó`, change };
  return { level: "ok", message: "Configurada" };
}
