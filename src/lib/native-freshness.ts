/**
 * UI-only staleness for an OCR sample (Production or Finance). Never written to harbor-live.json —
 * see docs/native-telemetry.md ("Stale = UI ONLY").
 *
 * Stale when either:
 * - a more recent save (`savedAt`) exists after the OCR sample plus a small tolerance (the save
 *   has moved past what the OCR sample described), or
 * - the OCR sample itself is older than the fallback window (default 15 minutes) from `now`.
 */

const DEFAULT_TOLERANCE_MS = 60_000;
const DEFAULT_FALLBACK_MS = 15 * 60_000;

export function isOcrSampleStale(input: {
  observedAt: string | undefined;
  savedAt?: string;
  now: number;
  toleranceMs?: number;
  fallbackMs?: number;
}): boolean {
  const { observedAt, savedAt, now, toleranceMs = DEFAULT_TOLERANCE_MS, fallbackMs = DEFAULT_FALLBACK_MS } =
    input;
  if (!observedAt) return true;
  const observedTime = Date.parse(observedAt);
  if (!Number.isFinite(observedTime)) return true;
  if (savedAt) {
    const savedTime = Date.parse(savedAt);
    if (Number.isFinite(savedTime) && savedTime > observedTime + toleranceMs) return true;
  }
  return now - observedTime > fallbackMs;
}
