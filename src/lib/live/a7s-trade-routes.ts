import { parseNestedFileDbTree, leafI32, leafText, type FileDbNode } from "./a7s-read.ts";

export type ExtractedRouteGood = {
  guid: number;
  amount: number;
  /** null when the save omitted IsLoading — not the same as false. */
  isLoading: boolean | null;
};

export type ExtractedTradeRoute = {
  id: number | null;
  name: string | null;
  isDefaultName: boolean | null;
  ownerId: number | null;
  shipIds: number[];
  stations: { areaId: number | null; goods: ExtractedRouteGood[] }[];
};

export type ExtractedRouteShip = {
  routeId: number;
  name: string;
};

export type ExtractedRouteVisit = {
  routeId: number;
  executionTime: number;
  finalized: boolean;
  areaId: number | null;
  goods: { guid: number; amount: number }[];
};

export type ExtractedRouteDeliveryGood = {
  guid: number;
  visitCount: number;
  medianAbsAmount: number;
  lastAmount: number;
};

export type ExtractedStationDelivery = {
  areaId: number | null;
  guid: number;
  visitCount: number;
  medianAbsAmount: number;
  lastAmount: number;
  intervalMsMedian: number | null;
};

export type ExtractedRouteDelivery = {
  routeId: number;
  visitCount: number;
  lastExecutionTime: number;
  intervalMsMedian: number | null;
  goods: ExtractedRouteDeliveryGood[];
  stations: ExtractedStationDelivery[];
};

function child(node: FileDbNode, tag: string): FileDbNode | undefined {
  return node.children.find((c) => c.tag === tag);
}

function leaf(node: FileDbNode, attr: string): Buffer | undefined {
  return node.leaves.find((l) => l.attr === attr)?.bytes;
}

function leafInt(node: FileDbNode, attr: string): number | null {
  const bytes = leaf(node, attr);
  return bytes ? leafI32(bytes) : null;
}

function decodeShipIds(bytes: Buffer | undefined): number[] {
  if (!bytes || bytes.length === 0 || bytes.length % 8 !== 0) return [];
  const ids: number[] = [];
  for (let i = 0; i < bytes.length; i += 8) {
    const id = bytes.readBigInt64LE(i);
    if (id >= BigInt(Number.MIN_SAFE_INTEGER) && id <= BigInt(Number.MAX_SAFE_INTEGER)) ids.push(Number(id));
  }
  return ids;
}

/**
 * Player trade routes, read from MetaGameManager/SessionTradeRouteManager
 * /RouteMap in a `data.a7s` FileDB. Confirmed present at the TOP level (not
 * nested in BinaryData, unlike CityName/AreaInfo) against a real session
 * save -- see docs/filedb-spike-routes.md.
 */
export function extractTradeRoutes(dataBytes: Buffer): ExtractedTradeRoute[] {
  const root = parseNestedFileDbTree(dataBytes);
  if (!root) return [];
  const meta = child(root, "MetaGameManager");
  const manager = meta && child(meta, "SessionTradeRouteManager");
  const routeMap = manager && child(manager, "RouteMap");
  if (!routeMap) return [];

  return routeMap.children.map((routeNode) => {
    const owner = child(routeNode, "Owner");
    const stationsNode = child(routeNode, "Stations");
    const isDefaultBytes = leaf(routeNode, "IsDefaultName");
    const nameBytes = leaf(routeNode, "Name");

    const stations = (stationsNode?.children ?? []).map((stationNode) => {
      const goodInfos = child(stationNode, "GoodInfos");
      const goods = (goodInfos?.children ?? []).map((goodNode) => {
        const isLoadingBytes = leaf(goodNode, "IsLoading");
        return {
          guid: leafInt(goodNode, "ProductGUID") ?? 0,
          amount: leafInt(goodNode, "Amount") ?? 0,
          isLoading:
            isLoadingBytes && isLoadingBytes.length > 0 ? isLoadingBytes[0] !== 0 : null,
        };
      });
      return { areaId: leafInt(stationNode, "AreaID"), goods };
    });

    return {
      id: leafInt(routeNode, "ID"),
      name: nameBytes ? leafText(nameBytes) || null : null,
      isDefaultName: isDefaultBytes && isDefaultBytes.length > 0 ? isDefaultBytes[0] !== 0 : null,
      ownerId: owner ? leafInt(owner, "id") : null,
      shipIds: decodeShipIds(leaf(routeNode, "Ships")),
      stations,
    };
  });
}

function walkNodes(node: FileDbNode, visit: (item: FileDbNode) => void) {
  visit(node);
  for (const item of node.children) walkNodes(item, visit);
}

function medianInt(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid]!;
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

/**
 * Ship display names, joined by PropertyTradeRouteVehicle/TradeRouteID.
 * Route.Ships object ids do not match GameObject ID in the contrasted save.
 */
