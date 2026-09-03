export const LIVE_SCHEMA = "harbor-live-v1" as const;
export const LIVE_GAME = "anno-1800" as const;
export const LIVE_MAX_BYTES = 400 * 1024;
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

export type LiveNamedHit = {
  id: string;
  name: string;
};

export type LiveGoodHit = {
  id: string;
  name: string;
  amount: number;
};

export type LiveTelemetry = {
  buildings?: LiveNamedHit[];
  people?: LiveNamedHit[];
  chains?: LiveNamedHit[];
  islands?: LiveNamedHit[];
  hints?: string[];
  goods?: LiveGoodHit[];
};

/** Presencia de estrato (needles del catálogo). Sin conteos. */
export const LIVE_WORKFORCE_TIERS = [
  "farmers",
  "workers",
  "artisans",
  "engineers",
] as const;
export type LiveWorkforceTier = (typeof LIVE_WORKFORCE_TIERS)[number];
export type LiveWorkforce = Partial<Record<LiveWorkforceTier, true>>;

export type LiveSnapshot = {
  schema: typeof LIVE_SCHEMA;
  source: LiveSource;
  updatedAt: string;
  game: typeof LIVE_GAME;
  quests: LiveQuest[];
  pulseHint?: LivePulseHint;
  telemetry?: LiveTelemetry;
  /** Nombre del .a7s (filesystem). No se parsea el binario. */
  sessionName?: string;
  /** Primer hit de isla del catálogo, si hay. */
  islandName?: string;
  /** mtime UTC del .a7s. Distinto de updatedAt (cuándo se escribió el JSON). */
  savedAt?: string;
  workforce?: LiveWorkforce;
};

export type LiveMatch = {
  missionId: string | null;
  confidence: number;
  rawTitles: string[];
};

export type LiveIngestOk = { ok: true; snapshot: LiveSnapshot };
export type LiveIngestFail = { ok: false; message: string; kind?: string; silent?: boolean };
export type LiveIngestResult = LiveIngestOk | LiveIngestFail;
