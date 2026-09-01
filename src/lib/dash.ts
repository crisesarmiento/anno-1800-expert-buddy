import { buildingsById, chains, peopleById, resolveMission } from "@/lib/data";
import type { UiDict } from "@/lib/i18n";
import type { LiveSnapshot, LiveTelemetry } from "@/lib/live";
import type { CoinsPulse, HousesPulse, Pulse } from "@/lib/play";
import { fill } from "@/lib/i18n";

export type PulseSample = {
  at: string;
  coins: CoinsPulse;
  houses: HousesPulse;
};

export type DashAlert = {
  tone: "ok" | "warn" | "bad";
  text: string;
};

export type CoverageRow = {
  id: string;
  name: string;
  found: boolean;
};

export type ChainRow = {
  id: string;
  title: string;
  found: number;
  total: number;
};

export type DashModel = {
  missionTitle: string;
  chapterTitle: string;
  coins: CoinsPulse;
  houses: HousesPulse;
  seenBuildings: number;
  seenPeople: number;
  alerts: DashAlert[];
  buildings: CoverageRow[];
  extras: CoverageRow[];
  chains: ChainRow[];
  people: CoverageRow[];
  islands: CoverageRow[];
  hints: string[];
  fixes: string[];
  history: { label: string; coins: number; houses: number }[];
};

function foundIds(hits: { id: string }[] | undefined) {
  return new Set((hits ?? []).map((item) => item.id));
}

function coinsScore(value: CoinsPulse) {
  if (value === "up") return 1;
  if (value === "down") return -1;
  return 0;
}

function housesScore(value: HousesPulse) {
  if (value === "ok") return 1;
  if (value === "yellow") return 0;
  if (value === "empty") return -1;
  return 0;
}

export function buildDashboard(input: {
  missionId: string | null;
  pulse: Pulse;
  snapshot: LiveSnapshot | null;
  samples: PulseSample[];
  t: UiDict;
}): DashModel {
  const resolved = resolveMission(input.missionId);
  const telemetry: LiveTelemetry = input.snapshot?.telemetry ?? {};
  const buildingHits = foundIds(telemetry.buildings);
  const personHits = foundIds(telemetry.people);
  const chainHits = foundIds(telemetry.chains);
  const islandHits = foundIds(telemetry.islands);

  const expectedIds = resolved?.mission.buildingIds ?? [];
  const buildings: CoverageRow[] = expectedIds.map((id) => ({
    id,
    name: buildingsById[id]?.name ?? id,
    found: buildingHits.has(id),
  }));

  const extras: CoverageRow[] = (telemetry.buildings ?? [])
    .filter((item) => !expectedIds.includes(item.id))
    .map((item) => ({ id: item.id, name: item.name, found: true }));

  const chainRows: ChainRow[] = chains.map((chain) => ({
    id: chain.id,
    title: chain.title,
    found: chainHits.has(chain.id) ? chain.steps.length : 0,
    total: chain.steps.length,
  }));

  const people: CoverageRow[] = (telemetry.people ?? []).map((item) => ({
    id: item.id,
    name: peopleById[item.id]?.name ?? item.name,
    found: true,
  }));

  const islands: CoverageRow[] = (telemetry.islands ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    found: true,
  }));

  const alerts: DashAlert[] = [];
  const fixes: string[] = [];
  const t = input.t.dash;

  if (input.pulse.coins === "down") {
    alerts.push({ tone: "bad", text: t.alertCoins });
    fixes.push(...(resolved?.life?.money.keepGreen.slice(0, 2) ?? []));
  } else if (input.pulse.coins === "up") {
    alerts.push({ tone: "ok", text: t.alertCoinsOk });
  }

  if (input.pulse.houses === "empty") {
    alerts.push({ tone: "bad", text: t.alertEmpty });
  } else if (input.pulse.houses === "yellow") {
    alerts.push({ tone: "warn", text: t.alertYellow });
  }

  const missing = buildings.filter((row) => !row.found);
  if (missing.length && buildingHits.size > 0) {
    alerts.push({
      tone: "warn",
      text: fill(t.alertMissing, missing.map((row) => row.name).join(", ")),
    });
    fixes.push(...missing.slice(0, 2).map((row) => fill(t.fixBuilding, row.name)));
  }

  if (personHits.has("competitors")) {
    alerts.push({ tone: "warn", text: t.alertWar });
  }
  if (personHits.has("kahina")) {
    alerts.push({ tone: "ok", text: t.alertKahina });
  }

  if (!input.snapshot?.telemetry) {
    alerts.push({ tone: "warn", text: t.none });
  }

  if (fixes.length === 0 && resolved) {
    fixes.push(resolved.mission.overwhelmed);
  }

  const history = input.samples.slice(-12).map((sample, index) => ({
    label: String(index + 1),
    coins: coinsScore(sample.coins),
    houses: housesScore(sample.houses),
  }));

  return {
    missionTitle: resolved?.mission.title ?? t.noMission,
    chapterTitle: resolved?.chapter.title ?? "",
    coins: input.pulse.coins,
    houses: input.pulse.houses,
    seenBuildings: telemetry.buildings?.length ?? 0,
    seenPeople: telemetry.people?.length ?? 0,
    alerts: alerts.slice(0, 6),
    buildings,
    extras: extras.slice(0, 8),
    chains: chainRows,
    people,
    islands,
    hints: telemetry.hints ?? [],
    fixes: fixes.slice(0, 5),
    history,
  };
}
