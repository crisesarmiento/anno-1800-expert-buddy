import { buildingsById, resolveMission } from "./data/index.ts";
import type { MissionKind } from "./data/types.ts";
import type { PulseSample } from "./dash.ts";
import { fill, uiFor, type Locale } from "./i18n.ts";
import type { LiveSnapshot } from "./live/types.ts";
import { defaultPulse, type Pulse } from "./play.ts";
import type { CalmMode } from "./store.ts";

export const DO_NOW_VISIBLE = 3;
export const DO_NOW_BAG_CAP = 5;

export type DoNowBand = "bad" | "warn" | "session";

export type DoNowRow = {
  id: string;
  band: DoNowBand;
  title: string;
  detail?: string;
  presence?: "seen" | "missing";
};

export type RankDoThisNowInput = {
  missionId: string | null;
  pulse: Pulse;
  calm?: CalmMode;
  checks: number[];
  snapshot: LiveSnapshot | null;
  samples: PulseSample[];
  locale?: Locale | string | null;
  brakeActive?: boolean;
  missionKind?: MissionKind;
};

const BAND_RANK: Record<DoNowBand, number> = { bad: 3, warn: 2, session: 1 };

export function saturadoRojo(
  pulse: Pulse,
  calm: CalmMode = "session",
): { saturado: boolean; rojo: boolean } {
  const rojo = pulse.coins === "down" || calm === "broke";
  const saturado =
    calm === "overwhelmed" || pulse.houses === "yellow" || pulse.houses === "empty";
  return { saturado, rojo };
}

function shortDetail(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const bit = text.trim().split(/(?<=\.)\s+/)[0] ?? "";
  if (bit.length === 0 || bit.length > 72) return undefined;
  return bit;
}

function pulseUnknown(pulse: Pulse): boolean {
  return pulse.coins === "unknown" && pulse.houses === "unknown" && pulse.looking === "unknown";
}

function lastChangeAt(samples: PulseSample[], field: "coins" | "houses"): number {
  for (let i = samples.length - 1; i >= 0; i--) {
    const cur = samples[i];
    const prev = i > 0 ? samples[i - 1] : undefined;
    if (!prev || prev[field] !== cur[field]) {
      const ms = Date.parse(cur.at);
      return Number.isFinite(ms) ? ms : i;
    }
  }
  return 0;
}

function freshness(row: DoNowRow, samples: PulseSample[], snapshot: LiveSnapshot | null): number {
  if (row.id === "pulse:coins-down") return lastChangeAt(samples, "coins");
  if (row.id === "pulse:houses-empty" || row.id === "pulse:houses-yellow") {
    return lastChangeAt(samples, "houses");
  }
  if (row.id.startsWith("live:missing:")) {
    const ms = snapshot ? Date.parse(snapshot.updatedAt) : 0;
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

function tie(id: string): number {
  if (id === "pulse:coins-down") return 0;
  if (id === "pulse:houses-empty") return 1;
  if (id === "pulse:houses-yellow") return 2;
  if (id.startsWith("live:missing:")) return 3;
  if (id.startsWith("mission:do:")) return 4;
  if (id === "pulse:quest") return 5;
  return 9;
}

function sortBag(rows: DoNowRow[], samples: PulseSample[], snapshot: LiveSnapshot | null): DoNowRow[] {
  return [...rows].sort((a, b) => {
    const band = BAND_RANK[b.band] - BAND_RANK[a.band];
    if (band) return band;
    const fresh = freshness(b, samples, snapshot) - freshness(a, samples, snapshot);
    if (fresh) return fresh;
    return tie(a.id) - tie(b.id);
  });
}

/**
 * Ranked do-this-now for the session desk. Empty bag → caller keeps today's checklist.
 * Never includes informational dash noise (coins-up, Kahina, no-telemetry).
 */
export function rankDoThisNow(input: RankDoThisNowInput): DoNowRow[] {
  const resolved = resolveMission(input.missionId);
  if (!resolved) return [];

  const pulse = input.pulse ?? defaultPulse;
  const calm = input.calm ?? "session";
  const snapshot = input.snapshot;
  const t = uiFor(input.locale);
  const brake = Boolean(input.brakeActive);
  const kind = input.missionKind ?? resolved.mission.kind;

  const calmSignal = calm === "broke" || calm === "overwhelmed";
  if (pulseUnknown(pulse) && !calmSignal && !snapshot) return [];

  const suppressYellow = brake;
  const suppressBuild = brake;
  const suppressMissing = brake;

  const bag: DoNowRow[] = [];
  const seen = new Set<string>();
  const push = (row: DoNowRow) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    bag.push(row);
  };

  const coinsDown = pulse.coins === "down" || pulse.looking === "stats" || calm === "broke";
  if (coinsDown) {
    push({
      id: "pulse:coins-down",
      band: "bad",
      title: t.next.coinsTitle,
      detail: shortDetail(t.next.coinsDetail),
    });
  }

  if (pulse.houses === "empty") {
    push({
      id: "pulse:houses-empty",
      band: "bad",
      title: t.next.emptyTitle,
      detail: shortDetail(t.next.emptyDetail),
    });
  } else if (pulse.houses === "yellow" && !suppressYellow) {
    push({
      id: "pulse:houses-yellow",
      band: "warn",
      title: t.next.yellowTitle,
      detail: shortDetail(t.next.yellowDetail),
    });
  }

  const telemetry = snapshot?.telemetry;
  const hits = new Set((telemetry?.buildings ?? []).map((item) => item.id));
  if (!suppressMissing && hits.size > 0) {
    for (const id of resolved.mission.buildingIds) {
      if (hits.has(id)) continue;
      const name = buildingsById[id]?.name ?? id;
      push({
        id: `live:missing:${id}`,
        band: "warn",
        title: fill(t.dash.fixBuilding, name),
        presence: "missing",
      });
    }
  }

  const hasBadOrWarn = bag.some((row) => row.band === "bad" || row.band === "warn");

  const skipDo = suppressBuild && kind === "build";
  if (!skipDo) {
    const next = resolved.mission.do.findIndex((_, index) => !input.checks.includes(index));
    if (next >= 0) {
      const title = resolved.mission.do[next] ?? t.next.nowFallback;
      const dup = bag.some((row) => row.title === title || row.detail === title);
      if (!dup) {
        push({
          id: `mission:do:${next}`,
          band: "session",
          title,
        });
      }
    }
  }

  if (pulse.looking === "quest" && !hasBadOrWarn) {
    push({
      id: "pulse:quest",
      band: "session",
      title: t.next.questTitle,
      detail: shortDetail(t.next.questDetail),
    });
  }

  const sorted = sortBag(bag, input.samples ?? [], snapshot).slice(0, DO_NOW_BAG_CAP);
  return sorted.slice(0, DO_NOW_VISIBLE);
}
