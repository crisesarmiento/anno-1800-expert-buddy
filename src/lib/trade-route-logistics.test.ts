import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LiveSnapshot, LiveTradeRoute } from "./live/types.ts";
import {
  inferredDeliveryTMin,
  inspectRouteLogistics,
  isGuaranteedSupply,
  loadDirectionOf,
  routeSupplyKind,
  stopIslandName,
} from "./trade-route-logistics.ts";

const configured: LiveTradeRoute = {
  id: 26,
  name: "Tablones La - Les",
  ownerId: 0,
  shipCount: 1,
  stops: [
    { areaId: 8451, goods: [{ guid: 1010196, id: "timber", name: "Tablones", amount: 20 }] },
    {
      areaId: 9219,
      goods: [{ guid: 1010196, id: "timber", name: "Tablones", amount: 20, isLoading: false }],
    },
  ],
};

function snap(over: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    source: "save",
    updatedAt: "2026-09-20T12:00:00.000Z",
    savedAt: "2026-09-20T11:50:00.000Z",
    game: "anno-1800",
    quests: [],
    islandSnapshots: [
      {
        regionId: 180023,
        areaId: 8451,
        ownerId: 0,
        name: "La Costa",
        nameSource: "city-name",
        coverage: { identity: { source: "save" } },
      },
      {
        regionId: 180023,
        areaId: 9219,
        ownerId: 0,
        name: "[20203]",
        nameSource: "neutral",
        coverage: { identity: { source: "save" } },
      },
    ],
    ...over,
  };
}

describe("load/unload honesty", () => {
  it("confirms unload only when IsLoading is present and false", () => {
    assert.deepEqual(loadDirectionOf({ isLoading: false }), {
      direction: "unload",
      evidence: "confirmed",
    });
    assert.deepEqual(loadDirectionOf({ isLoading: true }), {
      direction: "load",
      evidence: "confirmed",
    });
    assert.deepEqual(loadDirectionOf({}), { direction: "unknown", evidence: null });
  });
});

describe("island names from Stage 1 snapshots", () => {
  it("joins a unique areaId and never invents a pretty name", () => {
    const islands = snap().islandSnapshots ?? [];
    assert.equal(stopIslandName(8451, islands)?.name, "La Costa");
    assert.equal(stopIslandName(9219, islands)?.name, "[20203]");
    assert.equal(stopIslandName(1, islands), null);
    assert.equal(stopIslandName(undefined, islands), null);
  });
});

describe("configured is not guaranteed supply", () => {
  it("labels a healthy route without visits as configured-only", () => {
    assert.equal(routeSupplyKind(configured), "configured-only");
    assert.equal(isGuaranteedSupply(configured), false);
    const logistics = inspectRouteLogistics(configured, snap());
    assert.equal(logistics.guaranteedSupply, false);
    assert.equal(logistics.nominalCapacity, null);
    assert.equal(logistics.quantities[0]?.realizedMedian, null);
  });

  it("labels partial realized volume without claiming a full warehouse as the cause", () => {
    const route: LiveTradeRoute = {
      ...configured,
      ships: [{ name: "Conflicto" }],
      delivery: {
        visitCount: 4,
        lastExecutionTime: 31_558_000,
        intervalMsMedian: 240_000,
        goods: [
          {
            guid: 1010196,
            id: "timber",
            name: "Tablones",
            visitCount: 4,
            medianAbsAmount: 12,
            lastAmount: -11,
          },
        ],
      },
    };
    assert.equal(routeSupplyKind(route), "observed-partial");
    assert.equal(isGuaranteedSupply(route), false);
    const logistics = inspectRouteLogistics(route, snap());
    assert.equal(logistics.ships[0], "Conflicto");
    assert.equal(logistics.quantities[0]?.configured, 20);
    assert.equal(logistics.quantities[0]?.realizedMedian, 12);
    assert.equal(logistics.observedTMin, 3);
    assert.equal(logistics.islandByAreaId.get(8451)?.name, "La Costa");
  });

  it("does not treat a global stock drop as a delivery or a cause", () => {
    const logistics = inspectRouteLogistics(
      configured,
      snap({
        telemetry: {
          goodsChanges: [
            {
              id: "timber",
              name: "Tablones",
              previousAmount: 48,
              amount: 31,
              delta: -17,
              previousSavedAt: "2026-09-20T11:40:00.000Z",
            },
          ],
        },
      }),
    );
    assert.equal(logistics.supplyKind, "configured-only");
    assert.equal(logistics.delivery, null);
    assert.equal(logistics.observedTMin, null);
  });
});

describe("observed throughput stays inferred", () => {
  it("needs both interval and realized amount", () => {
    assert.equal(inferredDeliveryTMin(undefined), null);
    assert.equal(
      inferredDeliveryTMin({
        visitCount: 2,
        lastExecutionTime: 1,
        goods: [{ guid: 1, visitCount: 2, medianAbsAmount: 20, lastAmount: 20 }],
      }),
      null,
    );
  });
});
