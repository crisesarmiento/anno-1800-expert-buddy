import type { Pulse } from "../play.ts";
import { completedFromSnapshot, readMissionProgress } from "../missions/progress.ts";
import type { LiveMatch, LiveSnapshot, MissionChannel } from "./types.ts";

export function applyLiveToProgress(
  snapshot: LiveSnapshot,
  match: LiveMatch,
): {
  matched: boolean;
  missionId: string | null;
  completed: string[];
  checks: Record<string, number[]>;
  pulse: Partial<Pulse>;
  channel: MissionChannel;
} {
  const view = readMissionProgress(snapshot, match);
  if (match.kind === "suggested") {
    return {
      matched: false,
      missionId: null,
      completed: [],
      checks: {},
      pulse: {},
      channel: "suggestion",
    };
  }

  if (match.kind !== "confirmed" || !match.missionId || match.confidence < 3) {
    return {
      matched: false,
      missionId: null,
      completed: [],
      checks: {},
      pulse: {},
      channel: view.manualFallback ? "manual" : "save-read",
    };
  }

  const pulse: Partial<Pulse> = { looking: "quest" };
  if (snapshot.pulseHint) {
    pulse.coins = snapshot.pulseHint.coins;
    pulse.houses = snapshot.pulseHint.houses;
  }

  const saveCompleted = completedFromSnapshot(snapshot);
  const channel: MissionChannel = view.saveRead.length > 0 ? "save-read" : "manual";

  return {
    matched: true,
    missionId: match.missionId,
    // Only explicit state:"done" rows. Earlier campaign missions are not inferred.
    completed: saveCompleted,
    checks: {},
    pulse,
    channel,
  };
}
