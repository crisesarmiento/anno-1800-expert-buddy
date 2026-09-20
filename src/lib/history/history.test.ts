import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LiveIslandSnapshot, LiveSnapshot } from "../live/types.ts";
import { campaignFingerprint, resolveCampaignId } from "./campaign.ts";
import { islandStockDelta } from "./compare.ts";
import { createMemoryHistoryBacking, createMemoryHistoryStore } from "./store.ts";
import { HISTORY_MAX_SAMPLES } from "./types.ts";

function island(
  over: Partial<LiveIslandSnapshot> & Pick<LiveIslandSnapshot, "areaId" | "name">,
): LiveIslandSnapshot {
  return {
    regionId: 180023,
    ownerId: 0,
    nameSource: "city-name",
    coverage: { identity: { source: "save", observedAt: "2026-09-19T12:00:00.000Z" } },
    ...over,
  };
}

function snap(over: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    source: "save",
    updatedAt: "2026-09-19T12:00:00.000Z",
    game: "anno-1800",
    quests: [],
    campaignId: "test-campaign",
    savedAt: "2026-09-19T11:00:00.000Z",
    islandSnapshots: [
      island({
        areaId: 8451,
        name: "La Costa",
        stock: [{ id: "wood", name: "Timber", amount: 10 }],
      }),
      island({
        areaId: 9219,
        name: "[999001]",
        stock: [{ id: "wood", name: "Timber", amount: 50 }],
      }),
    ],
    ...over,
  };
}

