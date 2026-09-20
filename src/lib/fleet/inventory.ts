import { isPlayerParticipant } from "../live/evidence.ts";
import type { LiveFleetShip, LiveSnapshot, LiveTradeRoute } from "../live/types.ts";
import { lookupShipCatalog } from "./catalog.ts";
import { honestyFromCoverage, type FleetInventoryShip, type FleetUpkeepSplit } from "./types.ts";

export function shipInventoryKey(ship: LiveFleetShip): string {
  if (typeof ship.metaId === "number" && Number.isFinite(ship.metaId)) {
    return `meta:${Math.trunc(ship.metaId)}`;
  }
  const name = ship.name?.trim() ?? "";
  const guid = typeof ship.guid === "number" ? Math.trunc(ship.guid) : 0;
  const area = typeof ship.location?.areaId === "number" ? ship.location.areaId : "x";
  return `name:${name}:guid:${guid}:area:${area}:owner:${ship.ownerId}`;
}

/**
 * Player ships only (Participant 0). One physical ship is counted once,
 * even if it also appears as a name on a trade route.
 */
export function uniquePlayerShips(ships: readonly LiveFleetShip[] | undefined): LiveFleetShip[] {
  if (!ships?.length) return [];
  const seen = new Set<string>();
  const out: LiveFleetShip[] = [];
  for (const ship of ships) {
    if (!isPlayerParticipant(ship.ownerId)) continue;
    const key = shipInventoryKey(ship);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ship);
  }
  return out;
}

function routeShipNames(routes: readonly LiveTradeRoute[] | undefined): Set<string> {
  const names = new Set<string>();
  for (const route of routes ?? []) {
    if (route.ownerId != null && !isPlayerParticipant(route.ownerId)) continue;
    for (const ship of route.ships ?? []) {
      const name = ship.name?.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

export function inventoryFromSnapshot(snapshot: LiveSnapshot | null | undefined): FleetInventoryShip[] {
  if (!snapshot) return [];
  const routeNames = routeShipNames(snapshot.telemetry?.routes);
  const ships = uniquePlayerShips(snapshot.telemetry?.fleet);
  return ships.map((ship) => {
    const catalog = lookupShipCatalog(ship.guid, ship.id);
    const assigned =
      ship.assignment?.kind === "trade-route" ||
      (ship.name != null && routeNames.has(ship.name.trim()));
    const typeHonesty = ship.guid != null || ship.id ? (honestyFromCoverage(ship.coverage.type) ?? "confirmed") : null;
    const assignmentHonesty = assigned
      ? (honestyFromCoverage(ship.coverage.assignment) ?? "confirmed")
      : honestyFromCoverage(ship.coverage.assignment);
    const row: FleetInventoryShip = {
      key: shipInventoryKey(ship),
      ship,
      honesty: {
        identity: honestyFromCoverage(ship.coverage.identity) ?? "confirmed",
        type: typeHonesty,
        assignment: assignmentHonesty,
        location: honestyFromCoverage(ship.coverage.location),
        maintenance: catalog?.upkeep != null ? "inferred" : null,
      },
    };
    if (catalog) {
      row.catalogId = catalog.id;
      row.catalogKind = catalog.kind;
      if (catalog.upkeep != null) row.inferredUpkeep = catalog.upkeep;
    }
    return row;
  });
}

export function fleetUpkeepSplit(rows: readonly FleetInventoryShip[]): FleetUpkeepSplit {
  let trade: number | null = 0;
  let military: number | null = 0;
  let unknownType: number | null = 0;
  let withInferredUpkeep = 0;
  let withoutUpkeep = 0;
  for (const row of rows) {
    if (row.inferredUpkeep == null) {
      withoutUpkeep += 1;
      continue;
    }
    withInferredUpkeep += 1;
    const kind = row.catalogKind;
    if (kind === "trade") trade = (trade ?? 0) + row.inferredUpkeep;
    else if (kind === "military") military = (military ?? 0) + row.inferredUpkeep;
    else unknownType = (unknownType ?? 0) + row.inferredUpkeep;
  }
  if (withInferredUpkeep === 0) {
    trade = null;
    military = null;
    unknownType = null;
  }
  const total =
    withInferredUpkeep === 0
      ? null
      : (trade ?? 0) + (military ?? 0) + (unknownType ?? 0);
  return {
    uniqueShips: rows.length,
    withInferredUpkeep,
    withoutUpkeep,
    trade: trade === 0 && withInferredUpkeep === 0 ? null : trade,
    military: military === 0 && withInferredUpkeep === 0 ? null : military,
    unknownType: unknownType === 0 && withInferredUpkeep === 0 ? null : unknownType,
    total,
    honesty: "inferred",
    ownerValidated: rows.length > 0,
  };
}

/** Route.shipCount is not added on top of telemetry.fleet. */
export function doubleCountRouteAndFleet(routeShipCount: number, fleetSize: number): number {
  void routeShipCount;
  return fleetSize;
}
