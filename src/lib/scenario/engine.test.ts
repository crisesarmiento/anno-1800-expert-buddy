import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allocateVerifiedSurplus,
  compareScenarios,
  competingDestinationsBlockDoubleCount,
  cutAdviceFor,
  verifiedSurplusTMin,
} from "./engine.ts";
import type { ScenarioInput, ScenarioIsland } from "./types.ts";

function island(partial: Partial<ScenarioIsland> & Pick<ScenarioIsland, "id" | "name">): ScenarioIsland {
  return {
    world: "old",
    stockAmount: null,
    demandTMin: null,
    capacityTMin: null,
    buildingCount: null,
    pausedCount: null,
    fertility: {},
    resources: {},
    workforceAvailable: {},
    buildings: {},
    reservedExportTMin: null,
    hasOtherConsumers: null,
    transportToConsumerTMin: null,
    routeToConsumerOk: null,
    ...partial,
  };
}

describe("verified surplus", () => {
  it("does not treat high stock as continuous surplus", () => {
    const row = island({
      id: "a",
      name: "Origen",
      stockAmount: 800,
      demandTMin: 2,
      capacityTMin: 2,
    });
    assert.equal(verifiedSurplusTMin(row), 0);
  });

  it("subtracts origin demand and reserved exports", () => {
    const row = island({
      id: "a",
      name: "Origen",
      demandTMin: 1,
      capacityTMin: 4,
      reservedExportTMin: 2,
    });
    assert.equal(verifiedSurplusTMin(row), 1);
  });

  it("stays unknown when capacity or demand is missing", () => {
    assert.equal(
      verifiedSurplusTMin(island({ id: "a", name: "Origen", stockAmount: 50, demandTMin: 1 })),
      null,
    );
  });
});

describe("exit: exporter is not told to cut while consumers exist", () => {
  it("never recommends pause because local demand is below capacity", () => {
    const input: ScenarioInput = {
      consumerId: "180023:1",
      goodId: "fish",
      islands: [
        island({
          id: "180023:1",
          name: "Exportadora",
          demandTMin: 1,
          capacityTMin: 4,
          buildingCount: 2,
          buildings: { fishery: 2 },
          hasOtherConsumers: true,
          reservedExportTMin: 2,
        }),
        island({
          id: "180023:2",
          name: "Consumidora",
          demandTMin: 2,
          capacityTMin: 0,
        }),
      ],
    };
    const advice = cutAdviceFor(input);
    assert.equal(advice.recommendCut, false);
    assert.equal(advice.reason, "consumers");
    const result = compareScenarios(input);
    assert.equal(result.cutAdvice.recommendCut, false);
    assert.ok(result.notes.includes("exporter-has-consumers"));
    assert.ok(!result.alternatives.some((row) => row.kind.includes("cut") || row.kind.includes("pause")));
  });

  it("still refuses cut when consumers are unknown", () => {
    const input: ScenarioInput = {
      consumerId: "180023:1",
      goodId: "fish",
      islands: [
        island({
          id: "180023:1",
          name: "Exportadora",
          demandTMin: 0.5,
          capacityTMin: 2,
          hasOtherConsumers: null,
        }),
      ],
    };
    assert.deepEqual(cutAdviceFor(input), { recommendCut: false, reason: "consumers-unknown" });
  });
});

describe("exit: two destinations do not share the same surplus twice", () => {
  it("allocates a 2 t/min surplus to the first destination only", () => {
    const split = competingDestinationsBlockDoubleCount({
      originSurplusTMin: 2,
      destinations: [
        { id: "dest-a", needTMin: 2 },
        { id: "dest-b", needTMin: 2 },
      ],
    });
    assert.equal(split["dest-a"], 2);
    assert.equal(split["dest-b"], 0);
    assert.equal((split["dest-a"] ?? 0) + (split["dest-b"] ?? 0), 2);
  });

  it("compareScenarios reserves origin exports so a second island cannot claim them", () => {
    const origin = island({
      id: "180023:9",
      name: "Origen",
      demandTMin: 1,
      capacityTMin: 3,
      reservedExportTMin: 2,
      hasOtherConsumers: true,
      transportToConsumerTMin: 4,
      routeToConsumerOk: true,
      resources: { coastline: true },
      workforceAvailable: { farmer: 80 },
    });
    const input: ScenarioInput = {
      consumerId: "180023:2",
      goodId: "fish",
      islands: [
        origin,
        island({
          id: "180023:2",
          name: "Segunda",
          demandTMin: 2,
          capacityTMin: 0,
          buildings: {},
          resources: { coastline: true },
          workforceAvailable: { farmer: 80 },
        }),
      ],
    };
    const result = compareScenarios(input);
    const transport = result.alternatives.find((row) => row.kind === "transport-surplus");
    assert.ok(transport);
    assert.equal(verifiedSurplusTMin(origin), 0);
    assert.equal(transport?.allocatedTMin, 0);
    assert.notEqual(transport?.coversNeed, true);
  });

  it("allocateVerifiedSurplus never exceeds origin surplus across destinations", () => {
    const rows = allocateVerifiedSurplus({
      origins: [{ id: "o", surplusTMin: 3 }],
      destinations: [
        { id: "a", needTMin: 2 },
        { id: "b", needTMin: 2 },
      ],
    });
    const total = rows.reduce((sum, row) => sum + row.amountTMin, 0);
    assert.equal(total, 3);
    assert.equal(rows.find((row) => row.destinationId === "a")?.amountTMin, 2);
    assert.equal(rows.find((row) => row.destinationId === "b")?.amountTMin, 1);
  });
});