describe("campaign identity", () => {
  it("does not identify a campaign by filename or mtime", () => {
    const result = resolveCampaignId({
      snapshot: snap({
        sessionName: "Autosave",
        campaignId: undefined,
        connection: { mode: "documents-save", fileName: "Autosave.a7s" },
        islandSnapshots: undefined,
        savedAt: "2026-09-19T11:00:00.000Z",
      }),
      known: [],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "ambiguous");
  });

  it("uses player island keys as a fingerprint, not the display name", () => {
    const a = campaignFingerprint(snap());
    const renamed = campaignFingerprint(
      snap({
        islandSnapshots: [
          island({
            areaId: 8451,
            name: "Puerto Nuevo",
            stock: [{ id: "wood", name: "Timber", amount: 10 }],
          }),
          island({
            areaId: 9219,
            name: "Otra",
            stock: [{ id: "wood", name: "Timber", amount: 50 }],
          }),
        ],
      }),
    );
    assert.equal(a, renamed);
    assert.match(a ?? "", /8451/);
  });
});

describe("IndexedDB-equivalent history", () => {
  it("keeps two islands' stock independent and visible with its date", async () => {
    const store = createMemoryHistoryStore();
    const result = await store.record(snap({ savedAt: "2026-09-19T11:00:00.000Z", simTime: 100 }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const costa = result.sample.summary.islands.find((row) => row.areaId === 8451);
    const other = result.sample.summary.islands.find((row) => row.areaId === 9219);
    assert.equal(costa?.stock?.find((g) => g.id === "wood")?.amount, 10);
    assert.equal(other?.stock?.find((g) => g.id === "wood")?.amount, 50);
    assert.equal(result.sample.savedAt, "2026-09-19T11:00:00.000Z");
  });

  it("does not lose history when an island is renamed", async () => {
    const store = createMemoryHistoryStore();
    const first = await store.record(snap({ simTime: 100, savedAt: "2026-09-19T11:00:00.000Z" }));
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const renamed = await store.record(
      snap({
        simTime: 200,
        savedAt: "2026-09-19T12:00:00.000Z",
        islandSnapshots: [
          island({
            areaId: 8451,
            name: "Costa Renombrada",
            stock: [{ id: "wood", name: "Timber", amount: 12 }],
          }),
          island({
            areaId: 9219,
            name: "Otra",
            stock: [{ id: "wood", name: "Timber", amount: 40 }],
          }),
        ],
      }),
    );
    assert.equal(renamed.ok, true);
    if (!renamed.ok) return;
    const rows = await store.list(first.campaignId);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.summary.islands.find((row) => row.areaId === 8451)?.name, "La Costa");
    assert.equal(
      rows[1]?.summary.islands.find((row) => row.areaId === 8451)?.name,
      "Costa Renombrada",
    );
  });

  it("does not mix samples when switching campaign", async () => {
    const store = createMemoryHistoryStore();
    const a = await store.record(snap({ simTime: 1 }));
    const b = await store.record(
      snap({
        simTime: 1,
        campaignId: "other-campaign",
        islandSnapshots: [
          island({
            regionId: 180025,
            areaId: 100,
            name: "Otra campaña",
            stock: [{ id: "wood", name: "Timber", amount: 3 }],
          }),
        ],
      }),
    );
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.campaignId, b.campaignId);
    assert.equal((await store.list(a.campaignId)).length, 1);
    assert.equal((await store.list(b.campaignId)).length, 1);
  });

  it("preserves history across a store restart with the same backing memory", async () => {
    const memory = createMemoryHistoryBacking();
    const first = createMemoryHistoryStore(memory);
    const recorded = await first.record(snap({ simTime: 9, savedAt: "2026-09-19T11:00:00.000Z" }));
    assert.equal(recorded.ok, true);
    if (!recorded.ok) return;
    const restarted = createMemoryHistoryStore(memory);
    const rows = await restarted.list(recorded.campaignId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.savedAt, "2026-09-19T11:00:00.000Z");
    assert.equal(rows[0]?.summary.islands[0]?.stock?.[0]?.amount, 10);
  });

  it("starts a new branch for an older save and refuses a drop against the future", async () => {
    const store = createMemoryHistoryStore();
    const future = await store.record(
      snap({
        simTime: 500,
        savedAt: "2026-09-19T15:00:00.000Z",
        islandSnapshots: [
          island({
            areaId: 8451,
            name: "La Costa",
            stock: [{ id: "wood", name: "Timber", amount: 80 }],
          }),
          island({
            areaId: 9219,
            name: "[999001]",
            stock: [{ id: "wood", name: "Timber", amount: 50 }],
          }),
        ],
      }),
    );
    const older = await store.record(
      snap({
        simTime: 100,
        savedAt: "2026-09-19T11:00:00.000Z",
        islandSnapshots: [
          island({
            areaId: 8451,
            name: "La Costa",
            stock: [{ id: "wood", name: "Timber", amount: 10 }],
          }),
          island({
            areaId: 9219,
            name: "[999001]",
            stock: [{ id: "wood", name: "Timber", amount: 50 }],
          }),
        ],
      }),
    );
    assert.equal(future.ok && older.ok, true);
    if (!future.ok || !older.ok) return;
    assert.equal(older.branched, true);
    assert.notEqual(older.sample.branchId, future.sample.branchId);
    const refused = islandStockDelta(future.sample, older.sample, 180023, 8451);
    assert.equal(refused.ok, false);
    if (refused.ok) return;
    assert.equal(refused.reason === "cross-branch" || refused.reason === "against-future", true);
  });

  it("dedupes identical snapshots and caps at 200 distinct samples", async () => {
    const store = createMemoryHistoryStore();
    const first = await store.record(snap({ simTime: 1, snapshotId: "s1" }));
    const again = await store.record(snap({ simTime: 1, snapshotId: "s1" }));
    assert.equal(first.ok && again.ok, true);
    if (!first.ok || !again.ok) return;
    assert.equal(again.deduped, true);
    for (let i = 2; i <= HISTORY_MAX_SAMPLES + 5; i++) {
      const result = await store.record(
        snap({
          simTime: i,
          snapshotId: `s${i}`,
          islandSnapshots: [
            island({
              areaId: 8451,
              name: "La Costa",
              stock: [{ id: "wood", name: "Timber", amount: i }],
            }),
            island({
              areaId: 9219,
              name: "[999001]",
              stock: [{ id: "wood", name: "Timber", amount: 50 }],
            }),
          ],
        }),
      );
      assert.equal(result.ok, true);
    }
    const rows = await store.list(first.campaignId);
    assert.equal(rows.length, HISTORY_MAX_SAMPLES);
  });
});

describe("campaign and timeline regressions", () => {
  it("never merges distinct playthroughs just because they have identical islands", () => {
    const result = resolveCampaignId({
      snapshot: snap({ campaignId: undefined }),
      known: [{ id: "old", fingerprint: campaignFingerprint(snap()), createdAt: "2026-01-01" }],
    });
    assert.equal(result.ok, false);
  });

  it("explicit campaign keeps colonization in the same history", async () => {
    const store = createMemoryHistoryStore();
    const a = await store.record(snap({ campaignId: undefined, simTime: 1 }), {
      explicitCampaignId: "chosen",
    });
    const b = await store.record(
      snap({
        campaignId: undefined,
        simTime: 2,
        islandSnapshots: [...snap().islandSnapshots!, island({ areaId: 123, name: "New" })],
      }),
      { explicitCampaignId: "chosen" },
    );
    assert.ok(a.ok && b.ok);
    assert.equal((await store.list("chosen")).length, 2);
  });

  it("continues a rollback branch instead of branching on every subsequent save", async () => {
    const store = createMemoryHistoryStore();
    const first = await store.record(snap({ simTime: 100, snapshotId: "old" }));
    await store.record(snap({ simTime: 500 }));
    const rollback = await store.record(snap({ simTime: 100, snapshotId: "old" }));
    const next = await store.record(snap({ simTime: 200 }));
    assert.ok(first.ok && rollback.ok && next.ok);
    assert.equal(rollback.deduped, false);
    assert.equal(rollback.branched, true);
    assert.equal(next.branched, false);
    assert.equal(next.sample.branchId, rollback.sample.branchId);
  });

  it("does not use file modification time as evidence of game chronology", async () => {
    const store = createMemoryHistoryStore();
    const a = await store.record(snap({ savedAt: "2026-09-19T11:00:00Z" }));
    const b = await store.record(snap({ savedAt: "2026-09-20T11:00:00Z" }));
    assert.ok(a.ok && b.ok);
    assert.equal(b.branched, false);
    assert.equal(islandStockDelta(a.sample, b.sample, 180023, 8451).ok, false);
  });
});
