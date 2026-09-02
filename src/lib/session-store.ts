import { defaultPulse, type Pulse } from "./play.ts";

/** Durable client store for the last-open desk. No network, no auth. */
export const SESSION_STORE_VERSION = 1;
export const LAST_SESSION_KEY = "last";
export const SESSION_STORE_PREFIX = "hb-session:";
export const LEGACY_ZUSTAND_KEY = "harbor-buddy-es";
export const DEFAULT_PERSIST_DEBOUNCE_MS = 300;

export type SessionCalm = "session" | "overwhelmed" | "broke";

export type SessionCheckItem = {
  text: string;
  done: boolean;
};

export type SessionMission = {
  id: string;
  title: string;
  body: string;
};

export type SessionSnapshot = {
  version: typeof SESSION_STORE_VERSION;
  sessionKey: string;
  updatedAt: number;
  mission: SessionMission | null;
  checks: SessionCheckItem[];
  completed: string[];
  stamps: string[];
  calm: SessionCalm;
  pulse: Pulse;
  overbuildBrake: { active: boolean };
};

export type DurableKv = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
  keys(): string[];
};

export type SessionStoreOptions = {
  debounceMs?: number;
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => () => void;
};

export type SessionStore = {
  hydrateSync(): SessionSnapshot | null;
  persistNow(snapshot: SessionSnapshot): Promise<void> | void;
  schedulePersist(snapshot: SessionSnapshot): void;
  flush(): void;
};

const META_LAST = "meta:last";
const sessionRecord = (key: string) => `session:${key}`;

export function createMemoryKv(seed?: Record<string, string>): DurableKv {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
    delete: (key) => {
      map.delete(key);
    },
    keys: () => [...map.keys()],
  };
}

export function createLocalStorageKv(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length"> | null = typeof localStorage === "undefined"
    ? null
    : localStorage,
  prefix = SESSION_STORE_PREFIX,
): DurableKv {
  if (!storage) return createMemoryKv();
  return {
    get(key) {
      try {
        return storage.getItem(prefix + key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        storage.setItem(prefix + key, value);
      } catch {
        /* quota / private mode */
      }
    },
    delete(key) {
      try {
        storage.removeItem(prefix + key);
      } catch {
        /* ignore */
      }
    },
    keys() {
      const out: string[] = [];
      try {
        for (let i = 0; i < storage.length; i += 1) {
          const full = storage.key(i);
          if (full && full.startsWith(prefix)) out.push(full.slice(prefix.length));
        }
      } catch {
        return out;
      }
      return out;
    },
  };
}

export function emptyDeskFromSnapshot(snapshot: SessionSnapshot | null | undefined): boolean {
  return !snapshot?.mission?.id;
}

export function parseSessionSnapshot(raw: string | null | undefined): SessionSnapshot | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (rec.version !== SESSION_STORE_VERSION) return null;
  if (typeof rec.sessionKey !== "string" || !rec.sessionKey) return null;
  if (typeof rec.updatedAt !== "number" || !Number.isFinite(rec.updatedAt)) return null;
  const calm = rec.calm;
  if (calm !== "session" && calm !== "overwhelmed" && calm !== "broke") return null;
  const mission = parseMission(rec.mission);
  if (rec.mission !== null && !mission) return null;
  const checks = parseChecks(rec.checks);
  const completed = parseStringList(rec.completed);
  const stamps = parseStringList(rec.stamps);
  const pulse = parsePulse(rec.pulse);
  if (!checks || !completed || !stamps || !pulse) return null;
  return {
    version: SESSION_STORE_VERSION,
    sessionKey: rec.sessionKey,
    updatedAt: rec.updatedAt,
    mission,
    checks,
    completed,
    stamps,
    calm,
    pulse,
    overbuildBrake: parseOverbuildBrake(rec.overbuildBrake),
  };
}

function parseMission(value: unknown): SessionMission | null {
  if (value == null) return null;
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.id !== "string" || !rec.id) return null;
  return {
    id: rec.id,
    title: typeof rec.title === "string" ? rec.title : "",
    body: typeof rec.body === "string" ? rec.body : "",
  };
}

function parseChecks(value: unknown): SessionCheckItem[] | null {
  if (!Array.isArray(value)) return null;
  const checks: SessionCheckItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const rec = item as Record<string, unknown>;
    if (typeof rec.text !== "string" || typeof rec.done !== "boolean") return null;
    checks.push({ text: rec.text, done: rec.done });
  }
  return checks;
}

function parseStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === "string")) return null;
  return value as string[];
}

