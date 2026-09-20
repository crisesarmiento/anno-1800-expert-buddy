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
  fleetFixtures,
  fleetUpkeepSplit,
  inferSafetyFromAbsentEnemies,
  inventoryFromSnapshot,
  isSurplus,
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
