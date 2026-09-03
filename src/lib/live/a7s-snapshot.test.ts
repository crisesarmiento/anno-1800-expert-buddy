import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lookupGuid } from "../data/guids.ts";
import { snapshotFromScan, type SaveScan } from "./a7s-snapshot.ts";
import { ingestLiveJsonText } from "./validate.ts";

describe("GUID table and FileDB snapshot", () => {
  it("maps lumberjack and money GUIDs", () => {
    assert.equal(lookupGuid(1010266)?.id, "lumberjack");
    assert.equal(lookupGuid(1010017)?.id, "money");
    assert.equal(lookupGuid(1010372)?.id, "marketplace");
  });

  it("builds harbor-live-v1 from a save scan with buildings and goods", () => {
    const scan: SaveScan = {
      sessionName: "Cristian S5",
      buildingCounts: new Map([
        ["lumberjack", { name: "Lumberjack's Hut", count: 3 }],
        ["marketplace", { name: "Marketplace", count: 1 }],
      ]),
      goods: new Map([["wood", { name: "Timber", amount: 42 }]]),
      money: 8840,
      islands: new Set(["old-world"]),
      islandNames: new Map([["old-world", "Old World"]]),
      questGuids: [],
      farmers: true,
      workers: false,
      artisans: false,
      engineers: false,
    };
    const snap = snapshotFromScan(scan, { previousMoney: 9000, savedAt: "2026-09-03T00:00:00.000Z" });
    assert.equal(snap.schema, "harbor-live-v1");
    assert.equal(snap.sessionName, "Cristian S5");
    assert.equal(snap.islandName, "Old World");
    assert.equal(snap.pulseHint?.coins, "down");
    assert.equal(snap.workforce?.farmers, true);
    assert.equal(snap.telemetry?.buildings?.some((row) => row.id === "lumberjack"), true);
    assert.equal(snap.telemetry?.goods?.[0]?.amount, 42);
    const ingested = ingestLiveJsonText(JSON.stringify(snap));
    assert.equal(ingested.ok, true);
    if (!ingested.ok) return;
    assert.equal(ingested.snapshot.telemetry?.goods?.[0]?.id, "wood");
  });
});
