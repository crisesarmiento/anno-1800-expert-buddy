export const LIVE_SCHEMA = "harbor-live-v1" as const;
export const LIVE_GAME = "anno-1800" as const;
export const LIVE_MAX_BYTES = 400 * 1024;
export const LIVE_MAX_QUESTS = 40;
export const LIVE_MAX_TITLE = 200;
export const LIVE_MAX_QUEST_OBJECTIVES = 8;
export const LIVE_MAX_INSTANCE_ID = 80;
export const LIVE_MAX_ISLAND_SNAPSHOTS = 40;
export const LIVE_MAX_ISLAND_STOCK = 24;
export const LIVE_MAX_ISLAND_BUILDINGS = 40;
export const LIVE_MAX_FLEET = 80;

export type LiveSource = "telemetry" | "save" | "file";
export type LiveQuestState = "active" | "ready" | "done" | "failed" | "expired";
export type LiveQuestType = "story" | "delivery" | "errand" | "timer" | "unknown";
export type LiveCoins = "unknown" | "up" | "down";
export type LiveHouses = "unknown" | "ok" | "yellow" | "empty";

export type LiveQuestObjective = {
  id?: string;
  text?: string;
  current?: number;
  required?: number;
  goodId?: string;
  goodName?: string;
};

/**
 * Remaining time frozen at the save. The app must not tick this with wall-clock.
 */
export type LiveQuestTimer = {
  remainingMs: number;
  observedAt?: string;
};

export type LiveQuestProgress = {
  current: number;
  required: number;
};

export type LiveQuest = {
  title: string;
  /** Absent is not active. A GUID without state is identity only. */
  state?: LiveQuestState;
  objective?: string;
  /** Distinguishes repeated instances that share the same GUID. */
  instanceId?: string;
  guid?: number;
  type?: LiveQuestType;
  objectives?: LiveQuestObjective[];
  progress?: LiveQuestProgress;
  timer?: LiveQuestTimer;
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
  /**
   * Raw `IsLoading` byte when the save wrote it.
   * Absent stays omitted — never defaulted to load or unload.
   */
  isLoading?: boolean;
};

/** Player-facing ship name, only when VehicleName joins a route id. */
export type LiveRouteShip = {
  name: string;
};

export type LiveRouteDeliveryGood = {
  guid: number;
  id?: string;
  name?: string;
  visitCount: number;
  medianAbsAmount: number;
  lastAmount: number;
};

/**
 * Delivery of one good at one station. Interval is that series only —
 * never mixed with the other stop of the same route.
 */
export type LiveRouteStationDelivery = {
  guid: number;
  id?: string;
  name?: string;
  visitCount: number;
  medianAbsAmount: number;
  lastAmount: number;
  areaId?: number;
  intervalMsMedian?: number;
};

/**
 * Compact history from PassiveTrade/History/TradeRouteEntries.
 * Signed lastAmount is the last finalized visit; it is not load/unload.
 * Route-level goods stay a compact summary; station rows are the
 * destination/good series used for inferred t/min.
 */
