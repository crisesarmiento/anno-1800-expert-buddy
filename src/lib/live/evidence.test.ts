import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { applyLiveToProgress } from "./apply.ts";
import {
  EMPTY_MOD_XML_PATH,
  RESEARCH_READER_PATHS,
  WINDOWS_READER_PATHS,
  canDiagnoseSaveFinance,
  emptyModInjectsTelemetry,
  isPlayerParticipant,
  isSessionRegionHit,
  liveJsonWriterPath,
  ocrSelectedIsland,
  playerIslandFromSave,
  regionHitsFromSnapshot,
  unknownAmountIsZero,
} from "./evidence.ts";
import { liveSuggestedLine } from "./messages.ts";
import { inferMissionFromTelemetry, matchLiveQuests, matchLiveSnapshot } from "./match.ts";
import { snapshotFromScan, type SaveScan } from "./a7s-snapshot.ts";
import type { LiveSnapshot } from "./types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function snap(partial: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    source: "save",
    updatedAt: "2026-09-19T12:00:00.000Z",
    game: "anno-1800",
    quests: [],
    ...partial,
  };
}

function scanOf(over: Partial<SaveScan> = {}): SaveScan {
  return {
    sessionName: "Autosave",
    buildingCounts: new Map(),
    goods: new Map(),
    money: null,
    storageOwner: "unknown",
    islands: new Set(),
    islandNames: new Map(),
    questGuids: [],
    farmers: false,
    workers: false,
    artisans: false,
    engineers: false,
    ...over,
  };
}

describe("reader paths vs empty mod", () => {
  it("the empty mod XML does not inject and is not a live writer", () => {
    const xml = readFileSync(join(root, EMPTY_MOD_XML_PATH), "utf8");
    assert.match(xml, /<ModOps>\s*<\/ModOps>/);
    assert.equal(emptyModInjectsTelemetry(), false);
    assert.ok(WINDOWS_READER_PATHS.includes("src/lib/live/a7s-scan.cs"));
    assert.ok(RESEARCH_READER_PATHS.includes("src/lib/live/a7s-snapshot.ts"));
    assert.equal(
      (RESEARCH_READER_PATHS as readonly string[]).includes("src/lib/live/a7s-scan.cs"),
      false,
    );
  });

  it("labels the Windows watcher as the JSON writer, never the empty mod", () => {
    assert.equal(
      liveJsonWriterPath(snap({ connection: { mode: "documents-save" } })),
      "windows-watcher",
    );
    assert.equal(
      liveJsonWriterPath(snap({ connection: { mode: "ubisoft-cloud" } })),
      "windows-watcher",
    );
    assert.equal(liveJsonWriterPath(snap({ source: "file", connection: { mode: "manual" } })), "manual-json");
  });
});

describe("quests: watcher empty list vs suggested buildings", () => {
  it("honors quests:[] as no confirmed active mission", () => {
    const fromQuests = matchLiveQuests([]);
    assert.equal(fromQuests.kind, "none");
    assert.equal(fromQuests.missionId, null);
    const live = matchLiveSnapshot(snap({ quests: [] }));
    assert.notEqual(live.kind, "confirmed");
  });

  it("does not treat a GUID-bearing scan as confirmed active quests", () => {
    const snapshot = snapshotFromScan(
      scanOf({
        questGuids: [133, 15000001],
        buildingCounts: new Map([["marketplace", { name: "Marketplace", count: 1 }]]),
      }),
      {},
    );
    assert.deepEqual(snapshot.quests, []);
    assert.equal(matchLiveQuests(snapshot.quests).kind, "none");
  });

  it("labels building inference as suggested and does not complete the diary", () => {
    const snapshot = snap({
      telemetry: {
        buildings: [
          { id: "obrero", name: "Obrero Residence" },
          { id: "worker-house", name: "Worker Residence" },
        ],
      },
    });
    const inferred = inferMissionFromTelemetry(snapshot);
    assert.equal(inferred.kind, "suggested");
    assert.equal(inferred.source, "buildings");
    const progress = applyLiveToProgress(snapshot, inferred);
    assert.equal(progress.matched, false);
    assert.deepEqual(progress.completed, []);
    assert.match(liveSuggestedLine("Capítulo 3", "es"), /sugerida/);
    assert.doesNotMatch(liveSuggestedLine("Capítulo 3", "es"), /misión activa confirmada|Diario leído/);
  });

  it("still confirms an explicit journal title from JSON", () => {
    const snapshot = snap({
      quests: [{ title: "Una chispa que vuelve", state: "active" }],
    });
    const match = matchLiveSnapshot(snapshot);
    assert.equal(match.kind, "confirmed");
    assert.equal(applyLiveToProgress(snapshot, match).matched, true);
  });
});

describe("islands: session/region is not a player colony", () => {
  it("classifies catalog session names as regions", () => {
    assert.equal(isSessionRegionHit("Old World"), true);
    assert.equal(isSessionRegionHit({ id: "new-world", name: "New World" }), true);
    assert.equal(isSessionRegionHit({ id: "bright-sands", name: "Bright Sands" }), true);
    assert.equal(isSessionRegionHit("La Inapetente"), false);
  });

  it("never returns a player island from save islandName / telemetry.islands", () => {
    const snapshot = snap({
      islandName: "Old World",
      telemetry: { islands: [{ id: "old-world", name: "Old World" }] },
      connection: {
        mode: "documents-save",
        native: {
          provider: "ux-enhancer-ocr",
          view: "production",
          observedAt: "2026-09-19T12:00:00.000Z",
          islandName: "La Inapetente",
        },
      },
    });
    assert.equal(playerIslandFromSave(snapshot), null);
    assert.deepEqual(regionHitsFromSnapshot(snapshot), [{ id: "old-world", name: "Old World" }]);
    assert.equal(ocrSelectedIsland(snapshot), "La Inapetente");
  });
});

describe("money/goods: unknown owner is not a treasury", () => {
  it("only participant 0 is the player", () => {
    assert.equal(isPlayerParticipant(0), true);
    assert.equal(isPlayerParticipant(13), false);
    assert.equal(isPlayerParticipant(null), false);
  });

  it("refuses finance diagnosis without a player storage owner", () => {
    assert.equal(canDiagnoseSaveFinance("unknown"), false);
    assert.equal(canDiagnoseSaveFinance(undefined), false);
    assert.equal(canDiagnoseSaveFinance("player"), true);
    assert.equal(unknownAmountIsZero(null), false);
    assert.equal(unknownAmountIsZero(undefined), false);
  });

  it("omits unscoped money from the public snapshot pulse", () => {
    const snapshot = snapshotFromScan(scanOf({ money: 50_000, storageOwner: "unknown" }), {
      previousMoney: 10,
    });
    assert.equal(snapshot.pulseHint?.coins, "unknown");
  });
});
