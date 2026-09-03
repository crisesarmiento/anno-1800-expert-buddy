import { ingestLiveJsonText } from "./validate.ts";
import type { LiveSnapshot } from "./types.ts";

export const HARBOR_LIVE_NAME = "harbor-live.json";
export const HARBOR_LIVE_LAST_GOOD = "harbor-live.last-good.json";

export type LivePreferOk = { ok: true; snapshot: LiveSnapshot; usedLastGood: boolean };
export type LivePreferFail = {
  ok: false;
  message: string;
  kind?: string;
  silent?: boolean;
};
export type LivePreferResult = LivePreferOk | LivePreferFail;

export function ingestLivePreferLastGood(input: {
  primary: string;
  lastGood?: string | null;
  locale?: string | null;
}): LivePreferResult {
  const primary = ingestLiveJsonText(input.primary, input.locale);
  if (primary.ok) {
    return { ok: true, snapshot: primary.snapshot, usedLastGood: false };
  }
  if (primary.kind !== "broken") {
    return primary;
  }
  if (input.lastGood) {
    const fallback = ingestLiveJsonText(input.lastGood, input.locale);
    if (fallback.ok) {
      return { ok: true, snapshot: fallback.snapshot, usedLastGood: true };
    }
  }
  return {
    ok: false,
    message: primary.message,
    kind: "broken",
    silent: true,
  };
}
