import type { LiveSnapshot } from "./live/types.ts";
import {
  classifyWorkshopGoods,
  workshopSaturatedSignal,
  type WorkshopSimSlice,
} from "./workshop-balance.ts";

export const HOME_SATURATED_TIP_MS = 10_000;
export const HOME_SATURATED_TIP_LINE = "Vendé lo que ya producís. Frená.";

export function homeWorkshopSaturated(
  snapshot: LiveSnapshot | null,
  stats?: WorkshopSimSlice | null,
): boolean {
  if (!snapshot) return false;
  const rows = classifyWorkshopGoods({ snapshot, stats });
  return workshopSaturatedSignal(rows, snapshot.pulseHint);
}

export function pickHomeSaturatedTip(input: {
  saturated: boolean;
  shownAt: number | null;
  now: number;
}): string | null {
  if (!input.saturated) return null;
  if (input.shownAt != null && input.now - input.shownAt >= HOME_SATURATED_TIP_MS) return null;
  return HOME_SATURATED_TIP_LINE;
}

/** First offer stamps the visit. Later calls keep the stamp so the tip never repeats. */
export function stampHomeSaturatedVisit(
  shownAt: number | null,
  now: number,
  showing: boolean,
): number | null {
  if (shownAt != null) return shownAt;
  if (!showing) return null;
  return now;
}
