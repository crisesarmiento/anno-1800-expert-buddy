import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LiveSnapshot } from "../live/types.ts";
import { goodsOnSnapshot, observeScenario } from "./observe.ts";

function snap(partial: Partial<LiveSnapshot>): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    source: "save",
    updatedAt: "2026-09-19T12:00:00.000Z",
    savedAt: "2026-09-19T11:50:00.000Z",
    game: "anno-1800",
    quests: [],
    ...partial,
  };
}

describe("observeScenario", () => {
  it("copies island stock without turning it into surplus fields", () => {
    const live = snap({
      islandSnapshots: [
        {
          regionId: 180023,
          areaId: 8451,
          ownerId: 0,
          name: "La Costa",
          nameSource: "city-name",
          stock: [{ id: "wood", name: "Timber", amount: 80 }],
          coverage: { identity: { source: "save" }, stock: { source: "save" } },
        },
      ],
    });
    const input = observeScenario({
      snapshot: live,
      consumerId: "180023:8451",
      goodId: "timber",
    });
    assert.equal(input.islands[0]?.stockAmount, 80);
    assert.equal(input.islands[0]?.demandTMin, null);
    assert.equal(input.islands[0]?.capacityTMin, null);
    assert.equal(input.islands[0]?.transportToConsumerTMin, null);
    assert.deepEqual(goodsOnSnapshot(live), ["timber"]);
  });

  it("marks a competing destination from a player route without inventing t/min", () => {
    const live = snap({
      telemetry: {
        routes: [
          {
            name: "Pescado",
            ownerId: 0,
            shipCount: 1,
            stops: [
              { areaId: 8451, goods: [{ guid: 1010200, id: "fish", name: "Fish", amount: 20 }] },
              { areaId: 9219, goods: [{ guid: 1010200, id: "fish", name: "Fish", amount: 20 }] },
            ],
          },
        ],
      },
      islandSnapshots: [
        {
          regionId: 180023,
          areaId: 8451,
          ownerId: 0,
          name: "Origen",
          nameSource: "city-name",
          coverage: { identity: { source: "save" } },
        },
        {
          regionId: 180023,
          areaId: 9219,
          ownerId: 0,
          name: "Destino A",
          nameSource: "city-name",
          coverage: { identity: { source: "save" } },
        },
        {
          regionId: 180023,
          areaId: 9001,
          ownerId: 0,
          name: "Destino B",
          nameSource: "city-name",
          coverage: { identity: { source: "save" } },
        },
      ],
    });
    const forB = observeScenario({ snapshot: live, consumerId: "180023:9001", goodId: "fish" });
    const origin = forB.islands.find((row) => row.id === "180023:8451");
    assert.equal(origin?.hasOtherConsumers, true);
    assert.equal(origin?.reservedExportTMin, null);
    assert.equal(origin?.transportToConsumerTMin, null);
  });
});