export function extractRouteShips(dataBytes: Buffer): ExtractedRouteShip[] {
  const root = parseNestedFileDbTree(dataBytes);
  if (!root) return [];
  const out: ExtractedRouteShip[] = [];
  const seen = new Set<string>();
  walkNodes(root, (node) => {
    const nameable = child(node, "Nameable");
    const trade = child(node, "PropertyTradeRouteVehicle");
    if (!nameable || !trade) return;
    const nameBytes = leaf(nameable, "VehicleName");
    const name = nameBytes ? leafText(nameBytes).trim() : "";
    const routeId = leafInt(trade, "TradeRouteID");
    if (!name || routeId == null) return;
    const key = `${routeId}:${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ routeId, name: name.slice(0, 80) });
  });
  return out;
}

/**
 * Finalized station visits from PassiveTrade/History/TradeRouteEntries.
 * GoodAmount is signed (island-relative); do not treat the sign as load/unload.
 */
export function extractRouteVisits(dataBytes: Buffer): ExtractedRouteVisit[] {
  const root = parseNestedFileDbTree(dataBytes);
  if (!root) return [];
  const out: ExtractedRouteVisit[] = [];
  walkNodes(root, (node) => {
    const routeId = leafInt(node, "RouteID");
    const executionTime = leafInt(node, "ExecutionTime");
    if (routeId == null || executionTime == null) return;
    const goodsNode = child(node, "TradedGoods");
    if (!goodsNode) return;
    const finalizedBytes = leaf(node, "Finalized");
    const goods = goodsNode.children
      .map((goodNode) => ({
        guid: leafInt(goodNode, "GoodGuid") ?? 0,
        amount: leafInt(goodNode, "GoodAmount") ?? 0,
      }))
      .filter((good) => good.guid !== 0);
    out.push({
      routeId,
      executionTime,
      finalized: finalizedBytes && finalizedBytes.length > 0 ? finalizedBytes[0] !== 0 : false,
      areaId: leafInt(node, "AreaID") ?? leafInt(node, "Identifier"),
      goods,
    });
  });
  return out;
}

export function summarizeRouteDeliveries(
  visits: readonly ExtractedRouteVisit[],
): ExtractedRouteDelivery[] {
  const byRoute = new Map<number, ExtractedRouteVisit[]>();
  for (const visit of visits) {
    if (!visit.finalized) continue;
    const list = byRoute.get(visit.routeId) ?? [];
    list.push(visit);
    byRoute.set(visit.routeId, list);
  }
  const out: ExtractedRouteDelivery[] = [];
  for (const [routeId, rows] of byRoute) {
    const sorted = [...rows].sort((a, b) => a.executionTime - b.executionTime);
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const delta = sorted[i]!.executionTime - sorted[i - 1]!.executionTime;
      if (delta > 0) intervals.push(delta);
    }
    const last = sorted[sorted.length - 1]!;
    const goodsByGuid = new Map<number, { amounts: number[]; last: number }>();
    for (const visit of sorted) {
      for (const good of visit.goods) {
        const row = goodsByGuid.get(good.guid) ?? { amounts: [], last: good.amount };
        row.amounts.push(good.amount);
        row.last = good.amount;
        goodsByGuid.set(good.guid, row);
      }
    }
    const stationMap = new Map<
      string,
      { areaId: number | null; guid: number; times: number[]; amounts: number[]; last: number }
    >();
    for (const visit of sorted) {
      for (const good of visit.goods) {
        const key = `${visit.areaId ?? "x"}:${good.guid}`;
        const row = stationMap.get(key) ?? {
          areaId: visit.areaId,
          guid: good.guid,
          times: [],
          amounts: [],
          last: good.amount,
        };
        row.times.push(visit.executionTime);
        row.amounts.push(good.amount);
        row.last = good.amount;
        stationMap.set(key, row);
      }
    }
    const stations: ExtractedStationDelivery[] = [...stationMap.values()].map((row) => {
      const stationIntervals: number[] = [];
      for (let i = 1; i < row.times.length; i++) {
        const delta = row.times[i]! - row.times[i - 1]!;
        if (delta > 0) stationIntervals.push(delta);
      }
      return {
        areaId: row.areaId,
        guid: row.guid,
        visitCount: row.amounts.length,
        medianAbsAmount: medianInt(row.amounts.map((n) => Math.abs(n))) ?? 0,
        lastAmount: row.last,
        intervalMsMedian: medianInt(stationIntervals),
      };
    });
    out.push({
      routeId,
      visitCount: sorted.length,
      lastExecutionTime: last.executionTime,
      intervalMsMedian: medianInt(intervals),
      goods: [...goodsByGuid.entries()].map(([guid, row]) => ({
        guid,
        visitCount: row.amounts.length,
        medianAbsAmount: medianInt(row.amounts.map((n) => Math.abs(n))) ?? 0,
        lastAmount: row.last,
      })),
      stations,
    });
  }
  return out;
}
