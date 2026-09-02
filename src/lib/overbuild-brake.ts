import type { MissionKind } from "./data/types.ts";
import { nextMove, type Pulse } from "./play.ts";

export const OVERBUILD_BRAKE_CLEAR_ACTION = "Ya se mudaron";
export const OVERBUILD_BRAKE_NOTICE = "Pará de construir. Esperá que se muden.";

export type HudPulse = "rojo" | "amarillo" | "vacio" | "recado";

export type OverbuildBrakeState = {
  active: boolean;
};

export const initialOverbuildBrake: OverbuildBrakeState = { active: false };

export type OverbuildBrakeEvent =
  | { type: "buildMissionChecklistCompleted" }
  | { type: "pulse"; pulse: HudPulse }
  | { type: "acknowledgeMovedIn" }
  | { type: "timePassed" }
  | { type: "navigated" }
  | { type: "checklistChanged"; missionKind?: MissionKind; itemCount?: number; checkedCount?: number }
  | { type: "sessionLifecycle" };

export type ConstructionAdvice = {
  kind: "construction-chain" | "other";
  when?: "now" | "later";
  title: string;
  detail: string;
};

const STICKY: OverbuildBrakeState = { active: true };

function isCompletedBuildChecklist(event: Extract<OverbuildBrakeEvent, { type: "checklistChanged" }>) {
  return (
    event.missionKind === "build" &&
    typeof event.itemCount === "number" &&
    event.itemCount > 0 &&
    event.checkedCount === event.itemCount
  );
}

export function reduceOverbuildBrake(
  state: OverbuildBrakeState,
  event: OverbuildBrakeEvent,
): OverbuildBrakeState {
  switch (event.type) {
    case "buildMissionChecklistCompleted":
      return STICKY;
    case "pulse":
      if (event.pulse === "rojo" || event.pulse === "amarillo") return STICKY;
      return state;
    case "acknowledgeMovedIn":
      return initialOverbuildBrake;
    case "checklistChanged":
      if (isCompletedBuildChecklist(event)) return STICKY;
      return state;
    case "timePassed":
    case "navigated":
    case "sessionLifecycle":
      return state;
  }
}

export function applyOverbuildBrake<T extends { kind: ConstructionAdvice["kind"] }>(
  state: OverbuildBrakeState,
  advice: T[],
): T[] {
  if (!state.active) return advice;
  return advice.filter((item) => item.kind !== "construction-chain");
}

export function isOverbuildBrakeActive(state: OverbuildBrakeState): boolean {
  return state.active;
}

export function nextMoveUnderBrake(
  pulse: Pulse,
  doItems: string[],
  checked: number[],
  brake: OverbuildBrakeState,
  missionKind?: MissionKind,
): { title: string; detail: string } {
  if (!brake.active) return nextMove(pulse, doItems, checked);

  const gatedPulse = pulse.houses === "yellow" ? { ...pulse, houses: "unknown" as const } : pulse;
  const gatedItems = missionKind === "build" ? [] : doItems;
  return nextMove(gatedPulse, gatedItems, checked);
}
