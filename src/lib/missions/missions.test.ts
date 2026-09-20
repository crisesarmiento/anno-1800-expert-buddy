import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { applyLiveToProgress } from "../live/apply.ts";
import { inferMissionFromTelemetry, matchLiveSnapshot } from "../live/match.ts";
import { ingestLiveJsonText } from "../live/validate.ts";
import { questFixtures } from "./fixtures.ts";
import { catalogMissionId, questIdentity } from "./identity.ts";
import {
  buildingDoesNotCompleteMission,
  compareQuestSnapshots,
  completedFromSnapshot,
  olderSaveDoesNotInherit,
  readMissionProgress,
} from "./progress.ts";
import { deductReservesFromStock, suggestedReserves } from "./reserves.ts";
import { formatFrozenTimer, frozenTimerRemainingMs } from "./timer.ts";

describe("three channels: suggestion vs manual vs save-read", () => {
  it("having a building does not complete a mission", () => {
    const snapshot = questFixtures.buildingNotComplete;
    const match = inferMissionFromTelemetry(snapshot);
    assert.equal(match.kind, "suggested");
    assert.equal(match.source, "buildings");
    assert.equal(buildingDoesNotCompleteMission(snapshot, match), true);
    const progress = applyLiveToProgress(snapshot, match);
    assert.equal(progress.matched, false);
    assert.deepEqual(progress.completed, []);
    assert.equal(progress.channel, "suggestion");
    const view = readMissionProgress(snapshot, matchLiveSnapshot(snapshot));
    assert.ok(view.suggestion);
    assert.equal(view.saveRead.length, 0);
    assert.equal(view.manualFallback, true);
    assert.deepEqual(view.saveCompletedIds, []);
  });

  it("unknown quests keep identity", () => {
    const snapshot = questFixtures.unknownQuest;
    const quest = snapshot.quests[0]!;
    const identity = questIdentity(quest, 0);
    assert.equal(identity.known, false);
    assert.equal(identity.missionId, null);
    assert.equal(identity.instanceId, "q-unk-9");
    assert.equal(identity.guid, 15999999);
    assert.equal(identity.title, "Recado de un comerciante");
    assert.equal(catalogMissionId(quest), null);
    const view = readMissionProgress(snapshot, matchLiveSnapshot(snapshot));
    assert.equal(view.unknownIdentities.length, 1);
    assert.equal(view.unknownIdentities[0]?.instanceId, "q-unk-9");
    assert.equal(view.saveRead[0]?.identity.known, false);
  });

  it("loading an older save does not inherit future completions", () => {
    const { olderCompleted, newerCompleted } = olderSaveDoesNotInherit(
      questFixtures.olderSave,
      questFixtures.newerSave,
    );
    assert.deepEqual(olderCompleted, []);
    assert.ok(newerCompleted.includes("ch1-spark"));
    assert.ok(newerCompleted.includes("ch2-bulk"));
    const olderView = readMissionProgress(
      questFixtures.olderSave,
      matchLiveSnapshot(questFixtures.olderSave),
    );
    const newerView = readMissionProgress(
      questFixtures.newerSave,
      matchLiveSnapshot(questFixtures.newerSave),
    );
    assert.deepEqual(olderView.saveCompletedIds, []);
    assert.ok(newerView.saveCompletedIds.includes("ch2-bulk"));
    assert.equal(olderView.currentSaveMissionId, "ch1-spark");
  });
});

describe("quest transitions", () => {
  it("accept / advance / deliver / complete / fail / expire", () => {
    const accept = compareQuestSnapshots(questFixtures.acceptBefore, questFixtures.acceptAfter);
    assert.equal(accept[0]?.kind, "accept");

    const advance = compareQuestSnapshots(questFixtures.advanceBefore, questFixtures.advanceAfter);
    assert.equal(advance[0]?.kind, "advance");
    assert.equal(advance[0]?.after?.progress?.current, 1);

    const deliver = compareQuestSnapshots(questFixtures.deliverBefore, questFixtures.deliverAfter);
    assert.equal(deliver[0]?.kind, "deliver");

    const complete = compareQuestSnapshots(
      questFixtures.completeBefore,
      questFixtures.completeAfter,
    );
    assert.equal(complete[0]?.kind, "complete");
    assert.deepEqual(completedFromSnapshot(questFixtures.completeAfter), ["ch1-spark"]);

    const fail = compareQuestSnapshots(questFixtures.failBefore, questFixtures.failAfter);
    assert.equal(fail[0]?.kind, "fail");

    const expire = compareQuestSnapshots(questFixtures.expireBefore, questFixtures.expireAfter);
    assert.equal(expire[0]?.kind, "expire");
  });

  it("absence in a sample is not completed", () => {
    const dropped = compareQuestSnapshots(
      questFixtures.acceptAfter,
      questFixtures.absenceNotComplete,
    );
    assert.equal(dropped[0]?.kind, "dropped");
    assert.deepEqual(completedFromSnapshot(questFixtures.absenceNotComplete), []);
    const progress = applyLiveToProgress(
      questFixtures.absenceNotComplete,
      matchLiveSnapshot(questFixtures.absenceNotComplete),
    );
    assert.deepEqual(progress.completed, []);
  });

  it("distinguishes repeated instances with the same GUID", () => {
    const snapshot = questFixtures.repeatedGuid;
    const a = questIdentity(snapshot.quests[0]!, 0);
    const b = questIdentity(snapshot.quests[1]!, 1);
    assert.equal(snapshot.quests[0]?.guid, snapshot.quests[1]?.guid);
    assert.notEqual(a.instanceId, b.instanceId);
    assert.notEqual(a.key, b.key);
    assert.equal(a.key, "instance:q-bulk-1");
    assert.equal(b.key, "instance:q-bulk-2");
  });
});

