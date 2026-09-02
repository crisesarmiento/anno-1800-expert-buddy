import { missionsById } from "@/lib/data";
import {
  bindDeskOfflineHost,
  type DeskOfflineHost,
} from "@/lib/desk-offline";
import {
  LAST_SESSION_KEY,
  LEGACY_ZUSTAND_KEY,
  SESSION_STORE_VERSION,
  createLocalStorageKv,
  createSessionStore,
  migrateLegacyHarborBuddy,
  type SessionSnapshot,
  type SessionStore,
} from "@/lib/session-store";
import { useHarbor, type CalmMode } from "@/lib/store";

let bound: SessionStore | null = null;

function readLegacyRaw(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(LEGACY_ZUSTAND_KEY);
  } catch {
    return null;
  }
}

export function snapshotFromHarbor(): SessionSnapshot {
  const state = useHarbor.getState();
  const mission = state.missionId ? missionsById[state.missionId] : undefined;
  const indexes = state.missionId ? (state.checks[state.missionId] ?? []) : [];
  const fromItems = state.checkItems;
  const texts = mission?.do ?? [];
  const checks =
    fromItems.length > 0
      ? fromItems
      : texts.map((text, index) => ({
          text,
          done: indexes.includes(index),
        }));
  if (fromItems.length === 0) {
    for (const index of indexes) {
      if (index >= checks.length) checks.push({ text: `#${index}`, done: true });
    }
  }
  return {
    version: SESSION_STORE_VERSION,
    sessionKey: LAST_SESSION_KEY,
    updatedAt: Date.now(),
    mission: state.missionId
      ? {
          id: state.missionId,
          title: mission?.title ?? "",
          body: mission?.objective ?? "",
        }
      : null,
    checks,
    completed: state.completed,
    stamps: state.stamps,
    calm: state.calm,
    pulse: state.pulse,
    overbuildBrake: state.overbuildBrake,
  };
}

export function applyHarborSnapshot(snapshot: SessionSnapshot): void {
  const checks: Record<string, number[]> = {};
  if (snapshot.mission) {
    checks[snapshot.mission.id] = snapshot.checks.flatMap((item, index) => (item.done ? [index] : []));
  }
  useHarbor.setState({
    missionId: snapshot.mission?.id ?? null,
    calm: snapshot.calm as CalmMode,
    pulse: snapshot.pulse,
    completed: snapshot.completed,
    stamps: snapshot.stamps,
    checks,
    checkItems: snapshot.checks,
    overbuildBrake: snapshot.overbuildBrake,
  });
}

function queueDeskLaterSync(_snapshot: SessionSnapshot): void {
  // Optional later-sync: fire-and-forget. No remote desk API; local-commit is success.
  void _snapshot;
}

export function getDeskHost(): DeskOfflineHost {
  if (!bound) hydrateHarborFromSessionStore();
  const durable = bound;
  return {
    snapshot: snapshotFromHarbor,
    apply: applyHarborSnapshot,
    persist(snapshot) {
      durable?.persistNow(snapshot);
    },
    laterSync: queueDeskLaterSync,
  };
}

/**
 * Restore the last desk from the local session store.
 * Must run before any network / auth call. Never fetches.
 */
export function hydrateHarborFromSessionStore(): SessionSnapshot | null {
  const kv = createLocalStorageKv();
  if (!bound) {
    migrateLegacyHarborBuddy(kv, readLegacyRaw());
  }
  const durable = bound ?? createSessionStore(kv);
  const snapshot = durable.hydrateSync();
  if (snapshot) applyHarborSnapshot(snapshot);
  if (!bound) {
    bound = durable;
    bindDeskOfflineHost(getDeskHost);
    useHarbor.subscribe(() => {
      durable.schedulePersist(snapshotFromHarbor());
    });
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", () => durable.flush());
    }
  }
  return snapshot;
}
