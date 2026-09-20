import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lookupGuid } from "../data/guids.ts";
import { deskCalmUmbral } from "../session-desk.ts";
import { housesHint, pulseHintFromScan, snapshotFromScan, type SaveScan } from "./a7s-snapshot.ts";
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
      storageOwner: "player",
      islands: new Set(["old-world"]),
      islandNames: new Map([["old-world", "Old World"]]),
      questGuids: [],
      farmers: true,
      workers: false,
      artisans: false,
      engineers: false,
      islandSnapshots: [],
      snapshotId: null,
      simTime: null,
    };
    const snap = snapshotFromScan(scan, { previousMoney: 9000, savedAt: "2026-09-03T00:00:00.000Z" });
    assert.equal(snap.schema, "harbor-live-v1");
    assert.equal(snap.sessionName, "Cristian S5");
    assert.equal(snap.islandName, "Old World");
    assert.deepEqual(snap.quests, []);
    assert.equal(snap.pulseHint?.coins, "down");
    assert.equal(snap.pulseHint?.houses, "yellow");
    assert.equal(snap.workforce?.farmers, true);
    assert.equal(snap.telemetry?.buildings?.some((row) => row.id === "lumberjack"), true);
    assert.equal(snap.telemetry?.buildings?.find((row) => row.id === "lumberjack")?.count, 3);
    assert.equal(snap.telemetry?.buildings?.find((row) => row.id === "marketplace")?.count, 1);
    assert.equal(snap.telemetry?.goods?.[0]?.amount, 42);
    assert.equal(snap.economy?.treasury, 8840);
    const ingested = ingestLiveJsonText(JSON.stringify(snap));
    assert.equal(ingested.ok, true);
    if (!ingested.ok) return;
    assert.equal(ingested.snapshot.telemetry?.goods?.[0]?.id, "wood");
    assert.equal(ingested.snapshot.pulseHint?.houses, "yellow");
    assert.equal(ingested.snapshot.telemetry?.buildings?.find((row) => row.id === "lumberjack")?.count, 3);
  });
});

function scanOf(over: Partial<SaveScan> = {}): SaveScan {
  return {
    sessionName: "Autosave",
    buildingCounts: new Map(),
    goods: new Map(),
    money: 100,
    storageOwner: "player",
    islands: new Set(),
    islandNames: new Map(),
    questGuids: [],
    farmers: false,
    workers: false,
    artisans: false,
    engineers: false,
    islandSnapshots: [],
    snapshotId: null,
    simTime: null,
    ...over,
  };
}

describe("pulseHint from save presence", () => {
  it("coins follow money delta; negative is down", () => {
    assert.equal(pulseHintFromScan(scanOf({ money: 50 }), 40).coins, "up");
    assert.equal(pulseHintFromScan(scanOf({ money: 50 }), 80).coins, "down");
    assert.equal(pulseHintFromScan(scanOf({ money: 50 }), 50).coins, "unknown");
    assert.equal(pulseHintFromScan(scanOf({ money: -12 }), null).coins, "down");
  });

  it("houses unknown when the scan found no building data at all — never a guessed empty", () => {
    assert.equal(housesHint(scanOf()), "unknown");
    assert.equal(housesHint(scanOf({ money: null })), "unknown");
  });

  it("houses empty without residences or without a marketplace, once the scan actually found buildings", () => {
    assert.equal(
      housesHint(
        scanOf({
          buildingCounts: new Map([["marketplace", { name: "Marketplace", count: 1 }]]),
        }),
      ),
      "empty",
    );
    assert.equal(
      housesHint(
        scanOf({
          farmers: true,
          buildingCounts: new Map([["farmer-house", { name: "Farmer Residence", count: 1 }]]),
        }),
      ),
      "empty",
    );
  });

  it("houses yellow when farmers have a market but no fish", () => {
    assert.equal(
      housesHint(
        scanOf({
          farmers: true,
          buildingCounts: new Map([["marketplace", { name: "Marketplace", count: 1 }]]),
        }),
      ),
      "yellow",
    );
  });

  it("a multi-island save the FileDB walk couldn't fully read stays calm: unknown pulse, no false red on the desk", () => {
    const scan = scanOf({
      money: null,
      islands: new Set(["old-world", "new-world"]),
      islandNames: new Map([
        ["old-world", "Old World"],
        ["new-world", "New World"],
      ]),
    });
    const pulse = pulseHintFromScan(scan);
    assert.equal(pulse.coins, "unknown");
    assert.equal(pulse.houses, "unknown");
    const calm = deskCalmUmbral({ ...pulse, looking: "unknown" }, "session");
    assert.equal(calm.rojo, false);
    assert.equal(calm.saturado, false);
    assert.equal(calm.umbral, "enough");
    assert.equal(calm.alarm, false);
  });

  it("houses ok when market and fishery (or fish stock) are present", () => {
    assert.equal(
      housesHint(
        scanOf({
          farmers: true,
          buildingCounts: new Map([
            ["marketplace", { name: "Marketplace", count: 1 }],
            ["fishery", { name: "Fishery", count: 1 }],
          ]),
        }),
      ),
      "ok",
    );
    assert.equal(
      housesHint(
        scanOf({
          farmers: true,
          buildingCounts: new Map([["marketplace", { name: "Marketplace", count: 1 }]]),
          goods: new Map([["fish", { name: "Fish", amount: 8 }]]),
        }),
      ),
      "ok",
    );
  });
});

