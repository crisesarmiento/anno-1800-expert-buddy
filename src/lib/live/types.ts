export const LIVE_SCHEMA = "harbor-live-v1" as const;
export const LIVE_GAME = "anno-1800" as const;
export const LIVE_MAX_BYTES = 200 * 1024;
export const LIVE_MAX_QUESTS = 40;
export const LIVE_MAX_TITLE = 200;

export type LiveSource = "telemetry" | "save" | "file";
export type LiveQuestState = "active" | "ready" | "done";
export type LiveCoins = "unknown" | "up" | "down";
export type LiveHouses = "unknown" | "ok" | "yellow" | "empty";

export type LiveQuest = {
  title: string;
  state: LiveQuestState;
  objective?: string;
};

export type LivePulseHint = {
  coins: LiveCoins;
  houses: LiveHouses;
};

export type LiveSnapshot = {
  schema: typeof LIVE_SCHEMA;
  source: LiveSource;
  updatedAt: string;
  game: typeof LIVE_GAME;
  quests: LiveQuest[];
  pulseHint?: LivePulseHint;
};

export type LiveMatch = {
  missionId: string | null;
  confidence: number;
  rawTitles: string[];
};

export type LiveIngestOk = { ok: true; snapshot: LiveSnapshot };
export type LiveIngestFail = { ok: false; message: string };
export type LiveIngestResult = LiveIngestOk | LiveIngestFail;
