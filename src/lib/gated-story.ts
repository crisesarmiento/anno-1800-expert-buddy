import { missionsById } from "./data/campaign.ts";
import type { LiveSnapshot } from "./live/types.ts";
import { islandLines, sessionLine } from "./second-screen.ts";

/** Stamp ids — player said they already saw it this save. */
export const SEEN_ISLA = "story:isla";
export const SEEN_PERIODICO = "story:periodico";

export const ASK_ISLA = "¿ya desbloqueaste otra isla?";
export const ASK_PERIODICO = "¿ya desbloqueaste el periódico?";
export const CHIP_ISLA = "Ya vi otra isla";
export const CHIP_PERIODICO = "Ya vi el periódico";

const NEWSPAPER_HINT = /periodico|periódico|prensa|newspaper|press|influenc/i;
const LAW_SPOILER =
  /crown falls|cape trelawney|trade union|sindicato|arbeitsverbot|work ban|evento del diario|diary event/i;
const RATIO = /\d+\s*:\s*\d+/;
const PRESS_MISSION = "ch1-press";

export type SeenIsland = { id: string; name: string };

export type GatedStoryInput = {
  snapshot: LiveSnapshot | null;
  missionId: string | null;
  pulse: { coins: string; houses: string; looking?: string };
  calm: "session" | "overwhelmed" | "broke";
  stamps: string[];
  /** Ignored. This surface is spoilers-off even if the session toggle is on. */
  spoilers?: boolean;
};

export type DemocracyDesk = {
  unlocked: boolean;
  title: string;
  line: string;
  ask: string | null;
  chip: string | null;
};

export type SituationTip = {
  verb: "frena" | "segui";
  title: string;
  line: string;
};

export type IslandSketch = SeenIsland & { x: number; y: number };

export type GatedStory = {
  islands: SeenIsland[];
  islandLines: string[];
  sessionLine: string;
  sketch: IslandSketch[];
  islandAsk: string | null;
  islandChip: string | null;
  democracy: DemocracyDesk;
  tip: SituationTip;
};

function telemetryHits(snapshot: LiveSnapshot | null): { id: string; name: string }[] {
  const tel = snapshot?.telemetry;
  if (!tel) return [];
  return [
    ...(tel.islands ?? []),
    ...(tel.buildings ?? []),
    ...(tel.chains ?? []),
    ...(tel.people ?? []),
    ...(tel.hints ?? []).map((hint) => ({ id: hint, name: hint })),
  ];
}

function blob(parts: string[]): string {
  return parts.join(" ");
}

export function seenIslands(snapshot: LiveSnapshot | null, stamps: string[] = []): SeenIsland[] {
  const rows = snapshot?.telemetry?.islands ?? [];
  const out: SeenIsland[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const id = row.id.trim();
    const name = row.name.trim();
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name });
  }
  if (stamps.includes(SEEN_ISLA) && out.length < 2) {
    out.push({ id: SEEN_ISLA, name: "Otra isla" });
  }
  return out;
}

export function islandSketch(islands: SeenIsland[]): IslandSketch[] {
  return islands.map((island, index) => {
    const hash = [...island.id].reduce((sum, ch) => sum + ch.charCodeAt(0), index * 17);
    return {
      ...island,
      x: 28 + (hash % 150),
      y: 24 + ((hash * 3) % 72),
    };
  });
}

function newspaperSeen(input: GatedStoryInput): boolean {
  if (input.stamps.includes(SEEN_PERIODICO)) return true;
  if (input.missionId === PRESS_MISSION) return true;
  const quests = input.snapshot?.quests ?? [];
  if (quests.some((quest) => NEWSPAPER_HINT.test(blob([quest.title, quest.objective ?? ""])))) {
    return true;
  }
  return telemetryHits(input.snapshot).some((hit) => NEWSPAPER_HINT.test(blob([hit.id, hit.name])));
}

function extraIslandSeen(input: GatedStoryInput): boolean {
  if (input.stamps.includes(SEEN_ISLA)) return true;
  return (input.snapshot?.telemetry?.islands ?? []).length >= 2;
}

function influenceSeen(input: GatedStoryInput): string | null {
  if (!newspaperSeen(input)) return null;
  const hints = input.snapshot?.telemetry?.hints ?? [];
  const hit = hints.find((hint) => /influenc/i.test(hint));
  if (!hit) return null;
  const clean = tenSecondLine(hit);
  if (LAW_SPOILER.test(clean)) return null;
  return clean;
}

export function situationTip(input: GatedStoryInput): SituationTip {
  const frena =
    input.pulse.coins === "down" ||
    input.pulse.houses === "empty" ||
    input.pulse.houses === "yellow" ||
    input.calm === "overwhelmed" ||
    input.calm === "broke";

  if (frena) {
    return {
      verb: "frena",
      title: "Frená",
      line: tenSecondLine("Pará. El diario espera — no plantes más."),
    };
  }

  const mission = input.missionId ? missionsById[input.missionId] : undefined;
  if (!mission) {
    return {
      verb: "segui",
      title: "Seguí el diario",
      line: tenSecondLine("Tocá el título que ves en el diario."),
    };
  }

  return {
    verb: "segui",
    title: "Seguí el diario",
    line: tenSecondLine(mission.title),
  };
}

export function democracyDesk(input: GatedStoryInput): DemocracyDesk {
  if (!newspaperSeen(input)) {
    return {
      unlocked: false,
      title: "Periódico",
      line: tenSecondLine("Todavía no. Si no lo ves en esta partida, no adelantes leyes."),
      ask: ASK_PERIODICO,
      chip: CHIP_PERIODICO,
    };
  }

  const influence = influenceSeen(input);
  return {
    unlocked: true,
    title: "Periódico e influencia",
    line: tenSecondLine(
      influence ??
        "El periódico es tu democracia. Influencia en el número que ya ves. Nada de leyes ni eventos que no salieron.",
    ),
    ask: null,
    chip: null,
  };
}

export function gatedStory(input: GatedStoryInput): GatedStory {
  const islands = seenIslands(input.snapshot, input.stamps);
  const extra = extraIslandSeen(input);
  const islandAsk = extra ? null : ASK_ISLA;
  const islandChip = islandAsk ? CHIP_ISLA : null;

  return {
    islands,
    islandLines: islandLines(islands),
    sessionLine: sessionLine({ snapshot: input.snapshot, missionId: input.missionId }),
    sketch: islandSketch(islands),
    islandAsk,
    islandChip,
    democracy: democracyDesk(input),
    tip: situationTip(input),
  };
}

export function tenSecondLine(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (RATIO.test(clean) || LAW_SPOILER.test(clean)) {
    return "Seguí el diario. Nada más.";
  }
  if (clean.length <= 140) return clean;
  const cut = clean.slice(0, 137);
  const space = cut.lastIndexOf(" ");
  return `${(space > 80 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export function isWalkthrough(text: string): boolean {
  const steps = text.split(/[.;] /).filter((part) => part.trim().length > 0);
  return steps.length > 2 || RATIO.test(text);
}
