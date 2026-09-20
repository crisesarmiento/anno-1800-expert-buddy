import { uiFor } from "../i18n.ts";
import { LIVE_MSG } from "./messages.ts";
import { attachOcrIslandIdentity } from "./ocr-island.ts";
import {
  LIVE_GAME,
  LIVE_MAX_BYTES,
  LIVE_MAX_ISLAND_BUILDINGS,
  LIVE_MAX_ISLAND_SNAPSHOTS,
  LIVE_MAX_ISLAND_STOCK,
  LIVE_MAX_QUESTS,
  LIVE_MAX_TITLE,
  LIVE_SCHEMA,
  LIVE_WORKFORCE_TIERS,
  type LiveBuildingHit,
  type LiveConnection,
  type LiveEconomy,
  type LiveEvidenceSource,
  type LiveFieldCoverage,
  type LiveGoodChange,
  type LiveIngestResult,
  type LiveIslandNameSource,
  type LiveIslandPopulation,
  type LiveIslandRef,
  type LiveIslandSnapshot,
  type LiveIslandStock,
  type LiveNamedHit,
  type LiveNativeConnection,
  type LiveNativeProbe,
  type LiveNativeProbeReason,
  type LiveNativeProbeState,
  type LiveNativeView,
  type LiveProductionMetric,
  type LivePulseHint,
  type LiveQuest,
  type LiveQuestState,
  type LiveSnapshot,
  type LiveSource,
  type LiveTelemetry,
  type LiveTradeRoute,
  type LiveWorkforce,
} from "./types.ts";

const JSON_MIME = new Set(["application/json", "text/plain"]);
const QUEST_STATES = new Set<LiveQuestState>(["active", "ready", "done"]);
const SOURCES = new Set<LiveSource>(["telemetry", "save", "file"]);
const COINS = new Set(["unknown", "up", "down"]);
const HOUSES = new Set(["unknown", "ok", "yellow", "empty"]);
const CONNECTION_MODES = new Set<LiveConnection["mode"]>([
  "documents-save",
  "ubisoft-cloud",
  "native",
  "manual",
]);
const NATIVE_VIEWS = new Set<LiveNativeView>(["production", "finance", "population", "unknown"]);
const NATIVE_PROBE_STATES = new Set<LiveNativeProbeState>([
  "reachable",
  "unreachable",
  "invalid_response",
]);
const NATIVE_PROBE_REASONS = new Set<LiveNativeProbeReason>([
  "timeout",
  "connection_refused",
  "bad_payload",
]);
const EVIDENCE_SOURCES = new Set<LiveEvidenceSource>(["save", "ocr", "manual"]);
const ISLAND_NAME_SOURCES = new Set<LiveIslandNameSource>([
  "city-name",
  "city-name-guid",
  "neutral",
]);

function hasJsonExtension(filename: string) {
  return filename.toLowerCase().endsWith(".json");
}

function looksLikeSave(bytes: Uint8Array) {
  if (bytes.includes(0)) return true;
  const head = decoder.decode(bytes.slice(0, 32));
  if (head.startsWith("Resource File")) return true;
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) return true;
  const lower = head.toLowerCase();
  if (lower.startsWith("rda") || lower.includes("\0rda")) return true;
  return false;
}

const decoder = new TextDecoder("utf-8");

function msg(key: keyof typeof LIVE_MSG, locale?: string | null) {
  return uiFor(locale).liveMsg[key];
}

