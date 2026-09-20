import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ingestLiveJsonText } from "../live/validate.ts";
import {
  automaticGameActions,
  compareNewBuild,
  coverageFromSnapshot,
  doubleCountRouteAndFleet,
  effectiveRole,
  fleetAdvice,
  fleetRoleInventory,
  rolesForCampaign,
  setRoleOnCampaign,
  fleetFixtures,
  fleetUpkeepSplit,
  inferSafetyFromAbsentEnemies,
  inventoryFromSnapshot,
  isSurplus,
  playerShip,
  promiseCombatOutcome,
  recommendDismantleBecauseExpensive,
  surplusLabel,
  uniquePlayerShips,
} from "./index.ts";

describe("etapa 6 fleet honesty", () => {
  it("never labels an escort fleet as surplus", () => {
    const snapshot = fleetFixtures.escortAndTrade;
    const ships = inventoryFromSnapshot(snapshot);
    const escort = ships.find((row) => row.ship.name === "Heraldo");
    assert.ok(escort);
    const roles = { [escort.key]: "escort" as const };
    assert.equal(surplusLabel(escort, roles), "committed");
    assert.equal(isSurplus(escort, roles), false);
    assert.equal(effectiveRole(escort, roles), "escort");
    const advice = fleetAdvice(snapshot, roles);
    assert.deepEqual(advice.surplusKeys, []);
    assert.equal(advice.surplusKeys.length, 0);
  });

  it("incomplete military information explicitly limits advice", () => {
    const coverage = coverageFromSnapshot(fleetFixtures.escortAndTrade);
    assert.equal(coverage.risk, "not-evaluable");
    assert.equal(coverage.label, "riesgo no evaluable");
    assert.equal(coverage.adviceLimited, true);
    assert.equal(coverage.diplomacy, "missing");
    assert.equal(coverage.defenses, "missing");
    assert.equal(coverage.enemiesAbsentIsNotSafety, true);
    assert.equal(inferSafetyFromAbsentEnemies(0), false);
    const advice = fleetAdvice(fleetFixtures.escortAndTrade);
    assert.equal(advice.incompleteLimitsAdvice, true);
    const empty = fleetAdvice(fleetFixtures.noFleet);
    assert.equal(empty.incompleteLimitsAdvice, true);
    assert.equal(empty.ships.length, 0);
  });

  it("emits zero automatic actions on the game", () => {
    assert.deepEqual(automaticGameActions(), []);
    assert.equal(fleetAdvice(fleetFixtures.escortAndTrade).automaticGameActions.length, 0);
  });

  it("keeps player ships only and does not double-count route names", () => {
    const mixed = uniquePlayerShips(fleetFixtures.npcOwnerDropped.telemetry?.fleet);
    assert.equal(mixed.every((ship) => ship.ownerId === 0), true);
    assert.equal(mixed.some((ship) => ship.name === "Blake"), false);
    const rows = inventoryFromSnapshot(fleetFixtures.sameShipOnRouteAndFleet);
    assert.equal(rows.filter((row) => row.ship.name === "Conflicto").length, 1);
    const routeCount = fleetFixtures.sameShipOnRouteAndFleet.telemetry?.routes?.[0]?.shipCount ?? 0;
    assert.equal(doubleCountRouteAndFleet(routeCount, rows.length), rows.length);
  });

  it("folds inferred catalog upkeep without treating ConstructionAI as confirmed", () => {
    const rows = inventoryFromSnapshot(fleetFixtures.escortAndTrade);
    const split = fleetUpkeepSplit(rows);
    assert.equal(split.honesty, "inferred");
    assert.equal(split.ownerValidated, true);
    assert.equal(split.uniqueShips, 2);
    assert.equal(split.trade, 15);
    assert.equal(split.military, 100);
    assert.equal(split.total, 115);
    assert.equal(
      rows.find((row) => row.ship.name === "Conflicto")?.honesty.maintenance,
      "inferred",
    );
  });

  it("does not recommend dismantling a defense because it is expensive", () => {
    const compare = compareNewBuild("frigate", fleetFixtures.escortAndTrade);
    assert.equal(compare.recommendDismantleDefense, false);
    assert.equal(compare.promiseCombatOutcome, false);
    assert.equal(recommendDismantleBecauseExpensive(400), false);
    assert.equal(promiseCombatOutcome("win"), false);
    assert.equal(compare.honesty, "inferred");
    assert.equal(compare.purchase, 20000);
    assert.equal(compare.purchaseFitsBudget, false);
    assert.equal(compare.materialsCovered, true);
  });

  it("drops a non-player ship at ingest and keeps a missing fleet omitted", () => {
    const raw = {
      schema: "harbor-live-v1",
      source: "save",
      updatedAt: "2026-09-20T12:00:00.000Z",
      game: "anno-1800",
      quests: [],
      telemetry: {
        fleet: [
          {
            name: "Heraldo",
            ownerId: 0,
            guid: 100439,
            coverage: { identity: { source: "save", scope: "player" } },
          },
          {
            name: "Blake",
            ownerId: 2,
            guid: 100439,
            coverage: { identity: { source: "save", scope: "npc" } },
          },
        ],
      },
    };
    const result = ingestLiveJsonText(JSON.stringify(raw));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.snapshot.telemetry?.fleet?.length, 1);
    assert.equal(result.snapshot.telemetry?.fleet?.[0]?.name, "Heraldo");
    const missing = ingestLiveJsonText(
      JSON.stringify({
        schema: "harbor-live-v1",
        source: "save",
        updatedAt: "2026-09-20T12:00:00.000Z",
        game: "anno-1800",
        quests: [],
      }),
    );
    assert.equal(missing.ok && missing.snapshot.telemetry?.fleet, undefined);
  });
});

