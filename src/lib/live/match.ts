import { missions } from "../data/campaign.ts";
import { findMissions } from "../data/find.ts";
import type { LiveMatch, LiveQuest, LiveSnapshot } from "./types.ts";

const MIN_SCORE = 3;

/** Latest unique building that unlocks a campaign floor. First hit wins. */
const TELEMETRY_GATES: { hit: string; missionId: string }[] = [
  { hit: "obrero", missionId: "ch3-refugees" },
  { hit: "jornalero", missionId: "ch3-rebels" },
  { hit: "steelworks", missionId: "ch2-industrial" },
  { hit: "furnace", missionId: "ch2-industrial" },
  { hit: "iron-mine", missionId: "ch2-iron" },
  { hit: "charcoal", missionId: "ch2-industrial" },
  { hit: "worker-house", missionId: "ch1-raise" },
];

export function matchLiveQuests(quests: LiveQuest[]): LiveMatch {
  const rawTitles = quests.map((quest) => quest.title).filter(Boolean);
  const preferred = quests.filter(
    (quest) => quest.state === "active" || quest.state === "ready",
  );

  let missionId: string | null = null;
  let confidence = 0;

  for (const quest of preferred) {
    const hits = findMissions(quest.title);
    const top = hits[0];
    if (!top || top.score < MIN_SCORE) continue;
    if (top.score > confidence) {
      confidence = top.score;
      missionId = top.mission.id;
    }
  }

  if (confidence < MIN_SCORE) {
    return { missionId: null, confidence: 0, rawTitles };
  }

  return { missionId, confidence, rawTitles };
}

function buildingHits(snapshot: LiveSnapshot): Set<string> {
  return new Set((snapshot.telemetry?.buildings ?? []).map((item) => item.id));
}

export function inferMissionFromTelemetry(snapshot: LiveSnapshot): LiveMatch {
  const hits = buildingHits(snapshot);
  const labels = [
    snapshot.sessionName,
    snapshot.islandName,
    ...[...hits],
  ].filter(Boolean) as string[];

  if (hits.size === 0) {
    return { missionId: null, confidence: 0, rawTitles: labels };
  }

  let floorId = "ch1-spark";
  for (const gate of TELEMETRY_GATES) {
    if (hits.has(gate.hit)) {
      floorId = gate.missionId;
      break;
    }
  }

  const floorIndex = Math.max(0, missions.findIndex((mission) => mission.id === floorId));
  let current = missions[floorIndex] ?? missions[0];
  for (let i = floorIndex; i < missions.length; i++) {
    const mission = missions[i];
    const needed = mission.buildingIds ?? [];
    if (needed.length === 0) continue;
    const missing = needed.filter((id) => !hits.has(id));
    current = mission;
    if (missing.length > 0) break;
  }

  return {
    missionId: current?.id ?? null,
    confidence: current ? 5 : 0,
    rawTitles: labels,
  };
}

export function matchLiveSnapshot(snapshot: LiveSnapshot): LiveMatch {
  const fromQuests = matchLiveQuests(snapshot.quests);
  if (fromQuests.missionId && fromQuests.confidence >= MIN_SCORE) return fromQuests;
  return inferMissionFromTelemetry(snapshot);
}