describe("evidence honesty from a save scan", () => {
  it("does not publish FileDB quest GUIDs as confirmed active quests", () => {
    const snap = snapshotFromScan(
      scanOf({
        questGuids: [15000000],
        storageOwner: "player",
      }),
      {},
    );
    assert.deepEqual(snap.quests, []);
  });

  it("publishes islandSnapshots without redefining islandName", () => {
    const snap = snapshotFromScan(
      scanOf({
        islands: new Set(["old-world"]),
        islandNames: new Map([["old-world", "Old World"]]),
        islandSnapshots: [
          {
            regionId: 180023,
            areaId: 8451,
            ownerId: 0,
            name: "La Costa",
            nameSource: "city-name",
            stock: [{ id: "wood", name: "Timber", amount: 10 }],
            coverage: { identity: { source: "save" }, stock: { source: "save" } },
          },
          {
            regionId: 180023,
            areaId: 9219,
            ownerId: 0,
            name: "[999001]",
            nameSource: "neutral",
            stock: [{ id: "wood", name: "Timber", amount: 50 }],
            coverage: { identity: { source: "save" }, stock: { source: "save" } },
          },
        ],
      }),
      {},
    );
    assert.equal(snap.islandName, "Old World");
    assert.equal(snap.playerId, 0);
    assert.equal(snap.islandSnapshots?.[0]?.stock?.[0]?.amount, 10);
    assert.equal(snap.islandSnapshots?.[1]?.stock?.[0]?.amount, 50);
  });

  it("publishes player treasury and omits it when the owner is unknown", () => {
    const player = snapshotFromScan(
      scanOf({ storageOwner: "player", money: 18420 }),
      { savedAt: "2026-09-20T12:00:00.000Z" },
    );
    assert.equal(player.economy?.treasury, 18420);
    assert.equal(player.economy?.coverage.treasury.source, "save");
    assert.equal(player.economy?.coverage.treasury.scope, "player");
    const unknown = snapshotFromScan(scanOf({ storageOwner: "unknown", money: 18420 }), {});
    assert.equal(unknown.economy, undefined);
  });

  it("keeps islandName as the catalog session/region, not a player colony", () => {
    const snap = snapshotFromScan(
      scanOf({
        islands: new Set(["old-world"]),
        islandNames: new Map([["old-world", "Old World"]]),
      }),
      {},
    );
    assert.equal(snap.islandName, "Old World");
    assert.equal(snap.telemetry?.islands?.[0]?.id, "old-world");
  });

  it("does not diagnose coins from unscoped money", () => {
    const pulse = pulseHintFromScan(scanOf({ money: 999_999, storageOwner: "unknown" }), 1);
    assert.equal(pulse.coins, "unknown");
  });
});