function hasCodeOrUrl(raw: string) {
  if (/\beval\s*\(/.test(raw)) return true;
  if (/\bFunction\s*\(/.test(raw)) return true;
  if (/\bnew\s+Function\b/.test(raw)) return true;
  if (/\bhttps?:\/\//i.test(raw)) return true;
  return false;
}

function asRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeQuest(value: unknown, locale?: string | null): LiveQuest | { error: string } {
  if (!asRecord(value)) return { error: msg("quests", locale) };
  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (!title) return { error: msg("emptyTitle", locale) };
  if (title.length > LIVE_MAX_TITLE) return { error: msg("longTitle", locale) };
  let state: LiveQuestState = "active";
  if (value.state !== undefined) {
    if (typeof value.state !== "string" || !QUEST_STATES.has(value.state as LiveQuestState)) {
      return { error: msg("badState", locale) };
    }
    state = value.state as LiveQuestState;
  }
  const quest: LiveQuest = { title, state };
  if (typeof value.objective === "string" && value.objective.trim()) {
    quest.objective = value.objective.trim().slice(0, 400);
  }
  return quest;
}

function clipName(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeHits(value: unknown, maxItems: number): LiveNamedHit[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const hits: LiveNamedHit[] = [];
  for (const item of value.slice(0, maxItems)) {
    if (!asRecord(item)) continue;
    const id = clipName(item.id, 48);
    const name = clipName(item.name, 80);
    if (!id || !name) continue;
    hits.push({ id, name });
  }
  return hits.length ? hits : undefined;
}

function normalizeBuildingHits(value: unknown, maxItems: number): LiveBuildingHit[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const hits: LiveBuildingHit[] = [];
  for (const item of value.slice(0, maxItems)) {
    if (!asRecord(item)) continue;
    const id = clipName(item.id, 48);
    const name = clipName(item.name, 80);
    if (!id || !name) continue;
    const hit: LiveBuildingHit = { id, name };
    if (typeof item.count === "number" && Number.isFinite(item.count) && item.count > 0) {
      hit.count = Math.trunc(item.count);
    }
    hits.push(hit);
  }
  return hits.length ? hits : undefined;
}

function normalizeTelemetry(value: unknown): LiveTelemetry | undefined {
  if (!asRecord(value)) return undefined;
  const telemetry: LiveTelemetry = {};
  const buildings = normalizeBuildingHits(value.buildings, 80);
  const people = normalizeHits(value.people, 24);
  const chains = normalizeHits(value.chains, 20);
  const islands = normalizeHits(value.islands, 20);
  if (buildings) telemetry.buildings = buildings;
  if (people) telemetry.people = people;
  if (chains) telemetry.chains = chains;
  if (islands) telemetry.islands = islands;
  if (Array.isArray(value.hints)) {
    const hints = value.hints
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 30);
    if (hints.length) telemetry.hints = hints;
  }
  if (Array.isArray(value.goods)) {
    const goods: NonNullable<LiveTelemetry["goods"]> = [];
    for (const item of value.goods.slice(0, 40)) {
      if (!asRecord(item)) continue;
      const id = clipName(item.id, 48);
      const name = clipName(item.name, 80);
      const amount =
        typeof item.amount === "number" && Number.isFinite(item.amount)
          ? Math.trunc(item.amount)
          : null;
      if (!id || !name || amount == null) continue;
      goods.push({ id, name, amount });
    }
    if (goods.length) telemetry.goods = goods;
  }
  if (Array.isArray(value.goodsChanges)) {
    const changes: LiveGoodChange[] = [];
    for (const item of value.goodsChanges.slice(0, 40)) {
      if (!asRecord(item)) continue;
      const id = clipName(item.id, 48);
      const name = clipName(item.name, 80);
      const previousSavedAt = parseOptionalIso(item.previousSavedAt);
      const previousAmount = Number(item.previousAmount);
      const amount = Number(item.amount);
      const delta = Number(item.delta);
      if (
        !id ||
        !name ||
        !previousSavedAt ||
        !Number.isFinite(previousAmount) ||
        !Number.isFinite(amount) ||
        !Number.isFinite(delta)
      ) {
        continue;
      }
      const normalizedPreviousAmount = Math.trunc(previousAmount);
      const normalizedAmount = Math.trunc(amount);
      const normalizedDelta = Math.trunc(delta);
      if (normalizedAmount - normalizedPreviousAmount !== normalizedDelta) continue;
      changes.push({
        id,
        name,
        previousAmount: normalizedPreviousAmount,
        amount: normalizedAmount,
        delta: normalizedDelta,
        previousSavedAt,
      });
    }
    if (changes.length) telemetry.goodsChanges = changes;
  }
  if (Array.isArray(value.routes)) {
    const routes: LiveTradeRoute[] = [];
    for (const item of value.routes.slice(0, 80)) {
      if (!asRecord(item)) continue;
      const name = clipName(item.name, 120);
      if (!name) continue;
      const route: LiveTradeRoute = {
        name,
        shipCount:
          typeof item.shipCount === "number" && Number.isFinite(item.shipCount)
            ? Math.max(0, Math.trunc(item.shipCount))
            : 0,
        stops: [],
      };
      if (typeof item.id === "number" && Number.isFinite(item.id)) route.id = Math.trunc(item.id);
      if (typeof item.ownerId === "number" && Number.isFinite(item.ownerId)) {
        route.ownerId = Math.trunc(item.ownerId);
      }
      if (Array.isArray(item.stops)) {
        for (const stopValue of item.stops.slice(0, 20)) {
          if (!asRecord(stopValue)) continue;
          const stop: LiveTradeRoute["stops"][number] = { goods: [] };
          if (typeof stopValue.areaId === "number" && Number.isFinite(stopValue.areaId)) {
            stop.areaId = Math.trunc(stopValue.areaId);
          }
          if (Array.isArray(stopValue.goods)) {
            for (const goodValue of stopValue.goods.slice(0, 20)) {
              if (!asRecord(goodValue)) continue;
              const guid = Number(goodValue.guid);
              const amount = Number(goodValue.amount);
              if (!Number.isFinite(guid) || !Number.isFinite(amount)) continue;
              const good: LiveTradeRoute["stops"][number]["goods"][number] = {
                guid: Math.trunc(guid),
                amount: Math.trunc(amount),
              };
              const goodId = clipName(goodValue.id, 48);
              const goodName = clipName(goodValue.name, 80);
              if (goodId) good.id = goodId;
              if (goodName) good.name = goodName;
              stop.goods.push(good);
            }
          }
          route.stops.push(stop);
        }
      }
      routes.push(route);
    }
    if (routes.length) telemetry.routes = routes;
  }
  if (Array.isArray(value.production)) {
    const production: LiveProductionMetric[] = [];
    for (const item of value.production.slice(0, 120)) {
      if (!asRecord(item)) continue;
      const guid = Number(item.guid);
      const name = clipName(item.name, 80);
      const observedAt = parseOptionalIso(item.observedAt);
      if (!Number.isFinite(guid) || !name || !observedAt) continue;
      const metric: LiveProductionMetric = {
        guid: Math.trunc(guid),
        name,
        observedAt,
      };
      const id = clipName(item.id, 48);
      const islandName = clipName(item.islandName, LIVE_MAX_TITLE);
      if (id) metric.id = id;
      if (islandName) metric.islandName = islandName;
      for (const key of ["amount", "requiredTMin", "productivity", "buildingCount"] as const) {
        const raw = item[key];
        if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) continue;
        metric[key] = key === "productivity" ? raw : Math.trunc(raw * 1000) / 1000;
      }
      const buildingCountObservedAt = parseOptionalIso(item.buildingCountObservedAt);
      if (buildingCountObservedAt) metric.buildingCountObservedAt = buildingCountObservedAt;
      const islandRef = normalizeIslandRef(item.islandRef);
      if (islandRef) metric.islandRef = islandRef;
      production.push(metric);
    }
    if (production.length) telemetry.production = production;
  }
  return Object.keys(telemetry).length ? telemetry : undefined;
}

function normalizeNativeConnection(value: unknown): LiveNativeConnection | undefined {
  if (!asRecord(value) || value.provider !== "ux-enhancer-ocr") return undefined;
  const view = NATIVE_VIEWS.has(value.view as LiveNativeView)
    ? (value.view as LiveNativeView)
    : "unknown";
  const observedAt = parseOptionalIso(value.observedAt);
  if (!observedAt) return undefined;
  const native: LiveNativeConnection = { provider: "ux-enhancer-ocr", view, observedAt };
  const islandName = clipName(value.islandName, LIVE_MAX_TITLE);
  const serverVersion = clipName(value.serverVersion, 40);
  if (islandName) native.islandName = islandName;
  if (serverVersion) native.serverVersion = serverVersion;
  const islandRef = normalizeIslandRef(value.islandRef);
  if (islandRef) native.islandRef = islandRef;
  return native;
}

function normalizeIslandRef(value: unknown): LiveIslandRef | undefined {
  if (!asRecord(value)) return undefined;
  const regionId = Number(value.regionId);
  const areaId = Number(value.areaId);
  if (!Number.isFinite(regionId) || !Number.isFinite(areaId)) return undefined;
  return { regionId: Math.trunc(regionId), areaId: Math.trunc(areaId) };
}

function normalizeEconomy(value: unknown): LiveEconomy | undefined {
  if (!asRecord(value)) return undefined;
  const treasury = value.treasury;
  if (typeof treasury !== "number" || !Number.isSafeInteger(treasury)) return undefined;
  const coverage = asRecord(value.coverage)
    ? normalizeCoverage(value.coverage.treasury)
    : undefined;
  return {
    treasury,
    coverage: { treasury: coverage ?? { source: "save", scope: "player" } },
  };
}

function normalizeCoverage(value: unknown): LiveFieldCoverage | undefined {
  if (!asRecord(value) || !EVIDENCE_SOURCES.has(value.source as LiveEvidenceSource)) {
    return undefined;
  }
  const coverage: LiveFieldCoverage = { source: value.source as LiveEvidenceSource };
  const observedAt = parseOptionalIso(value.observedAt);
  if (observedAt) coverage.observedAt = observedAt;
  const scope = clipName(value.scope, 80);
  if (scope) coverage.scope = scope;
  return coverage;
}

function normalizeIslandStock(value: unknown): LiveIslandStock[] | undefined {
  if (!Array.isArray(value) || value.length > LIVE_MAX_ISLAND_STOCK) return undefined;
  const stock: LiveIslandStock[] = [];
  for (const item of value.slice(0, LIVE_MAX_ISLAND_STOCK)) {
    if (!asRecord(item)) continue;
    const id = clipName(item.id, 48);
    const name = clipName(item.name, 80);
    const amount =
      typeof item.amount === "number" && Number.isFinite(item.amount)
        ? Math.trunc(item.amount)
        : null;
    if (!id || !name || amount == null || amount < 0) continue;
    if (stock.some((row) => row.id === id)) return undefined;
    stock.push({ id, name, amount });
  }
  return stock.length ? stock : undefined;
}

function normalizeIslandPopulation(value: unknown): LiveIslandPopulation | undefined {
  if (!asRecord(value)) return undefined;
  const population: LiveIslandPopulation = {};
  for (const key of ["farmers", "workers", "artisans", "engineers"] as const) {
    const raw = value[key];
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
      population[key] = Math.trunc(raw);
    }
  }
  return Object.keys(population).length ? population : undefined;
}

function normalizeIslandSnapshots(value: unknown): LiveIslandSnapshot[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const islands: LiveIslandSnapshot[] = [];
  for (const item of value.slice(0, LIVE_MAX_ISLAND_SNAPSHOTS)) {
    if (!asRecord(item)) continue;
    const regionId = item.regionId;
    const areaId = item.areaId;
    const ownerId = item.ownerId;
    if (
      typeof regionId !== "number" ||
      typeof areaId !== "number" ||
      typeof ownerId !== "number" ||
      !Number.isSafeInteger(regionId) ||
      !Number.isSafeInteger(areaId) ||
      !Number.isSafeInteger(ownerId)
    ) {
      continue;
    }
    const nameSource = ISLAND_NAME_SOURCES.has(item.nameSource as LiveIslandNameSource)
      ? (item.nameSource as LiveIslandNameSource)
      : "neutral";
    const name = clipName(item.name, LIVE_MAX_TITLE);
    const identity = normalizeCoverage(
      asRecord(item.coverage) ? item.coverage.identity : undefined,
    ) ?? { source: "save" };
    const snapshot: LiveIslandSnapshot = {
      regionId: Math.trunc(regionId),
      areaId: Math.trunc(areaId),
      ownerId: Math.trunc(ownerId),
      name: name || `area-${Math.trunc(areaId)}`,
      nameSource,
      coverage: { identity },
    };
    if (asRecord(item.coverage)) {
      const stockCov = normalizeCoverage(item.coverage.stock);
      const buildingsCov = normalizeCoverage(item.coverage.buildings);
      const populationCov = normalizeCoverage(item.coverage.population);
      const capacitiesCov = normalizeCoverage(item.coverage.capacities);
      if (stockCov) snapshot.coverage.stock = stockCov;
      if (buildingsCov) snapshot.coverage.buildings = buildingsCov;
      if (populationCov) snapshot.coverage.population = populationCov;
      if (capacitiesCov) snapshot.coverage.capacities = capacitiesCov;
    }
    const stock = normalizeIslandStock(item.stock);
    if (stock) snapshot.stock = stock;
    else delete snapshot.coverage.stock;
    const buildings = normalizeBuildingHits(item.buildings, LIVE_MAX_ISLAND_BUILDINGS);
    if (buildings) snapshot.buildings = buildings;
    const population = normalizeIslandPopulation(item.population);
    if (population) snapshot.population = population;
    if (asRecord(item.capacities)) {
      const warehouse = item.capacities.warehouse;
      if (typeof warehouse === "number" && Number.isFinite(warehouse) && warehouse >= 0) {
        snapshot.capacities = { warehouse: Math.trunc(warehouse) };
      }
    }
    islands.push(snapshot);
  }
  return islands.length ? islands : undefined;
}

function normalizeNativeProbe(value: unknown): LiveNativeProbe | undefined {
  if (!asRecord(value) || value.provider !== "ux-enhancer-ocr") return undefined;
  if (!NATIVE_PROBE_STATES.has(value.state as LiveNativeProbeState)) return undefined;
  const lastProbeAt = parseOptionalIso(value.lastProbeAt);
  if (!lastProbeAt) return undefined;
  const probe: LiveNativeProbe = {
    provider: "ux-enhancer-ocr",
    state: value.state as LiveNativeProbeState,
    lastProbeAt,
  };
  const lastSuccessAt = parseOptionalIso(value.lastSuccessAt);
  if (
    probe.state === "reachable" &&
    (value.result === "observation" ||
      value.result === "no_observation" ||
      value.result === "no_window")
  ) {
    probe.result = value.result;
  }
  if (lastSuccessAt) probe.lastSuccessAt = lastSuccessAt;
  if (NATIVE_PROBE_REASONS.has(value.reason as LiveNativeProbeReason)) {
    probe.reason = value.reason as LiveNativeProbeReason;
  }
  return probe;
}

function normalizeConnection(value: unknown): LiveConnection | undefined {
  if (!asRecord(value) || !CONNECTION_MODES.has(value.mode as LiveConnection["mode"]))
    return undefined;
  const connection: LiveConnection = { mode: value.mode as LiveConnection["mode"] };
  const fileName = clipName(value.fileName, 160);
  if (fileName) connection.fileName = fileName;
  for (const key of [
    "buildingKinds",
    "buildingTotal",
    "goodsKinds",
    "routeCount",
    "islandCount",
    "questCount",
  ] as const) {
    const raw = value[key];
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0)
      connection[key] = Math.trunc(raw);
  }
  const native = normalizeNativeConnection(value.native);
  if (native) connection.native = native;
  const nativeProbe = normalizeNativeProbe(value.nativeProbe);
  if (nativeProbe) connection.nativeProbe = nativeProbe;
  return connection;
}

