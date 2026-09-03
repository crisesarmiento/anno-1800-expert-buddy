import { uiFor } from "../i18n.ts";
import { LIVE_MSG } from "./messages.ts";
import {
  LIVE_GAME,
  LIVE_MAX_BYTES,
  LIVE_MAX_QUESTS,
  LIVE_MAX_TITLE,
  LIVE_SCHEMA,
  LIVE_WORKFORCE_TIERS,
  type LiveIngestResult,
  type LiveNamedHit,
  type LivePulseHint,
  type LiveQuest,
  type LiveQuestState,
  type LiveSnapshot,
  type LiveSource,
  type LiveTelemetry,
  type LiveWorkforce,
} from "./types.ts";

const JSON_MIME = new Set(["application/json", "text/plain"]);
const QUEST_STATES = new Set<LiveQuestState>(["active", "ready", "done"]);
const SOURCES = new Set<LiveSource>(["telemetry", "save", "file"]);
const COINS = new Set(["unknown", "up", "down"]);
const HOUSES = new Set(["unknown", "ok", "yellow", "empty"]);

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

function normalizeTelemetry(value: unknown): LiveTelemetry | undefined {
  if (!asRecord(value)) return undefined;
  const telemetry: LiveTelemetry = {};
  const buildings = normalizeHits(value.buildings, 80);
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
  return Object.keys(telemetry).length ? telemetry : undefined;
}

function normalizePulse(value: unknown): LivePulseHint | undefined {
  if (value === undefined || value === null) return undefined;
  if (!asRecord(value)) return undefined;
  const coins = COINS.has(String(value.coins)) ? (value.coins as LivePulseHint["coins"]) : "unknown";
  const houses = HOUSES.has(String(value.houses)) ? (value.houses as LivePulseHint["houses"]) : "unknown";
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
  return { ok: true, snapshot };
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

export async function ingestLiveFile(file: File, locale?: string | null): Promise<LiveIngestResult> {
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