describe("exit: impossible alternative cannot win on cost", () => {
  it("does not pick a cheaper local chain when the island lacks the resource", () => {
    const input: ScenarioInput = {
      consumerId: "180023:1",
      goodId: "fish",
      islands: [
        island({
          id: "180023:1",
          name: "Sin costa",
          demandTMin: 2,
          capacityTMin: 0,
          buildings: {},
          resources: { coastline: false },
          fertility: {},
          workforceAvailable: { farmer: 80 },
        }),
        island({
          id: "180023:2",
          name: "Con pescaderías",
          demandTMin: 0,
          capacityTMin: 4,
          buildings: { fishery: 2 },
          reservedExportTMin: 0,
          hasOtherConsumers: false,
          transportToConsumerTMin: 4,
          routeToConsumerOk: true,
          resources: { coastline: true },
          workforceAvailable: { farmer: 80 },
        }),
      ],
    };
    const result = compareScenarios(input);
    const local = result.alternatives.find((row) => row.kind === "build-local-chain");
    const transport = result.alternatives.find((row) => row.kind === "transport-surplus");
    assert.equal(local?.viability, "impossible");
    assert.ok(local?.blockers.some((row) => row.startsWith("resource:")));
    assert.equal(transport?.viability, "viable");
    assert.equal(result.verdict.kind, "pick");
    if (result.verdict.kind === "pick") {
      assert.equal(result.verdict.winner, "transport-surplus");
      assert.notEqual(result.verdict.winner, "build-local-chain");
      assert.notEqual(result.verdict.winner, "expand-local");
    }
  });

  it("does not pick a cheaper expand when workforce is not enough", () => {
    const input: ScenarioInput = {
      consumerId: "180023:1",
      goodId: "fish",
      islands: [
        island({
          id: "180023:1",
          name: "Sin manos",
          demandTMin: 4,
          capacityTMin: 2,
          buildingCount: 1,
          buildings: { fishery: 1 },
          resources: { coastline: true },
          workforceAvailable: { farmer: 0 },
        }),
        island({
          id: "180023:2",
          name: "Origen",
          demandTMin: 0,
          capacityTMin: 4,
          buildings: { fishery: 2 },
          reservedExportTMin: 0,
          hasOtherConsumers: false,
          transportToConsumerTMin: 4,
          routeToConsumerOk: true,
          resources: { coastline: true },
          workforceAvailable: { farmer: 80 },
        }),
      ],
    };
    const result = compareScenarios(input);
    const expand = result.alternatives.find((row) => row.kind === "expand-local");
    assert.equal(expand?.viability, "impossible");
    assert.ok(expand?.blockers.some((row) => row.startsWith("workforce:")));
    assert.equal(result.verdict.kind, "pick");
    if (result.verdict.kind === "pick") {
      assert.equal(result.verdict.winner, "transport-surplus");
    }
  });
});

describe("scenario honesty", () => {
  it("says data is missing instead of inventing a winner", () => {
    const result = compareScenarios({
      consumerId: "180023:1",
      goodId: "schnapps",
      islands: [
        island({
          id: "180023:1",
          name: "La Costa",
          stockAmount: 40,
          buildings: { distillery: 1 },
        }),
      ],
    });
    assert.equal(result.neededTMin, null);
    assert.equal(result.verdict.kind, "insufficient-data");
    if (result.verdict.kind === "insufficient-data") {
      assert.equal(result.verdict.nextDatum, "consumer-demand");
    }
    assert.equal(result.evidence, "inferred");
    for (const alt of result.alternatives) {
      assert.equal(alt.roi, null);
      assert.equal(alt.savings, null);
    }
  });

  it("does not claim already-covered local demand as a pause", () => {
    const result = compareScenarios({
      consumerId: "180023:1",
      goodId: "fish",
      islands: [
        island({
          id: "180023:1",
          name: "La Costa",
          demandTMin: 2,
          capacityTMin: 2,
          buildings: { fishery: 1 },
          resources: { coastline: true },
          workforceAvailable: { farmer: 40 },
        }),
      ],
    });
    assert.equal(result.verdict.kind, "already-covered");
    assert.equal(result.cutAdvice.recommendCut, false);
  });
});

