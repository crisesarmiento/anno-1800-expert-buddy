import type { LiveFleetShip, LiveSnapshot } from "../live/types.ts";

const savedAt = "2026-09-20T12:00:00.000Z";

function saveCoverage(scope = "player") {
  return { source: "save" as const, observedAt: savedAt, scope };
}

export function playerShip(over: Partial<LiveFleetShip> = {}): LiveFleetShip {
  const ship: LiveFleetShip = {
    name: "Heraldo",
    guid: 100439,
    id: "frigate",
    typeName: "Frigate",
    kind: "military",
    ownerId: 0,
    metaId: 177,
    assignment: { kind: "unknown" },
    coverage: {
      identity: saveCoverage(),
      type: saveCoverage("ship"),
    },
    ...over,
  };
  return ship;
}

function baseSnapshot(over: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    source: "save",
    updatedAt: savedAt,
    savedAt,
    game: "anno-1800",
    quests: [],
    playerId: 0,
    economy: {
      treasury: 18_000,
      coverage: { treasury: saveCoverage() },
    },
    telemetry: {
      goods: [
        { id: "wood", name: "Timber", amount: 80 },
        { id: "sails", name: "Sails", amount: 40 },
        { id: "weapons", name: "Weapons", amount: 20 },
      ],
      routes: [
        {
          id: 26,
          name: "Tablones La - Les",
          ownerId: 0,
          shipCount: 1,
          ships: [{ name: "Conflicto" }],
          stops: [
            { areaId: 8451, goods: [{ guid: 1010196, id: "wood", name: "Timber", amount: 20 }] },
            { areaId: 9219, goods: [{ guid: 1010196, id: "wood", name: "Timber", amount: 20 }] },
          ],
        },
      ],
      fleet: [
        playerShip({
          name: "Conflicto",
          guid: 100438,
          id: "schooner",
          typeName: "Schooner",
          kind: "trade",
          metaId: 88,
          assignment: { kind: "trade-route", routeId: 26, routeName: "Tablones La - Les" },
        }),
        playerShip({
          name: "Heraldo",
          assignment: { kind: "unknown" },
        }),
      ],
    },
    ...over,
  };
}

export const fleetFixtures = {
  escortAndTrade: baseSnapshot(),
  npcOwnerDropped: {
    ...baseSnapshot(),
    telemetry: {
      ...baseSnapshot().telemetry,
      fleet: [
        playerShip(),
        playerShip({ name: "Blake", ownerId: 2, metaId: 9, guid: 100439 }),
      ],
    },
  },
  noFleet: {
    schema: "harbor-live-v1" as const,
    source: "save" as const,
    updatedAt: savedAt,
    savedAt,
    game: "anno-1800" as const,
    quests: [],
    economy: {
      treasury: 4000,
      coverage: { treasury: saveCoverage() },
    },
  },
  sameShipOnRouteAndFleet: baseSnapshot(),
};