function parsePulse(value: unknown): Pulse | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const coins = rec.coins;
  const houses = rec.houses;
  const looking = rec.looking;
  const coinsOk = coins === "unknown" || coins === "up" || coins === "down";
  const housesOk = houses === "unknown" || houses === "ok" || houses === "yellow" || houses === "empty";
  const lookingOk =
    looking === "unknown" ||
    looking === "city" ||
    looking === "quest" ||
    looking === "sea" ||
    looking === "other" ||
    looking === "stats";
  if (!coinsOk || !housesOk || !lookingOk) return null;
  return { coins, houses, looking };
}

function parseOverbuildBrake(value: unknown): { active: boolean } {
  if (!value || typeof value !== "object") return { active: false };
  return { active: (value as { active?: unknown }).active === true };
}

export function emptySessionSnapshot(sessionKey = LAST_SESSION_KEY, now = Date.now()): SessionSnapshot {
  return {
    version: SESSION_STORE_VERSION,
    sessionKey,
    updatedAt: now,
    mission: null,
    checks: [],
    completed: [],
    stamps: [],
    calm: "session",
    pulse: defaultPulse,
    overbuildBrake: { active: false },
  };
}

export function migrateLegacyHarborBuddy(kv: DurableKv, raw: string | null): SessionSnapshot | null {
  if (kv.get(sessionRecord(LAST_SESSION_KEY)) || kv.get(META_LAST)) return kvHydrate(kv);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const state =
    parsed && typeof parsed === "object" && "state" in parsed
      ? (parsed as { state: Record<string, unknown> }).state
      : null;
  if (!state) return null;
  const missionId = typeof state.missionId === "string" ? state.missionId : null;
  const completed = parseStringList(state.completed) ?? [];
  const pulse = parsePulse(state.pulse) ?? defaultPulse;
  const checksMap =
    state.checks && typeof state.checks === "object" && !Array.isArray(state.checks)
      ? (state.checks as Record<string, unknown>)
      : {};
  const indexes = missionId && Array.isArray(checksMap[missionId]) ? (checksMap[missionId] as unknown[]) : [];
  const checks: SessionCheckItem[] = indexes
    .map((index) => (typeof index === "number" ? index : null))
    .filter((index): index is number => index !== null)
    .sort((a, b) => a - b)
    .map((index) => ({ text: `#${index}`, done: true }));
  const snap: SessionSnapshot = {
    version: SESSION_STORE_VERSION,
    sessionKey: LAST_SESSION_KEY,
    updatedAt: Date.now(),
    mission: missionId ? { id: missionId, title: "", body: "" } : null,
    checks,
    completed,
    stamps: [],
    calm: "session",
    pulse,
    overbuildBrake: parseOverbuildBrake(state.overbuildBrake),
  };
  writeSnapshot(kv, snap);
  return snap;
}

function kvHydrate(kv: DurableKv): SessionSnapshot | null {
  const last = kv.get(META_LAST) ?? LAST_SESSION_KEY;
  return (
    parseSessionSnapshot(kv.get(sessionRecord(last))) ??
    parseSessionSnapshot(kv.get(sessionRecord(LAST_SESSION_KEY)))
  );
}

function writeSnapshot(kv: DurableKv, snapshot: SessionSnapshot): void {
  const key = snapshot.sessionKey || LAST_SESSION_KEY;
  const payload: SessionSnapshot = {
    ...snapshot,
    version: SESSION_STORE_VERSION,
    sessionKey: key,
  };
  kv.set(sessionRecord(key), JSON.stringify(payload));
  kv.set(META_LAST, key);
  for (const existing of kv.keys()) {
    if (existing.startsWith("session:") && existing !== sessionRecord(key)) {
      kv.delete(existing);
    }
  }
}

function defaultSchedule(fn: () => void, ms: number): () => void {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
}

export function createSessionStore(kv: DurableKv, options: SessionStoreOptions = {}): SessionStore {
  const debounceMs = Math.min(options.debounceMs ?? DEFAULT_PERSIST_DEBOUNCE_MS, 300);
  const schedule = options.schedule ?? defaultSchedule;
  const now = options.now ?? Date.now;
  let pending: SessionSnapshot | null = null;
  let cancel: (() => void) | null = null;

  const persistNow = (snapshot: SessionSnapshot) => {
    cancel?.();
    cancel = null;
    pending = null;
    writeSnapshot(kv, { ...snapshot, updatedAt: snapshot.updatedAt || now() });
  };

  return {
    hydrateSync: () => kvHydrate(kv),
    persistNow,
    schedulePersist(snapshot) {
      pending = snapshot;
      cancel?.();
      cancel = schedule(() => {
        const next = pending;
        cancel = null;
        if (next) persistNow(next);
      }, debounceMs);
    },
    flush() {
      if (pending) persistNow(pending);
    },
  };
}