describe("P1-A hull identity and campaign-scoped roles", () => {
  it("does not treat two ships with the same name as one hull", () => {
    const snapshot = {
      ...fleetFixtures.escortAndTrade,
      telemetry: {
        ...fleetFixtures.escortAndTrade.telemetry,
        fleet: [
          playerShip({ name: "Conflicto", guid: 100438, id: "schooner", metaId: undefined, location: { areaId: 8451 } }),
          playerShip({ name: "Conflicto", guid: 100438, id: "schooner", metaId: undefined, location: { areaId: 8451 } }),
        ],
      },
    };
    const unique = uniquePlayerShips(snapshot.telemetry?.fleet);
    assert.equal(unique.length, 2);
    const rows = inventoryFromSnapshot(snapshot);
    assert.equal(rows.length, 2);
    assert.notEqual(rows[0]?.key, rows[1]?.key);
  });

  it("keeps military roles isolated per campaign", () => {
    const escort = inventoryFromSnapshot(fleetFixtures.escortAndTrade).find(
      (row) => row.ship.name === "Heraldo",
    );
    assert.ok(escort);
    const stored = setRoleOnCampaign({}, "camp-a", escort.key, "escort");
    assert.equal(rolesForCampaign(stored, "camp-a")[escort.key], "escort");
    assert.equal(rolesForCampaign(stored, "camp-b")[escort.key], undefined);
    assert.deepEqual(rolesForCampaign(stored, "camp-b"), {});
  });
});

describe("P2-C explicit coverage inventory", () => {
  it("counts each ship under exactly one role, defaulting trade/unknown from assignment", () => {
    const ships = inventoryFromSnapshot(fleetFixtures.escortAndTrade);
    const inventory = fleetRoleInventory(ships);
    assert.equal(inventory.total, 2);
    assert.equal(inventory.trade, 1);
    assert.equal(inventory.unknown, 1);
    assert.equal(inventory.escort, 0);
    assert.equal(inventory.defense, 0);
    assert.equal(inventory.idle, 0);

    const heraldo = ships.find((row) => row.ship.name === "Heraldo");
    assert.ok(heraldo);
    const withEscort = fleetRoleInventory(ships, { [heraldo.key]: "escort" });
    assert.equal(withEscort.escort, 1);
    assert.equal(withEscort.unknown, 0);
    assert.equal(withEscort.total, 2);

    const empty = fleetRoleInventory(inventoryFromSnapshot(fleetFixtures.noFleet));
    assert.equal(empty.total, 0);
    assert.equal(fleetAdvice(fleetFixtures.escortAndTrade).roleInventory.total, 2);
  });
});

describe("P2-C materials scoped to the shipyard's island", () => {
  it("uses per-island stock when an island id is given, and says so", () => {
    const snapshot = {
      ...fleetFixtures.escortAndTrade,
      islandSnapshots: [
        {
          regionId: 1,
          areaId: 8451,
          ownerId: 0,
          name: "La Inapetente",
          nameSource: "city-name" as const,
          stock: [
            { id: "wood", name: "Timber", amount: 5 },
            { id: "sails", name: "Sails", amount: 5 },
            { id: "weapons", name: "Weapons", amount: 5 },
          ],
          coverage: { identity: { source: "save" as const, observedAt: "2026-09-20T12:00:00.000Z" } },
        },
      ],
    };
    const scoped = compareNewBuild("frigate", snapshot, "1:8451");
    assert.equal(scoped.materialsScope, "island");
    assert.equal(scoped.materialsIslandName, "La Inapetente");
    // Frigate needs wood 40 / sails 20 / weapons 15; this island only has 5 of each.
    assert.equal(scoped.materialsCovered, false);

    const global = compareNewBuild("frigate", snapshot);
    assert.equal(global.materialsScope, "global");
    assert.equal(global.materialsIslandName, null);
    // Save-wide telemetry.goods (wood 80 / sails 40 / weapons 20) does cover it.
    assert.equal(global.materialsCovered, true);

    const missingIsland = compareNewBuild("frigate", snapshot, "9:9999");
    assert.equal(missingIsland.materialsScope, "unknown");
    assert.equal(missingIsland.materialsKnown, false);
    assert.ok(missingIsland.missing.includes("island"));
  });
});