export type LiveRouteDelivery = {
  visitCount: number;
  lastExecutionTime: number;
  intervalMsMedian?: number;
  goods: LiveRouteDeliveryGood[];
  stations?: LiveRouteStationDelivery[];
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
  ships?: LiveRouteShip[];
  delivery?: LiveRouteDelivery;
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

/** Composite island identity: session/region GUID + AreaInfo area id. */
export type LiveIslandRef = {
  regionId: number;
  areaId: number;
};

export type LiveNativeConnection = {
  provider: "ux-enhancer-ocr";
  view: LiveNativeView;
  observedAt: string;
  islandName?: string;
  serverVersion?: string;
  /** Set only when OCR display name maps to exactly one save island. */
  islandRef?: LiveIslandRef;
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
  /** Set only when this OCR row maps to exactly one save island. */
  islandRef?: LiveIslandRef;
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
  /**
   * Player ships (ownerId === 0) when VehicleName + Owner were read.
   * Omitted when the save did not yield a verified player hull.
   * Catalog upkeep is not stored here.
   */
  fleet?: LiveFleetShip[];
};

/** Presencia de estrato (needles del catálogo). Sin conteos. */
export const LIVE_WORKFORCE_TIERS = ["farmers", "workers", "artisans", "engineers"] as const;
export type LiveWorkforceTier = (typeof LIVE_WORKFORCE_TIERS)[number];
export type LiveWorkforce = Partial<Record<LiveWorkforceTier, true>>;

export type LiveEvidenceSource = "save" | "ocr" | "manual";

export type LiveFieldCoverage = {
  source: LiveEvidenceSource;
  observedAt?: string;
  scope?: string;
};

export type LiveShipKind = "trade" | "military" | "flagship" | "unknown";

export type LiveShipAssignment = {
  kind: "trade-route" | "unknown";
  routeId?: number;
  routeName?: string;
};

export type LiveShipLocation = {
  regionId?: number;
  areaId?: number;
  name?: string;
};

/**
 * One player hull. Owner must be Participant 0.
 * Assignment stays unknown unless a TradeRouteID was present.
 */
export type LiveFleetShip = {
  name?: string;
  guid?: number;
  id?: string;
  typeName?: string;
  kind?: LiveShipKind;
  ownerId: number;
  metaId?: number;
  assignment?: LiveShipAssignment;
  location?: LiveShipLocation;
  coverage: {
    identity: LiveFieldCoverage;
    type?: LiveFieldCoverage;
    assignment?: LiveFieldCoverage;
    location?: LiveFieldCoverage;
  };
};

export type LiveIslandNameSource = "city-name" | "city-name-guid" | "neutral";

export type LiveIslandStock = {
  id: string;
  name: string;
  amount: number;
};

export type LiveIslandPopulation = {
  farmers?: number;
  workers?: number;
  artisans?: number;
  engineers?: number;
};

export type LiveIslandCapacities = {
  warehouse?: number;
};

/**
 * One colony in one session. Identity is regionId+areaId, never the display name.
 * Optional blocks are omitted when unknown — never filled with 0.
 */
export type LiveIslandSnapshot = {
  regionId: number;
  areaId: number;
  ownerId: number;
  name: string;
  nameSource: LiveIslandNameSource;
  stock?: LiveIslandStock[];
  buildings?: LiveBuildingHit[];
  population?: LiveIslandPopulation;
  capacities?: LiveIslandCapacities;
  coverage: {
    identity: LiveFieldCoverage;
    stock?: LiveFieldCoverage;
    buildings?: LiveFieldCoverage;
    population?: LiveFieldCoverage;
    capacities?: LiveFieldCoverage;
  };
};

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
  /** Verifiable campaign id from the save. Never inferred from filename/mtime. */
  campaignId?: string;
  /** Participant id when it is the human player (0). */
  playerId?: number;
  /** Save-internal snapshot id when present. */
  snapshotId?: string;
  /** Simulation clock from the save when present. Not filesystem mtime. */
  simTime?: number;
  islandSnapshots?: LiveIslandSnapshot[];
  /**
   * Player-owned cash only (GUID 1010017, ParticipantID 0).
   * Omitted when the owner is unknown — never filled with 0.
   * Recurrent income/maintenance stay off the contract until owner-scoped.
   */
  economy?: LiveEconomy;
};

export type LiveEconomy = {
  treasury: number;
  coverage: {
    treasury: LiveFieldCoverage;
  };
};

export type LiveMatchKind = "none" | "confirmed" | "suggested";
export type LiveMatchSource = "none" | "quests" | "buildings";

/**
 * Three honest channels. Never mix them in copy or completion:
 * - suggestion: campaign matcher / buildings. Never "misión completada".
 * - manual: player checklist. Clearly labeled.
 * - save-read: decoded instance/state from the JSON. Only when those fields exist.
 */
export type MissionChannel = "suggestion" | "manual" | "save-read";

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
