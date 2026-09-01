import { missions, missionsById } from "../data/campaign.ts";
import type { Pulse } from "../play.ts";
import { LIVE_GAME, LIVE_SCHEMA, type LiveQuest, type LiveSnapshot } from "./types.ts";

export function snapshotFromSession(input: {
  missionId: string | null;
  completed: string[];
  pulse: Pulse;
}): LiveSnapshot {
  const quests: LiveQuest[] = [];
  const seen = new Set<string>();

  for (const id of input.completed) {
    const mission = missionsById[id];
    if (!mission || seen.has(id)) continue;
    seen.add(id);
    quests.push({ title: mission.title, state: "done", objective: mission.objective });
  }

  if (input.missionId && !seen.has(input.missionId)) {
    const current = missionsById[input.missionId];
    if (current) {
      quests.push({
        title: current.title,
        state: "active",
        objective: current.objective,
      });
    }
  }

  if (quests.length === 0 && missions[0]) {
    quests.push({ title: missions[0].title, state: "active" });
  }

  return {
    schema: LIVE_SCHEMA,
    source: "file",
    updatedAt: new Date().toISOString(),
    game: LIVE_GAME,
    quests,
    pulseHint: {
      coins: input.pulse.coins,
      houses: input.pulse.houses,
    },
  };
}

export function downloadLiveSnapshot(snapshot: LiveSnapshot) {
  const blob = new Blob([`${JSON.stringify(snapshot, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "harbor-live.json";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