describe("timer stays frozen", () => {
  it("does not tick with wall-clock as if it knew live game time", () => {
    const timer = questFixtures.expireBefore.quests[0]?.timer;
    assert.ok(timer);
    const now = Date.parse("2026-09-20T12:30:00.000Z");
    const frozen = frozenTimerRemainingMs(timer, now);
    assert.equal(frozen, 90_000);
    const observed = Date.parse(timer.observedAt ?? "");
    const naiveTick = Math.max(0, timer.remainingMs - (now - observed));
    assert.ok(naiveTick < 90_000);
    assert.notEqual(frozen, naiveTick);
    assert.equal(formatFrozenTimer(90_000), "1:30");
  });
});

describe("suggested reserves do not deduct read stock", () => {
  it("keeps the read stock unchanged", () => {
    const snapshot = {
      ...questFixtures.deliverBefore,
      telemetry: { goods: [{ id: "timber", name: "Tablones", amount: 48 }] },
    };
    const reserves = suggestedReserves(snapshot);
    assert.equal(reserves.length, 1);
    assert.equal(reserves[0]?.amount, 20);
    assert.equal(reserves[0]?.stockRead, 48);
    assert.equal(reserves[0]?.stockUnchanged, 48);
    assert.notEqual(reserves[0]?.stockUnchanged, deductReservesFromStock(48, 20));
    assert.equal(deductReservesFromStock(48, 20), 28);
  });
});

describe("P2-C reserves carry explicit evidence", () => {
  it("marks the required amount confirmed and the stock honesty by presence", () => {
    const known = suggestedReserves({
      ...questFixtures.deliverBefore,
      telemetry: { goods: [{ id: "timber", name: "Tablones", amount: 48 }] },
    });
    assert.equal(known[0]?.amountHonesty, "confirmed");
    assert.equal(known[0]?.stockHonesty, "confirmed");

    const unknownStock = suggestedReserves({
      ...questFixtures.deliverBefore,
      telemetry: { goods: [] },
    });
    assert.equal(unknownStock[0]?.amountHonesty, "confirmed");
    assert.equal(unknownStock[0]?.stockRead, null);
    assert.equal(unknownStock[0]?.stockHonesty, null);
  });
});

describe("ingest optional quest fields", () => {
  it("keeps instance, type, objectives, progress, state and timer", () => {
    const result = ingestLiveJsonText(
      JSON.stringify({
        schema: "harbor-live-v1",
        source: "file",
        updatedAt: "2026-09-20T12:00:00.000Z",
        game: "anno-1800",
        quests: [
          {
            title: "Una chispa que vuelve",
            state: "active",
            instanceId: "q-spark-1",
            guid: 15000011,
            type: "story",
            progress: { current: 1, required: 3 },
            timer: { remainingMs: 45000, observedAt: "2026-09-20T12:00:00.000Z" },
            objectives: [
              {
                id: "houses",
                text: "10 casas",
                current: 4,
                required: 10,
              },
            ],
          },
          {
            title: "Recado de un comerciante",
            state: "failed",
            instanceId: "q-unk-9",
            guid: 15999999,
            type: "unknown",
          },
        ],
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const spark = result.snapshot.quests[0];
    assert.equal(spark?.instanceId, "q-spark-1");
    assert.equal(spark?.guid, 15000011);
    assert.equal(spark?.type, "story");
    assert.equal(spark?.progress?.current, 1);
    assert.equal(spark?.timer?.remainingMs, 45000);
    assert.equal(spark?.objectives?.[0]?.required, 10);
    assert.equal(result.snapshot.quests[1]?.state, "failed");
    const view = readMissionProgress(result.snapshot, matchLiveSnapshot(result.snapshot));
    assert.equal(view.unknownIdentities[0]?.instanceId, "q-unk-9");
  });
});

describe("P1-A GUID without state is not save-read", () => {
  it("does not treat a quest GUID with no state as active or save-read", () => {
    const snapshot = {
      schema: "harbor-live-v1" as const,
      source: "file" as const,
      updatedAt: "2026-09-20T12:00:00.000Z",
      savedAt: "2026-09-20T12:00:00.000Z",
      game: "anno-1800" as const,
      quests: [{ title: "Una chispa que vuelve", guid: 15000011 }],
    };
    const view = readMissionProgress(snapshot, matchLiveSnapshot(snapshot));
    assert.equal(view.saveRead.length, 0);
    assert.equal(view.currentSaveMissionId, null);
    assert.equal(view.manualFallback, true);
    const match = matchLiveSnapshot(snapshot);
    assert.notEqual(match.kind, "confirmed");
    assert.notEqual(match.source, "quests");
  });
});

describe("honesty: watcher empty list and no inherited live completions", () => {
  it("keeps the Windows watcher on quests:[] and does not copy save-read done into store.completed", () => {
    const ps1 = readFileSync(new URL("../../../public/watch-harbor-live.ps1", import.meta.url), "utf8");
    const scan = readFileSync(new URL("../live/a7s-snapshot.ts", import.meta.url), "utf8");
    const store = readFileSync(new URL("../store.ts", import.meta.url), "utf8");
    const channels = readFileSync(
      new URL("../../components/mission-channels.tsx", import.meta.url),
      "utf8",
    );
    assert.match(ps1, /\$payload\.quests = @\(\)/);
    assert.match(scan, /const quests: LiveQuest\[\] = \[\]/);
    assert.doesNotMatch(store, /completed: progress\.completed/);
    assert.doesNotMatch(channels, /Date\.now\(/);
    assert.match(channels, /data-spoilers=\{spoilers \? "on" : "off"\}/);
  });
});
