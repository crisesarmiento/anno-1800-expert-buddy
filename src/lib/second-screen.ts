import { missionsById } from "./data/campaign.ts";
import type { LiveIngestResult, LiveSnapshot } from "./live/types.ts";

export type NamedIsland = { id: string; name: string };

/** Document surface: a tab/PWA parked on the second monitor. Never a HUD. */
export const SECOND_SCREEN_SURFACE = "second-screen";

export const OVERLAY_FORBIDDEN = [
  "alwaysOnTop",
  "setAlwaysOnTop",
  "setIgnoreMouseEvents",
  "click-through",
  "clickThrough",
  "BrowserWindow",
  'display: "overlay"',
  "display: 'overlay'",
  "display: overlay",
] as const;

export function islandLines(islands: NamedIsland[]): string[] {
  return islands.map((island) => island.name.trim()).filter(Boolean);
}

export function sessionLine(opts: {
  snapshot: LiveSnapshot | null;
  missionId: string | null;
}): string {
  const mission = opts.missionId ? missionsById[opts.missionId] : undefined;
  const quest = opts.snapshot?.quests.find((q) => q.state === "active" || q.state === "ready");
  const title = (mission?.title ?? quest?.title ?? "").trim();
  const session = opts.snapshot?.sessionName?.trim() ?? "";
  if (session && title) return `${session} · ${title}`;
  if (title) return title;
  if (session) return session;
  return "Tocá el título que ves en el diario.";
}

/** Watch ticks: keep last good snapshot. Bad JSON does not banner. */
export function liveWatchSnapshot(result: LiveIngestResult): LiveSnapshot | null {
  return result.ok ? result.snapshot : null;
}
