import { lookupGuid } from "../data/guids.ts";
import { lookupShipCatalog } from "../fleet/catalog.ts";
import { isPlayerParticipant } from "./evidence.ts";
import { parseNestedFileDbTree, leafI32, leafText, type FileDbNode } from "./a7s-read.ts";
import { extractTradeRoutes } from "./a7s-trade-routes.ts";
import { LIVE_MAX_FLEET, type LiveFleetShip } from "./types.ts";

export { LIVE_MAX_FLEET };

export type ExtractedFleetShip = {
  name: string | null;
  guid: number | null;
  ownerId: number;
  metaId: number | null;
  routeId: number | null;
  regionId: number | null;
  areaId: number | null;
};

function child(node: FileDbNode, tag: string): FileDbNode | undefined {
  return node.children.find((item) => item.tag === tag);
}

function leaf(node: FileDbNode, attr: string): Buffer | undefined {
  return node.leaves.find((item) => item.attr === attr)?.bytes;
}

function leafInt(node: FileDbNode, attr: string): number | null {
  const bytes = leaf(node, attr);
  return bytes ? leafI32(bytes) : null;
}

function areaManagerId(tag: string): number | null {
  if (!tag.startsWith("AreaManager_")) return null;
  const n = Number(tag.slice("AreaManager_".length));
  return Number.isFinite(n) ? n : null;
}

function walkFleet(
  node: FileDbNode,
  ctx: { regionId: number | null; areaId: number | null },
  out: ExtractedFleetShip[],
) {
  const sessionGuid = leafInt(node, "SessionGUID");
  const regionId = sessionGuid ?? ctx.regionId;
  const fromTag = areaManagerId(node.tag);
  const areaId = fromTag ?? ctx.areaId;

  const nameable = child(node, "Nameable");
  const nameBytes = nameable ? leaf(nameable, "VehicleName") : undefined;
  const name = nameBytes ? leafText(nameBytes).trim() : "";
  if (nameable && name) {
    const ownerNode = child(node, "Owner");
    const ownerId = ownerNode ? leafInt(ownerNode, "id") : leafInt(node, "Owner");
    if (isPlayerParticipant(ownerId)) {
      const meta = child(node, "MetaPersistent");
      const trade = child(node, "PropertyTradeRouteVehicle");
      out.push({
        name: name.slice(0, 80),
        guid: leafInt(node, "guid") ?? leafInt(node, "GUID"),
        ownerId: 0,
        metaId: meta ? leafInt(meta, "MetaID") : null,
        routeId: trade ? leafInt(trade, "TradeRouteID") : null,
        regionId,
        areaId,
      });
    }
  }

  for (const item of node.children) walkFleet(item, { regionId, areaId }, out);
}

function shipKey(ship: ExtractedFleetShip): string {
  if (ship.metaId != null) return `meta:${ship.metaId}`;
  return `name:${ship.name ?? ""}:guid:${ship.guid ?? 0}:area:${ship.areaId ?? "x"}`;
}

/**
 * Player vehicles (Owner/id === 0) with a VehicleName.
 * Unknown owner is omitted — never assumed to be the player.
 * Catalog upkeep is not written here.
 */
export function extractFleet(dataBytes: Buffer): ExtractedFleetShip[] {
  const root = parseNestedFileDbTree(dataBytes);
  if (!root) return [];
  const raw: ExtractedFleetShip[] = [];
  walkFleet(root, { regionId: null, areaId: null }, raw);
  const seen = new Set<string>();
  const out: ExtractedFleetShip[] = [];
  for (const ship of raw) {
    const key = shipKey(ship);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ship);
    if (out.length >= LIVE_MAX_FLEET) break;
  }
  return out;
}

export function liveFleetFromExtracted(
  ships: ExtractedFleetShip[],
  dataBytes?: Buffer,
  observedAt?: string,
): LiveFleetShip[] {
  const routes = dataBytes ? extractTradeRoutes(dataBytes) : [];
  const routeName = new Map<number, string>();
  for (const route of routes) {
    if (route.id != null && route.name) routeName.set(route.id, route.name.slice(0, 120));
  }
  const out: LiveFleetShip[] = [];
  for (const row of ships) {
    if (!isPlayerParticipant(row.ownerId)) continue;
    const coverageIdentity = { source: "save" as const, scope: "player", ...(observedAt ? { observedAt } : {}) };
    const ship: LiveFleetShip = {
      ownerId: 0,
      coverage: { identity: coverageIdentity },
    };
    if (row.name) ship.name = row.name;
    if (row.guid != null) {
      ship.guid = row.guid;
      ship.coverage.type = { source: "save", ...(observedAt ? { observedAt } : {}) };
      const catalog = lookupShipCatalog(row.guid);
      const guidRow = lookupGuid(row.guid);
      if (catalog) {
        ship.id = catalog.id;
        ship.typeName = catalog.name;
        ship.kind = catalog.kind;
      } else if (guidRow?.kind === "ship") {
        ship.id = guidRow.id;
        ship.typeName = guidRow.name;
      }
    }
    if (row.metaId != null) ship.metaId = row.metaId;
    if (row.routeId != null) {
      ship.assignment = { kind: "trade-route", routeId: row.routeId };
      const name = routeName.get(row.routeId);
      if (name) ship.assignment.routeName = name;
      ship.coverage.assignment = { source: "save", ...(observedAt ? { observedAt } : {}) };
    }
    if (row.regionId != null || row.areaId != null) {
      ship.location = {};
      if (row.regionId != null) ship.location.regionId = row.regionId;
      if (row.areaId != null) ship.location.areaId = row.areaId;
      ship.coverage.location = { source: "save", scope: "area", ...(observedAt ? { observedAt } : {}) };
    }
    out.push(ship);
  }
  return out;
}
