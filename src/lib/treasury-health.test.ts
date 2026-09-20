import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryFollowUpStore } from "./history/follow-up.ts";
import type { HistorySample } from "./history/types.ts";
import {
  essentialStockDrops,
  observedAfterChange,
  treasuryHealth,
} from "./treasury-health.ts";

function sample(
  over: Partial<HistorySample> &
    Pick<HistorySample, "id"> & { treasury?: number; simTime?: number; wood?: number },
): HistorySample {
  const at = new Date(Date.UTC(2026, 8, 20, 12, over.simTime ?? 0)).toISOString();
  return {
    campaignId: "camp",
    branchId: "main",
    recordedAt: at,
    contentHash: over.id,
    summary: {
      islands: [
        {
          regionId: 180023,
          areaId: 8451,
          ownerId: 0,
          name: "La Costa",
          stock:
            over.wood != null ? [{ id: "wood", name: "Timber", amount: over.wood }] : undefined,
        },
      ],
      treasury: over.treasury,
    },
    simTime: over.simTime,
    savedAt: at,
    ...over,
  };
}

describe("treasuryHealth", () => {
  it("does not call an isolated purchase a recurrent deficit", () => {
    const verdict = treasuryHealth([
      sample({ id: "a", treasury: 5000, simTime: 100 }),
      sample({ id: "b", treasury: 1200, simTime: 200 }),
      sample({ id: "c", treasury: 1800, simTime: 300 }),
    ]);
    assert.equal(verdict.kind, "isolated");
  });

  it("flags a hole that keeps growing across three saves", () => {
    const verdict = treasuryHealth([
      sample({ id: "a", treasury: 5000, simTime: 100 }),
      sample({ id: "b", treasury: 3500, simTime: 200 }),
      sample({ id: "c", treasury: 2000, simTime: 300 }),
    ]);
    assert.equal(verdict.kind, "recurrent");
    if (verdict.kind !== "recurrent") return;
    assert.equal(verdict.from, 5000);
    assert.equal(verdict.to, 2000);
    assert.equal(verdict.drops, 2);
  });

  it("stays incomplete without treasury or a second sample", () => {
    assert.equal(treasuryHealth([]).kind, "incomplete");
    assert.equal(treasuryHealth([sample({ id: "a", treasury: 10, simTime: 1 })]).kind, "incomplete");
    assert.equal(treasuryHealth([sample({ id: "a", simTime: 1 })]).kind, "incomplete");
  });
});

describe("essentialStockDrops", () => {
  it("needs two comparable drops of the same essential good", () => {
    const rows = [
      sample({ id: "a", simTime: 100, wood: 80 }),
      sample({ id: "b", simTime: 200, wood: 50 }),
      sample({ id: "c", simTime: 300, wood: 20 }),
    ];
    const drops = essentialStockDrops(rows);
    assert.equal(drops.length, 1);
    assert.equal(drops[0]?.id, "wood");
    assert.equal(drops[0]?.pairs, 2);
  });

  it("ignores a one-off drop", () => {
    const rows = [
      sample({ id: "a", simTime: 100, wood: 80 }),
      sample({ id: "b", simTime: 200, wood: 50 }),
      sample({ id: "c", simTime: 300, wood: 55 }),
    ];
    assert.equal(essentialStockDrops(rows).length, 0);
  });

  it("does not add two one-off island drops into one global alert", () => {
    const at = (simTime: number) => new Date(Date.UTC(2026, 8, 20, 12, simTime)).toISOString();
    function multi(
      id: string,
      simTime: number,
      costa: number,
      other: number,
    ): HistorySample {
      const stamp = at(simTime);
      return {
        id,
        campaignId: "camp",
        branchId: "main",
        recordedAt: stamp,
        contentHash: id,
        simTime,
        savedAt: stamp,
        summary: {
          islands: [
            {
              regionId: 180023,
              areaId: 8451,
              ownerId: 0,
              name: "La Costa",
              stock: [{ id: "wood", name: "Timber", amount: costa }],
            },
            {
              regionId: 180023,
              areaId: 9219,
              ownerId: 0,
              name: "Otra",
              stock: [{ id: "wood", name: "Timber", amount: other }],
            },
          ],
        },
      };
    }
    const drops = essentialStockDrops([
      multi("a", 100, 80, 80),
      multi("b", 200, 50, 80),
      multi("c", 300, 50, 40),
    ]);
    assert.equal(drops.length, 0);
  });

  it("keeps a repeated drop on one island and a global total as separate series", () => {
    const at = (simTime: number) => new Date(Date.UTC(2026, 8, 20, 12, simTime)).toISOString();
    function row(
      id: string,
      simTime: number,
      islandWood: number,
      globalWood: number,
    ): HistorySample {
      const stamp = at(simTime);
      return {
        id,
        campaignId: "camp",
        branchId: "main",
        recordedAt: stamp,
        contentHash: id,
        simTime,
        savedAt: stamp,
        summary: {
          islands: [
            {
              regionId: 180023,
              areaId: 8451,
              ownerId: 0,
              name: "La Costa",
              stock: [{ id: "wood", name: "Timber", amount: islandWood }],
            },
          ],
          globalGoods: [{ id: "wood", name: "Timber", amount: globalWood }],
        },
      };
    }
    const drops = essentialStockDrops([
      row("a", 100, 80, 200),
      row("b", 200, 50, 180),
      row("c", 300, 20, 150),
    ]);
    assert.equal(drops.length, 2);
    assert.equal(drops.filter((item) => item.scope === "island").length, 1);
    assert.equal(drops.filter((item) => item.scope === "global").length, 1);
    assert.equal(drops.find((item) => item.scope === "island")?.areaId, 8451);
  });
});

describe("follow-up store", () => {
  it("keeps applied changes per campaign without claiming a cause", async () => {
    const store = createMemoryFollowUpStore();
    await store.record({ campaignId: "a", branchId: "main", sampleId: "s1" });
    assert.equal((await store.list("a")).length, 1);
    assert.equal((await store.list("b")).length, 0);
  });
});

describe("observedAfterChange", () => {
  it("reports the later cash without claiming the change caused it", () => {
    const rows = [
      sample({ id: "a", treasury: 4000, simTime: 1 }),
      sample({ id: "b", treasury: 2500, simTime: 2 }),
    ];
    assert.equal(observedAfterChange(rows, "a").kind, "down");
    assert.equal(observedAfterChange(rows, "missing").kind, "unknown");
  });
});
