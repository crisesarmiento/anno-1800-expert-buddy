import type { LiveTradeRoute } from "@/lib/live/types.ts";

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
