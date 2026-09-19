import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LiveProductionMetric, LiveSnapshot } from "./live/types.ts";
import { analyzeNativeProduction, nativeProductionEvidence } from "./native-production.ts";

function snapshot(production: LiveProductionMetric[]): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    source: "save",
    updatedAt: "2026-09-15T12:00:00.000Z",
    game: "anno-1800",
    quests: [],
    telemetry: { production },
  };
}

const observedAt = "2026-09-15T11:59:58.000Z";

describe("native OCR production advice", () => {
  it("detects a missing factory from island-specific count, demand and productivity", () => {
    const rows = analyzeNativeProduction(
      snapshot([
        {
          guid: 1010278,
          id: "fishery",
          name: "Fishery",
          observedAt,
          islandName: "La Inapetente",
          buildingCount: 1,
          requiredTMin: 3.5,
          productivity: 100,
        },
      ]),
    );
    assert.equal(rows[0]?.status, "falta");
    assert.equal(rows[0]?.recommendedCount, 2);
    assert.equal(rows[0]?.capacityTMin, 2);
    assert.equal(rows[0]?.islandName, "La Inapetente");
  });

  it("detects factories that can be paused without using save-wide counts", () => {
    const rows = analyzeNativeProduction(
      snapshot([
        {
          guid: 1010312,
          id: "distillery",
          name: "Schnapps Distillery",
          observedAt,
          buildingCount: 3,
          requiredTMin: 2,
          productivity: 100,
        },
      ]),
    );
    assert.equal(rows[0]?.status, "sobra");
    assert.equal(rows[0]?.pauseCount, 2);
  });

  it("does not advise until Finance supplied a factory count", () => {
    const live = snapshot([
      {
        guid: 1010278,
        id: "fishery",
        name: "Fishery",
        observedAt,
        requiredTMin: 3.5,
        productivity: 100,
      },
    ]);
    assert.deepEqual(analyzeNativeProduction(live), []);
    assert.deepEqual(nativeProductionEvidence(live), {
      productionRows: 1,
      withFactoryCount: 0,
      analyzable: 0,
    });
  });

  it("carries buildingCountObservedAt through so Finance freshness stays independent of Production", () => {
    const rows = analyzeNativeProduction(
      snapshot([
        {
          guid: 1010278,
          id: "fishery",
          name: "Fishery",
          observedAt,
          buildingCountObservedAt: "2026-09-15T11:30:00.000Z",
          buildingCount: 1,
          requiredTMin: 3.5,
          productivity: 100,
        },
      ]),
    );
    assert.equal(rows[0]?.observedAt, observedAt);
    assert.equal(rows[0]?.buildingCountObservedAt, "2026-09-15T11:30:00.000Z");
  });

  it("ignores unknown GUIDs instead of inventing a cycle rate", () => {
    assert.deepEqual(
      analyzeNativeProduction(
        snapshot([
          {
            guid: 999999,
            id: "unknown-factory",
            name: "Unknown",
            observedAt,
            buildingCount: 5,
            requiredTMin: 1,
            productivity: 100,
          },
        ]),
      ),
      [],
    );
  });
});
