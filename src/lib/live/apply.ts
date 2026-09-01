import { missions } from "../data/campaign.ts";
import type { Pulse } from "../play.ts";
import type { LiveMatch, LiveSnapshot } from "./types.ts";

export function applyLiveToProgress(
  snapshot: LiveSnapshot,
  match: LiveMatch,
): {
  matched: boolean;
  missionId: string | null;
  completed: string[];
  checks: Record<string, number[]>;
  pulse: Partial<Pulse>;
} {
  if (!match.missionId || match.confidence < 3) {
    return {
      matched: false,
      missionId: null,
      completed: [],
      checks: {},
      pulse: {},
    };
  }

  const index = missions.findIndex((mission) => mission.id === match.missionId);
  const earlier = index > 0 ? missions.slice(0, index) : [];
  const checks: Record<string, number[]> = {};
  for (const mission of earlier) {
    checks[mission.id] = mission.do.map((_, i) => i);
  }

  const pulse: Partial<Pulse> = { looking: "quest" };
  if (snapshot.pulseHint) {
    pulse.coins = snapshot.pulseHint.coins;
    pulse.houses = snapshot.pulseHint.houses;
  }

  return {
    matched: true,
    missionId: match.missionId,
    completed: earlier.map((mission) => mission.id),
    checks,
    pulse,
  };
}