describe("P1-A incremental capacity", () => {
  it("does not treat one existing fishery as if three were missing from zero", () => {
    const result = compareScenarios({
      consumerId: "180023:1",
      goodId: "fish",
      islands: [
        island({
          id: "180023:1",
          name: "La Costa",
          demandTMin: 6,
          capacityTMin: 2,
          buildingCount: 1,
          buildings: { fishery: 1 },
          resources: { coastline: true },
          workforceAvailable: { farmer: 80 },
        }),
      ],
    });
    assert.equal(result.neededTMin, 4);
    const chain = result.alternatives.find((row) => row.kind === "build-local-chain");
    const expand = result.alternatives.find((row) => row.kind === "expand-local");
    assert.equal(chain?.buildingsToAdd.fishery, 2);
    assert.equal(expand?.buildingsToAdd.fishery, 2);
    assert.equal(chain?.allocatedTMin, 4);
    assert.equal(expand?.allocatedTMin, 4);
    assert.equal(chain?.coversNeed, true);
    assert.notEqual(chain?.buildingsToAdd.fishery, 1);
  });

  it("keeps a partial schnapps chain and production below 100%", () => {
    const result = compareScenarios({
      consumerId: "180023:1",
      goodId: "schnapps",
      islands: [
        island({
          id: "180023:1",
          name: "La Costa",
          demandTMin: 4,
          capacityTMin: 1,
          buildingCount: 1,
          buildings: { distillery: 1 },
          fertility: { potato: true },
          workforceAvailable: { farmer: 200 },
        }),
      ],
    });
    const chain = result.alternatives.find((row) => row.kind === "build-local-chain");
    assert.ok((chain?.buildingsToAdd.distillery ?? 0) >= 3);
    assert.ok((chain?.buildingsToAdd.potato ?? 0) >= 3);
    assert.equal(chain?.coversNeed, true);
  });
});

describe("P1-A unknown reserves and origin transport", () => {
  it("does not treat unknown reserved exports as zero surplus", () => {
    const origin = island({
      id: "180023:9",
      name: "Origen",
      demandTMin: 1,
      capacityTMin: 6,
      reservedExportTMin: null,
      hasOtherConsumers: true,
      transportToConsumerTMin: 4,
      routeToConsumerOk: true,
    });
    assert.equal(verifiedSurplusTMin(origin), null);
    const result = compareScenarios({
      consumerId: "180023:2",
      goodId: "fish",
      islands: [
        origin,
        island({
          id: "180023:2",
          name: "Consumidora",
          demandTMin: 2,
          capacityTMin: 0,
          resources: { coastline: true },
          workforceAvailable: { farmer: 80 },
        }),
      ],
    });
    const transport = result.alternatives.find((row) => row.kind === "transport-surplus");
    const expand = result.alternatives.find((row) => row.kind === "expand-origin-and-transport");
    assert.notEqual(transport?.coversNeed, true);
    assert.ok(expand?.missing.includes("origin-demand"));
    assert.notEqual(expand?.viability, "viable");
  });

  it("picks the origin with viable transport over a larger stranded surplus", () => {
    const result = compareScenarios({
      consumerId: "180023:1",
      goodId: "fish",
      islands: [
        island({
          id: "180023:1",
          name: "Consumidora",
          demandTMin: 2,
          capacityTMin: 0,
          resources: { coastline: false },
          workforceAvailable: { farmer: 80 },
        }),
        island({
          id: "180023:8",
          name: "Sin barco",
          demandTMin: 0,
          capacityTMin: 8,
          reservedExportTMin: 0,
          hasOtherConsumers: false,
          transportToConsumerTMin: null,
          routeToConsumerOk: null,
          resources: { coastline: true },
          workforceAvailable: { farmer: 80 },
        }),
        island({
          id: "180023:9",
          name: "Con ruta",
          demandTMin: 0,
          capacityTMin: 2,
          reservedExportTMin: 0,
          hasOtherConsumers: false,
          transportToConsumerTMin: 2,
          routeToConsumerOk: true,
          resources: { coastline: true },
          workforceAvailable: { farmer: 80 },
        }),
      ],
    });
    const transport = result.alternatives.find((row) => row.kind === "transport-surplus");
    assert.equal(transport?.originId, "180023:9");
    assert.equal(transport?.allocatedTMin, 2);
    assert.equal(transport?.viability, "viable");
  });
});

