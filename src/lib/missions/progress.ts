import type { LiveMatch, LiveQuest, LiveSnapshot, MissionChannel } from "../live/types.ts";
import { catalogMissionId, questIdentity, sameQuestInstance, type QuestIdentity } from "./identity.ts";
import { frozenTimerRemainingMs } from "./timer.ts";

export type QuestTransitionKind =
  | "accept"
  | "advance"
  | "deliver"
  | "complete"
  | "fail"
  | "expire"
  | "dropped"
  | "unchanged";

export type QuestTransition = {
  kind: QuestTransitionKind;
  identity: QuestIdentity;
  before?: LiveQuest;
  after?: LiveQuest;
};

export type SaveReadQuestView = {
  quest: LiveQuest;
  identity: QuestIdentity;
  channel: "save-read";
  timerRemainingMs: number | null;
};

export type MissionProgressView = {
  suggestion: { missionId: string | null; channel: Extract<MissionChannel, "suggestion"> } | null;
  saveRead: SaveReadQuestView[];
  saveCompletedIds: string[];
  currentSaveMissionId: string | null;
  unknownIdentities: QuestIdentity[];
  manualFallback: boolean;
};

const DONE = "done";
const ACTIVE = new Set(["active", "ready"]);

export function isSaveReadQuest(quest: LiveQuest): boolean {
  if (quest.state == null) return false;
  return Boolean(
    quest.instanceId ||
      quest.guid != null ||
      quest.progress ||
      quest.timer ||
      (quest.objectives && quest.objectives.length > 0),
  );
}

export function buildingDoesNotCompleteMission(
  snapshot: LiveSnapshot,
  match: LiveMatch,
): boolean {
  if (match.kind === "suggested" || match.source === "buildings") return true;
  const hits = snapshot.telemetry?.buildings ?? [];
  if (hits.length === 0) return true;
  return match.kind !== "confirmed";
}

export function readMissionProgress(
  snapshot: LiveSnapshot,
  match: LiveMatch,
): MissionProgressView {
  const saveRead: SaveReadQuestView[] = [];
  const unknownIdentities: QuestIdentity[] = [];
  const saveCompletedIds: string[] = [];
  let currentSaveMissionId: string | null = null;

  snapshot.quests.forEach((quest, index) => {
    const identity = questIdentity(quest, index);
    if (!identity.known) unknownIdentities.push(identity);
    if (!isSaveReadQuest(quest)) return;
    saveRead.push({
      quest,
      identity,
      channel: "save-read",
      timerRemainingMs: frozenTimerRemainingMs(quest.timer),
    });
    if (quest.state === DONE && identity.missionId) {
      saveCompletedIds.push(identity.missionId);
    }
    if (quest.state != null && ACTIVE.has(quest.state) && identity.missionId && !currentSaveMissionId) {
      currentSaveMissionId = identity.missionId;
    }
  });

  const suggestion =
    match.kind === "suggested" && match.missionId
      ? { missionId: match.missionId, channel: "suggestion" as const }
      : null;

  return {
    suggestion,
    saveRead,
    saveCompletedIds: unique(saveCompletedIds),
    currentSaveMissionId,
    unknownIdentities,
    manualFallback: saveRead.length === 0,
  };
}

/**
 * Completions come only from explicit `state: "done"` on save-read or declared rows
 * that match the catalog. Earlier campaign missions are not inferred. Absence is not done.
 */
export function completedFromSnapshot(snapshot: LiveSnapshot): string[] {
  const ids: string[] = [];
  for (const quest of snapshot.quests) {
    if (quest.state !== DONE) continue;
    const missionId = catalogMissionId(quest);
    if (missionId) ids.push(missionId);
  }
  return unique(ids);
}

export function compareQuestSnapshots(
  before: LiveSnapshot,
  after: LiveSnapshot,
): QuestTransition[] {
  const usedAfter = new Set<number>();
  const transitions: QuestTransition[] = [];

  before.quests.forEach((prev, prevIndex) => {
    const afterIndex = after.quests.findIndex(
      (next, index) => !usedAfter.has(index) && sameQuestInstance(prev, next),
    );
    const identity = questIdentity(prev, prevIndex);
    if (afterIndex < 0) {
      transitions.push({ kind: "dropped", identity, before: prev });
      return;
    }
    usedAfter.add(afterIndex);
    const next = after.quests[afterIndex]!;
    transitions.push({
      kind: classifyTransition(prev, next),
      identity: questIdentity(next, afterIndex),
      before: prev,
      after: next,
    });
  });

  after.quests.forEach((next, index) => {
    if (usedAfter.has(index)) return;
    transitions.push({
      kind: "accept",
      identity: questIdentity(next, index),
      after: next,
    });
  });

  return transitions;
}

function classifyTransition(before: LiveQuest, after: LiveQuest): QuestTransitionKind {
  if (before.state !== "failed" && after.state === "failed") return "fail";
  if (before.state !== "expired" && after.state === "expired") return "expire";
  if (before.state !== DONE && after.state === DONE) return "complete";
  if (delivered(before, after)) return "deliver";
  if (advanced(before, after)) return "advance";
  if (before.state === after.state && sameProgress(before, after)) return "unchanged";
  if (
    after.state != null &&
    ACTIVE.has(after.state) &&
    (before.state == null || !ACTIVE.has(before.state)) &&
    before.state !== DONE
  ) {
    return "accept";
  }
  return "advance";
}

function delivered(before: LiveQuest, after: LiveQuest): boolean {
  const prev = before.objectives ?? [];
  const next = after.objectives ?? [];
  if (prev.length === 0 || next.length !== prev.length) return false;
  let anyDeliver = false;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (!a || !b) continue;
    const prevCur = a.current ?? 0;
    const nextCur = b.current ?? 0;
    const required = b.required ?? a.required;
    if (nextCur > prevCur) anyDeliver = true;
    if (required != null && prevCur < required && nextCur >= required) anyDeliver = true;
  }
  return anyDeliver && after.state !== DONE && after.state !== "failed" && after.state !== "expired";
}

function advanced(before: LiveQuest, after: LiveQuest): boolean {
  const prev = before.progress?.current ?? 0;
  const next = after.progress?.current ?? 0;
  return next > prev;
}

function sameProgress(before: LiveQuest, after: LiveQuest): boolean {
  return (
    (before.progress?.current ?? null) === (after.progress?.current ?? null) &&
    (before.progress?.required ?? null) === (after.progress?.required ?? null)
  );
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function olderSaveDoesNotInherit(
  older: LiveSnapshot,
  newer: LiveSnapshot,
): { olderCompleted: string[]; newerCompleted: string[] } {
  return {
    olderCompleted: completedFromSnapshot(older),
    newerCompleted: completedFromSnapshot(newer),
  };
}
