import type { LiveQuestTimer } from "../live/types.ts";

/**
 * Timer from the last save. Do not subtract wall-clock time.
 * The app does not know live simulation speed or game time.
 */
export function frozenTimerRemainingMs(
  timer: LiveQuestTimer | undefined,
  _nowMs?: number,
): number | null {
  if (!timer || !Number.isFinite(timer.remainingMs) || timer.remainingMs < 0) return null;
  return Math.trunc(timer.remainingMs);
}

export function formatFrozenTimer(remainingMs: number): string {
  const totalSec = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