describe("P1-A inputs and free workforce", () => {
  it("does not call expand-local viable when the extra factory has no inputs", () => {
    const result = compareScenarios({
      consumerId: "180023:1",
      goodId: "schnapps",
      islands: [
        island({
          id: "180023:1",
          name: "La Costa",
          demandTMin: 4,
          capacityTMin: 2,
          buildingCount: 1,
          buildings: { distillery: 1 },
          fertility: { potato: true },
          workforceAvailable: { farmer: 200 },
        }),
      ],
    });
    const expand = result.alternatives.find((row) => row.kind === "expand-local");
    assert.equal(expand?.viability, "impossible");
    assert.ok(expand?.blockers.some((row) => row.startsWith("inputs:")));
  });
});

describe("P2-B: full material bill, every origin, no lowest-investment shortcut", () => {
  it("lists the direct input good for expand-local, not only the final good", () => {
    const result = compareScenarios({
      consumerId: "180023:1",
      goodId: "schnapps",
      islands: [
        island({
          id: "180023:1",
          name: "La Costa",
          demandTMin: 4,
          capacityTMin: 2,
          buildingCount: 1,
          buildings: { distillery: 1, potato: 50 },
          fertility: { potato: true },
          workforceAvailable: { farmer: 200 },
        }),
      ],
    });
    const expand = result.alternatives.find((row) => row.kind === "expand-local");
    assert.ok((expand?.materialsNeeded.potato ?? 0) > 0);
  });

  it("compares every pertinent origin instead of a single picked one", () => {
    const result = compareScenarios({
      consumerId: "180023:1",
      goodId: "fish",
      islands: [
        island({
          id: "180023:1",
          name: "Consumidora",
          demandTMin: 4,
          capacityTMin: 0,
          resources: { coastline: false },
          workforceAvailable: { farmer: 80 },
        }),
        island({
          id: "180023:8",
          name: "Origen A",
          demandTMin: 0,
          capacityTMin: 3,
          reservedExportTMin: 0,
          hasOtherConsumers: false,
          transportToConsumerTMin: 3,
          routeToConsumerOk: true,
          resources: { coastline: true },
          workforceAvailable: { farmer: 80 },
        }),
        island({
          id: "180023:9",
          name: "Origen B",
          demandTMin: 0,
          capacityTMin: 5,
          reservedExportTMin: 0,
          hasOtherConsumers: false,
          transportToConsumerTMin: 5,
          routeToConsumerOk: true,
          resources: { coastline: true },
          workforceAvailable: { farmer: 80 },
        }),
      ],
    });
    const transportAlts = result.alternatives.filter((row) => row.kind === "transport-surplus");
    const expandAlts = result.alternatives.filter((row) => row.kind === "expand-origin-and-transport");
    assert.equal(transportAlts.length, 2);
    assert.equal(expandAlts.length, 2);
    assert.deepEqual(
      new Set(transportAlts.map((row) => row.originId)),
      new Set(["180023:8", "180023:9"]),
    );
  });

  it("does not treat an unknown recurrent maintenance as a zero-cost tiebreaker", () => {
    const result = compareScenarios({
      consumerId: "180023:1",
      goodId: "schnapps",
      islands: [
        island({
          id: "180023:1",
          name: "Isla nueva",
          demandTMin: 1,
          capacityTMin: 0,
          buildingCount: 0,
          buildings: {},
          fertility: { potato: true },
          workforceAvailable: { farmer: 200 },
        }),
      ],
    });
    const chain = result.alternatives.find((row) => row.kind === "build-local-chain");
    // Exactly the perfect chain (1 potato + 1 distillery): construction cost is known...
    assert.notEqual(chain?.investment.coins, null);
    // ...but per-building maintenance for potato/distillery is not in the catalog.
    assert.equal(chain?.recurrentMaintenance, null);
    assert.ok(chain?.missing.includes("investment"));
    assert.notEqual(chain?.viability, "viable");
    assert.equal(result.verdict.kind, "insufficient-data");
    if (result.verdict.kind === "insufficient-data") {
      assert.equal(result.verdict.nextDatum, "investment");
    }
  });
});

