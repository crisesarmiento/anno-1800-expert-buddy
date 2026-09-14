import { parseNestedFileDbTree, leafI32, leafText, type FileDbNode } from "./a7s-read.ts";

export type ExtractedTradeRoute = {
  id: number | null;
  name: string | null;
  isDefaultName: boolean | null;
  ownerId: number | null;
  shipIds: number[];
  stations: { areaId: number | null; goods: { guid: number; amount: number }[] }[];
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
      const goods = (goodInfos?.children ?? []).map((goodNode) => ({
        guid: leafInt(goodNode, "ProductGUID") ?? 0,
        amount: leafInt(goodNode, "Amount") ?? 0,
      }));
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
