import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferMissionFromTelemetry, matchLiveQuests, matchLiveSnapshot } from "./match.ts";
import { applyLiveToProgress } from "./apply.ts";
import type { LiveSnapshot } from "./types.ts";

function snap(partial: Partial<LiveSnapshot>): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    source: "save",
    updatedAt: "2026-09-03T02:39:57.000Z",
    game: "anno-1800",
    quests: [],
    ...partial,
  };
}

describe("live mission match", () => {
  it("still matches a journal title first", () => {
    const match = matchLiveQuests([{ title: "Una chispa que vuelve", state: "active" }]);
    assert.equal(match.missionId, "ch1-spark");
    assert.ok(match.confidence >= 3);
    assert.equal(match.kind, "confirmed");
    assert.equal(match.source, "quests");
  });

  it("does not invent a mission from an empty save", () => {
    const match = matchLiveSnapshot(snap({}));
    assert.equal(match.missionId, null);
    const progress = applyLiveToProgress(snap({}), match);
    assert.equal(progress.matched, false);
  });

  it("infers New World obreros when quests are empty, as suggested only", () => {
    const snapshot = snap({
      sessionName: "Cristian Sarmien5",
      islandName: "Old World",
      workforce: { farmers: true, workers: true, artisans: true, engineers: true },
      telemetry: {
        buildings: [
          { id: "jornalero", name: "Jornalero Residence" },
          { id: "obrero", name: "Obrero Residence" },
          { id: "marketplace", name: "Marketplace" },
          { id: "charcoal", name: "Charcoal Kiln" },
          { id: "worker-house", name: "Worker Residence" },
        ],
        islands: [
          { id: "old-world", name: "Old World" },
          { id: "bright-sands", name: "Bright Sands" },
        ],
      },
    });
    const match = inferMissionFromTelemetry(snapshot);
    assert.equal(match.missionId, "ch3-refugees");
    assert.equal(match.kind, "suggested");
    assert.equal(match.source, "buildings");
    const live = matchLiveSnapshot(snapshot);
    assert.equal(live.kind, "suggested");
    const progress = applyLiveToProgress(snapshot, live);
    assert.equal(progress.matched, false);
    assert.equal(progress.missionId, null);
    assert.deepEqual(progress.completed, []);
    assert.equal(progress.channel, "suggestion");
  });

  it("prefers the diary title over building inference", () => {
    const snapshot = snap({
      quests: [{ title: "Una chispa que vuelve", state: "active" }],
      telemetry: {
        buildings: [{ id: "obrero", name: "Obrero Residence" }],
      },
    });
    const live = matchLiveSnapshot(snapshot);
    assert.equal(live.missionId, "ch1-spark");
    assert.equal(live.kind, "confirmed");
    assert.equal(live.source, "quests");
  });
});
