import { LIVE_MSG } from "./messages.ts";
import {
  LIVE_GAME,
  LIVE_MAX_BYTES,
  LIVE_MAX_QUESTS,
  LIVE_MAX_TITLE,
  LIVE_SCHEMA,
  type LiveIngestResult,
  type LivePulseHint,
  type LiveQuest,
  type LiveQuestState,
  type LiveSnapshot,
  type LiveSource,
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

function normalizeQuest(value: unknown): LiveQuest | { error: string } {
  if (!asRecord(value)) return { error: LIVE_MSG.quests };
  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (!title) return { error: LIVE_MSG.emptyTitle };
  if (title.length > LIVE_MAX_TITLE) return { error: LIVE_MSG.longTitle };
  let state: LiveQuestState = "active";
  if (value.state !== undefined) {
    if (typeof value.state !== "string" || !QUEST_STATES.has(value.state as LiveQuestState)) {
      return { error: LIVE_MSG.badState };
    }
    state = value.state as LiveQuestState;
  }
  const quest: LiveQuest = { title, state };
  if (typeof value.objective === "string" && value.objective.trim()) {
    quest.objective = value.objective.trim().slice(0, 400);
  }
  return quest;
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

export function normalizeSnapshot(raw: unknown): LiveIngestResult {
  if (!asRecord(raw)) return { ok: false, message: LIVE_MSG.schema };
  if (raw.schema !== LIVE_SCHEMA) return { ok: false, message: LIVE_MSG.schema };
  if (raw.game !== undefined && raw.game !== LIVE_GAME) {
    return { ok: false, message: LIVE_MSG.game };
  }
  if (raw.quests === undefined || !Array.isArray(raw.quests)) {
    return { ok: false, message: LIVE_MSG.quests };
  }
  if (raw.quests.length > LIVE_MAX_QUESTS) {
    return { ok: false, message: LIVE_MSG.tooMany };
  }

  const quests: LiveQuest[] = [];
  for (const item of raw.quests) {
    const quest = normalizeQuest(item);
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
  return { ok: true, snapshot };
}

export function ingestLiveBytes(input: {
  filename?: string;
  mime?: string;
  bytes: Uint8Array;
}): LiveIngestResult {
  const filename = input.filename ?? "";
  if (filename && !hasJsonExtension(filename)) {
    return { ok: false, message: LIVE_MSG.notJson };
  }
  const mime = (input.mime ?? "").trim().toLowerCase();
  if (mime && !JSON_MIME.has(mime.split(";")[0] ?? mime)) {
    return { ok: false, message: LIVE_MSG.notJson };
  }
  if (input.bytes.byteLength > LIVE_MAX_BYTES) {
    return { ok: false, message: LIVE_MSG.tooBig };
  }
  if (looksLikeSave(input.bytes)) {
    return { ok: false, message: LIVE_MSG.saveFile };
  }

  let text: string;
  try {
    text = decoder.decode(input.bytes);
  } catch {
    return { ok: false, message: LIVE_MSG.broken };
  }
  return ingestLiveJsonText(text);
}

export function ingestLiveJsonText(text: string): LiveIngestResult {
  const bytes = new TextEncoder().encode(text);
  if (bytes.byteLength > LIVE_MAX_BYTES) {
    return { ok: false, message: LIVE_MSG.tooBig };
  }
  if (looksLikeSave(bytes)) {
    return { ok: false, message: LIVE_MSG.saveFile };
  }
  if (hasCodeOrUrl(text)) {
    return { ok: false, message: LIVE_MSG.code };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: LIVE_MSG.broken };
  }
  return normalizeSnapshot(parsed);
}

export async function ingestLiveFile(file: File): Promise<LiveIngestResult> {
  if (file.size > LIVE_MAX_BYTES) {
    return { ok: false, message: LIVE_MSG.tooBig };
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  return ingestLiveBytes({
    filename: file.name,
    mime: file.type,
    bytes: buffer,
  });
}
