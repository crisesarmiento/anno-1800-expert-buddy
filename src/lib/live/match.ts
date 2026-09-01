import { findMissions } from "../data/find.ts";
import type { LiveMatch, LiveQuest } from "./types.ts";

const MIN_SCORE = 3;

export function matchLiveQuests(quests: LiveQuest[]): LiveMatch {
  const rawTitles = quests.map((quest) => quest.title).filter(Boolean);
  const preferred = quests.filter(
    (quest) => quest.state === "active" || quest.state === "ready",
  );

  let missionId: string | null = null;
  let confidence = 0;

  for (const quest of preferred) {
    const hits = findMissions(quest.title);
    const top = hits[0];
    if (!top || top.score < MIN_SCORE) continue;
    if (top.score > confidence) {
      confidence = top.score;
      missionId = top.mission.id;
    }
  }

  if (confidence < MIN_SCORE) {
    return { missionId: null, confidence: 0, rawTitles };
  }

  return { missionId, confidence, rawTitles };
}
