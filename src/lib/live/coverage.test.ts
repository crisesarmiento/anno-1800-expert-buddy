import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCoverage, harborWatcherReader, coverageIsUnavailable } from "./coverage.ts";
import type { LiveSnapshot } from "./types.ts";

function baseSnapshot(over: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    source: "save",
    updatedAt: "2026-09-20T12:00:00.000Z",
    game: "anno-1800",
    quests: [],
    ...over,
  };
}

describe("P1-B reader coverage", () => {
  it("exposes watcher version and capabilities without inventing income", () => {
    const reader = harborWatcherReader();
    assert.equal(reader.id, "harbor-watcher");
    assert.equal(reader.engine, "a7s-scan");
    assert.match(reader.version, /^\d+\.\d+\.\d+$/);
    assert.ok(reader.capabilities.includes("islandSnapshots"));
    assert.ok(!reader.capabilities.includes("income" as never));
  });

  it("marks quests empty-on-purpose and income/maintenance unavailable", () => {
    const coverage = buildCoverage(
      baseSnapshot({
        reader: harborWatcherReader(),
        islandSnapshots: [
          {
            regionId: 1,
            areaId: 10,
            ownerId: 0,
            name: "La Inapetente",
            nameSource: "city-name",
            coverage: { identity: { source: "save", scope: "player" } },
            stock: [{ id: "fish", name: "Fish", amount: 12 }],
          },
        ],
        telemetry: { buildings: [{ id: "fishery", name: "Fishery", count: 1 }], goods: [{ id: "fish", name: "Fish", amount: 12 }] },
        economy: { treasury: 1000, coverage: { treasury: { source: "save", scope: "player" } } },
      }),
    );
    const quests = coverage.fields.find((f) => f.field === "quests");
    assert.equal(quests?.status, "unavailable");
    assert.equal(quests?.reason, "empty-on-purpose");
    assert.equal(coverageIsUnavailable(coverage, "income"), true);
    assert.equal(coverageIsUnavailable(coverage, "maintenance"), true);
    assert.equal(coverage.fields.find((f) => f.field === "islandStock")?.status, "present");
    assert.equal(coverage.fields.find((f) => f.field === "islandNames")?.status, "present");
  });

  it("treats GUID city names as present rename evidence, not invented labels", () => {
    const coverage = buildCoverage(
      baseSnapshot({
        islandSnapshots: [
          {
            regionId: 1,
            areaId: 11,
            ownerId: 0,
            name: "[12345]",
            nameSource: "city-name-guid",
            coverage: { identity: { source: "save", scope: "player" } },
          },
        ],
      }),
    );
    const named = coverage.fields.find((f) => f.field === "islandNames");
    assert.equal(named?.status, "present");
    assert.equal(named?.count, 1);
  });
});
