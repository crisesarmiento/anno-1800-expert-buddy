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

/** Building hit with an optional presence count. Count is never used to paint grids/chains — see docs/harbor-live-fields.md. */
export type LiveBuildingHit = LiveNamedHit & {
  count?: number;
};

export type LiveGoodHit = {
  id: string;
  name: string;
  amount: number;
};

export type LiveTradeRouteGood = {
  guid: number;
  id?: string;
  name?: string;
  amount: number;
};

/** Change in save-wide stock between two distinct saves from the same session. */
export type LiveGoodChange = {
  id: string;
  name: string;
  previousAmount: number;
  amount: number;
  delta: number;
  previousSavedAt: string;
};

export type LiveTradeRouteStop = {
  areaId?: number;
  goods: LiveTradeRouteGood[];
};

export type LiveTradeRoute = {
  id?: number;
  name: string;
  ownerId?: number;
  shipCount: number;
  stops: LiveTradeRouteStop[];
};

export type LiveConnection = {
  mode: "documents-save" | "ubisoft-cloud" | "native" | "manual";
  fileName?: string;
  buildingKinds?: number;
  buildingTotal?: number;
  goodsKinds?: number;
  routeCount?: number;
  islandCount?: number;
  questCount?: number;
  native?: LiveNativeConnection;
  nativeProbe?: LiveNativeProbe;
};

export type LiveNativeView = "production" | "finance" | "population" | "unknown";

export type LiveNativeConnection = {
  provider: "ux-enhancer-ocr";
  view: LiveNativeView;
  observedAt: string;
  islandName?: string;
  serverVersion?: string;
};

export type LiveNativeProbeState = "reachable" | "unreachable" | "invalid_response";
export type LiveNativeProbeReason = "timeout" | "connection_refused" | "bad_payload";

/**
 * Technical probe facts only (never game-state words like missing/starting/connected/stale/wrong_view).
 * Independent of connection.native, which stays the last *valid* OCR observation and is never cleared
 * on disconnect — see docs/native-telemetry.md.
 */
export type LiveNativeProbe = {
  provider: "ux-enhancer-ocr";
  state: LiveNativeProbeState;
  lastProbeAt: string;
  lastSuccessAt?: string;
  reason?: LiveNativeProbeReason;
  /** HTTP reachability does not imply a recognized game observation. */
  result?: "observation" | "no_observation" | "no_window";
};

/** OCR sample from Anno's statistics screen. Values stay raw and evidence-stamped. */
export type LiveProductionMetric = {
  guid: number;
  id?: string;
  name: string;
  observedAt: string;
  islandName?: string;
  amount?: number;
  requiredTMin?: number;
  productivity?: number;
  buildingCount?: number;
  /** When Finance last supplied buildingCount, independent of `observedAt` (Production's sample time). */
  buildingCountObservedAt?: string;
};

export type LiveTelemetry = {
  buildings?: LiveBuildingHit[];
  people?: LiveNamedHit[];
  chains?: LiveNamedHit[];
  islands?: LiveNamedHit[];
  hints?: string[];
  goods?: LiveGoodHit[];
  goodsChanges?: LiveGoodChange[];
  routes?: LiveTradeRoute[];
  production?: LiveProductionMetric[];
};

/** Presencia de estrato (needles del catálogo). Sin conteos. */
export const LIVE_WORKFORCE_TIERS = ["farmers", "workers", "artisans", "engineers"] as const;
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
  /**
   * Primer hit de catálogo de sesión/región (Old World / New World / …).
   * No es el rename del jugador ni una colonia. Ver docs/evidence-matrix.md.
   */
  islandName?: string;
  /** mtime UTC del .a7s. Distinto de updatedAt (cuándo se escribió el JSON). */
  savedAt?: string;
  workforce?: LiveWorkforce;
  connection?: LiveConnection;
};

export type LiveMatchKind = "none" | "confirmed" | "suggested";
export type LiveMatchSource = "none" | "quests" | "buildings";

export type LiveMatch = {
  missionId: string | null;
  confidence: number;
  rawTitles: string[];
  /** Confirmed only from explicit quest titles in the JSON. Building inference is suggested. */
  kind: LiveMatchKind;
  source: LiveMatchSource;
};

export type LiveIngestOk = { ok: true; snapshot: LiveSnapshot };
export type LiveIngestFail = { ok: false; message: string; kind?: string; silent?: boolean };
export type LiveIngestResult = LiveIngestOk | LiveIngestFail;