function normalizePulse(value: unknown): LivePulseHint | undefined {
  if (value === undefined || value === null) return undefined;
  if (!asRecord(value)) return undefined;
  const coins = COINS.has(String(value.coins))
    ? (value.coins as LivePulseHint["coins"])
    : "unknown";
  const houses = HOUSES.has(String(value.houses))
    ? (value.houses as LivePulseHint["houses"])
    : "unknown";
  return { coins, houses };
}

function parseUpdatedAt(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return new Date().toISOString();
  }
  return new Date(value).toISOString();
}

function parseOptionalIso(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function normalizeWorkforce(value: unknown): LiveWorkforce | undefined {
  if (!asRecord(value)) return undefined;
  const workforce: LiveWorkforce = {};
  for (const tier of LIVE_WORKFORCE_TIERS) {
    if (value[tier] === true) workforce[tier] = true;
  }
  return Object.keys(workforce).length ? workforce : undefined;
}

export function normalizeSnapshot(raw: unknown, locale?: string | null): LiveIngestResult {
  if (!asRecord(raw)) return { ok: false, message: msg("schema", locale) };
  if (raw.schema !== LIVE_SCHEMA) return { ok: false, message: msg("schema", locale) };
  if (raw.game !== undefined && raw.game !== LIVE_GAME) {
    return { ok: false, message: msg("game", locale) };
  }
  if (raw.quests === undefined || !Array.isArray(raw.quests)) {
    return { ok: false, message: msg("quests", locale) };
  }
  if (raw.quests.length > LIVE_MAX_QUESTS) {
    return { ok: false, message: msg("tooMany", locale) };
  }

  const quests: LiveQuest[] = [];
  for (const item of raw.quests) {
    const quest = normalizeQuest(item, locale);
    if ("error" in quest) return { ok: false, message: quest.error };
    quests.push(quest);
  }

  const source: LiveSource = SOURCES.has(raw.source as LiveSource)
    ? (raw.source as LiveSource)
    : "file";

  const snapshot: LiveSnapshot = {
    schema: LIVE_SCHEMA,
    source,
    updatedAt: parseUpdatedAt(raw.updatedAt),
    game: LIVE_GAME,
    quests,
  };
  const pulseHint = normalizePulse(raw.pulseHint);
  if (pulseHint) snapshot.pulseHint = pulseHint;
  const telemetry = normalizeTelemetry(raw.telemetry);
  if (telemetry) snapshot.telemetry = telemetry;
  const sessionName = clipName(raw.sessionName, LIVE_MAX_TITLE);
  if (sessionName) snapshot.sessionName = sessionName;
  const islandName = clipName(raw.islandName, LIVE_MAX_TITLE);
  if (islandName) snapshot.islandName = islandName;
  const savedAt = parseOptionalIso(raw.savedAt);
  if (savedAt) snapshot.savedAt = savedAt;
  const workforce = normalizeWorkforce(raw.workforce);
  if (workforce) snapshot.workforce = workforce;
  const connection = normalizeConnection(raw.connection);
  if (connection) snapshot.connection = connection;
  const campaignId = clipName(raw.campaignId, 120);
  if (campaignId) snapshot.campaignId = campaignId;
  if (typeof raw.playerId === "number" && Number.isFinite(raw.playerId)) {
    snapshot.playerId = Math.trunc(raw.playerId);
  }
  const snapshotId = clipName(raw.snapshotId, 120);
  if (snapshotId) snapshot.snapshotId = snapshotId;
  if (typeof raw.simTime === "number" && Number.isFinite(raw.simTime)) {
    snapshot.simTime = Math.trunc(raw.simTime);
  }
  const islandSnapshots = normalizeIslandSnapshots(raw.islandSnapshots);
  if (islandSnapshots) snapshot.islandSnapshots = islandSnapshots;
  const economy = normalizeEconomy(raw.economy);
  if (economy) snapshot.economy = economy;
  return { ok: true, snapshot: attachOcrIslandIdentity(snapshot) };
}

export function ingestLiveBytes(input: {
  filename?: string;
  mime?: string;
  bytes: Uint8Array;
  locale?: string | null;
}): LiveIngestResult {
  const filename = input.filename ?? "";
  const locale = input.locale;
  if (filename && !hasJsonExtension(filename)) {
    return { ok: false, message: msg("notJson", locale) };
  }
  const mime = (input.mime ?? "").trim().toLowerCase();
  if (mime && !JSON_MIME.has(mime.split(";")[0] ?? mime)) {
    return { ok: false, message: msg("notJson", locale) };
  }
  if (input.bytes.byteLength > LIVE_MAX_BYTES) {
    return { ok: false, message: msg("tooBig", locale) };
  }
  if (looksLikeSave(input.bytes)) {
    return { ok: false, message: msg("saveFile", locale) };
  }

  let text: string;
  try {
    text = decoder.decode(input.bytes);
  } catch {
    return { ok: false, message: msg("broken", locale) };
  }
  return ingestLiveJsonText(text, locale);
}

export function ingestLiveJsonText(text: string, locale?: string | null): LiveIngestResult {
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > LIVE_MAX_BYTES) {
    return { ok: false, message: msg("tooBig", locale) };
  }
  if (looksLikeSave(bytes)) {
    return { ok: false, message: msg("saveFile", locale) };
  }
  if (hasCodeOrUrl(text)) {
    return { ok: false, message: msg("code", locale) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: msg("broken", locale), kind: "broken" };
  }
  return normalizeSnapshot(parsed, locale);
}

export async function ingestLiveFile(
  file: File,
  locale?: string | null,
): Promise<LiveIngestResult> {
  if (file.size > LIVE_MAX_BYTES) {
    return { ok: false, message: msg("tooBig", locale) };
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  return ingestLiveBytes({
    filename: file.name,
    mime: file.type,
    bytes: buffer,
    locale,
  });
}
