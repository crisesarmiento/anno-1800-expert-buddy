import { findMissions } from "../data/find.ts";
import { missionsById } from "../data/campaign.ts";
import type { LiveQuest } from "../live/types.ts";

const MIN_SCORE = 3;

export type QuestIdentity = {
  key: string;
  title: string;
  instanceId?: string;
  guid?: number;
  known: boolean;
  missionId: string | null;
};

/**
 * Stable identity for one row in this snapshot.
 * Repeated GUIDs stay distinct when instanceId is present.
 * Unknown catalog titles keep title/guid/instance — they are not dropped.
 */
export function questIdentity(quest: LiveQuest, index: number): QuestIdentity {
  const missionId = catalogMissionId(quest);
  const key = quest.instanceId
    ? `instance:${quest.instanceId}`
    : quest.guid != null
      ? `guid:${quest.guid}:${index}`
      : `title:${fold(quest.title)}:${index}`;
  const identity: QuestIdentity = {
    key,
    title: quest.title,
    known: Boolean(missionId),
    missionId,
  };
  if (quest.instanceId) identity.instanceId = quest.instanceId;
  if (quest.guid != null) identity.guid = quest.guid;
  return identity;
}

export function catalogMissionId(quest: LiveQuest): string | null {
  const hits = findMissions(quest.title);
  const top = hits[0];
  if (!top || top.score < MIN_SCORE) return null;
  return missionsById[top.mission.id] ? top.mission.id : null;
}

export function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Match the same instance across two snapshots. Instance id wins over GUID. */
export function sameQuestInstance(a: LiveQuest, b: LiveQuest): boolean {
  if (a.instanceId && b.instanceId) return a.instanceId === b.instanceId;
  if (a.instanceId || b.instanceId) return false;
  if (a.guid != null && b.guid != null && a.guid === b.guid) {
    return fold(a.title) === fold(b.title);
  }
  return fold(a.title) === fold(b.title) && a.guid == null && b.guid == null;
}
