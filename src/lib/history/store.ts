import type { LiveSnapshot } from "../live/types.ts";
import { resolveCampaignId } from "./campaign.ts";
import { contentHash, summarizeSnapshot } from "./summarize.ts";
import {
  HISTORY_CAMPAIGNS_STORE,
  HISTORY_DB,
  HISTORY_MAX_SAMPLES,
  HISTORY_SAMPLES_STORE,
  type HistoryCampaign,
  type HistoryRecordResult,
  type HistorySample,
} from "./types.ts";

export type HistoryMemory = {
  samples: Map<string, HistorySample>;
  campaigns: Map<string, HistoryCampaign>;
};

export type HistoryStore = {
  record(
    snapshot: LiveSnapshot,
    opts?: { explicitCampaignId?: string; now?: () => string },
  ): Promise<HistoryRecordResult>;
  list(campaignId: string): Promise<HistorySample[]>;
  campaigns(): Promise<HistoryCampaign[]>;
  get(id: string): Promise<HistorySample | undefined>;
};

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `h-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function sortSamples(rows: HistorySample[]) {
  return [...rows].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}

function tipOfCampaign(samples: HistorySample[], campaignId: string): HistorySample | undefined {
  const rows = sortSamples(samples.filter((row) => row.campaignId === campaignId));
  return rows[rows.length - 1];
}

function shouldBranch(tip: HistorySample | undefined, incoming: HistorySample) {
  if (!tip) return false;
  const tipClock = tip.simTime;
  const nextClock = incoming.simTime;
  // Filesystem timestamps cannot demonstrate simulation order after a restore.
  if (tipClock == null || nextClock == null) return true;
  return nextClock < tipClock;
}

export function createMemoryHistoryBacking(seed?: HistoryMemory): HistoryMemory {
  return {
    samples: new Map(seed?.samples),
    campaigns: new Map(seed?.campaigns),
  };
}

export function createMemoryHistoryStore(
  memory: HistoryMemory = createMemoryHistoryBacking(),
): HistoryStore {
  const allSamples = () => [...memory.samples.values()];
  const allCampaigns = () => [...memory.campaigns.values()];

  return {
    async record(snapshot, opts) {
      const known = allCampaigns();
      const resolved = resolveCampaignId({
        snapshot,
        explicitCampaignId: opts?.explicitCampaignId,
        known,
      });
      if (!resolved.ok) {
        return { ok: false, reason: "ambiguous", candidates: resolved.candidates, snapshot };
      }
      const summary = summarizeSnapshot(snapshot);
      const previousTip =
        memory.samples.get(memory.campaigns.get(resolved.campaignId)?.headId ?? "") ??
        tipOfCampaign(allSamples(), resolved.campaignId);
      const recordedAt = new Date(
        Math.max(
          Date.parse(opts?.now?.() ?? new Date().toISOString()),
          previousTip ? Date.parse(previousTip.recordedAt) + 1 : 0,
        ),
      ).toISOString();
      const hash = contentHash(summary);
      const draft: HistorySample = {
        id: newId(),
        campaignId: resolved.campaignId,
        branchId: "main",
        recordedAt,
        contentHash: hash,
        summary,
      };
      if (snapshot.savedAt) draft.savedAt = snapshot.savedAt;
      if (typeof snapshot.simTime === "number") draft.simTime = snapshot.simTime;
      if (snapshot.snapshotId) draft.snapshotId = snapshot.snapshotId;

      const dup = previousTip?.contentHash === hash ? previousTip : undefined;
      if (dup) {
        return {
          ok: true,
          sample: dup,
          deduped: true,
          branched: false,
          campaignId: resolved.campaignId,
        };
      }

      const tip = previousTip;
      let branched = false;
      if (shouldBranch(tip, draft)) {
        draft.branchId = newId();
        branched = true;
      } else if (tip) {
        draft.branchId = tip.branchId;
      }

      memory.campaigns.set(resolved.campaignId, {
        ...memory.campaigns.get(resolved.campaignId),
        id: resolved.campaignId,
        fingerprint: null,
        label:
          memory.campaigns.get(resolved.campaignId)?.label ??
          snapshot.sessionName ??
          resolved.campaignId,
        createdAt: memory.campaigns.get(resolved.campaignId)?.createdAt ?? recordedAt,
        headId: draft.id,
      });

      memory.samples.set(draft.id, draft);
      const campaignRows = sortSamples(
        allSamples().filter((row) => row.campaignId === resolved.campaignId),
      );
      while (campaignRows.length > HISTORY_MAX_SAMPLES) {
        const oldest = campaignRows.shift();
        if (oldest) memory.samples.delete(oldest.id);
      }
      return { ok: true, sample: draft, deduped: false, branched, campaignId: resolved.campaignId };
    },
    async list(campaignId) {
      return sortSamples(allSamples().filter((row) => row.campaignId === campaignId));
    },
    async campaigns() {
      return allCampaigns();
    },
    async get(id) {
      return memory.samples.get(id);
    },
  };
}

function openHistoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(HISTORY_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HISTORY_SAMPLES_STORE)) {
        const samples = db.createObjectStore(HISTORY_SAMPLES_STORE, { keyPath: "id" });
        samples.createIndex("campaignId", "campaignId", { unique: false });
      }
      if (!db.objectStoreNames.contains(HISTORY_CAMPAIGNS_STORE)) {
        db.createObjectStore(HISTORY_CAMPAIGNS_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("No se pudo guardar el historial local."));
    tx.onerror = () => reject(tx.error ?? new Error("No se pudo guardar el historial local."));
  });
}

export function createIndexedDbHistoryStore(): HistoryStore {
  // Serialize read/modify/write across instances in this page. Web Locks also
  // serializes other tabs on supported browsers.
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const run = async (): Promise<T> =>
      typeof navigator !== "undefined" && navigator.locks
        ? await navigator.locks.request(HISTORY_DB, work)
        : await work();
    const result = historyWrites.then(run, run);
    historyWrites = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
  return {
    record(snapshot, opts) {
      return serial(async () => {
        const db = await openHistoryDb();
        try {
          const known = (await requestToPromise(
            db
              .transaction(HISTORY_CAMPAIGNS_STORE, "readonly")
              .objectStore(HISTORY_CAMPAIGNS_STORE)
              .getAll(),
          )) as HistoryCampaign[];
          const resolved = resolveCampaignId({
            snapshot,
            explicitCampaignId: opts?.explicitCampaignId,
            known,
          });
          if (!resolved.ok) {
            return { ok: false, reason: "ambiguous", candidates: resolved.candidates, snapshot };
          }
          const samples = (await requestToPromise(
            db
              .transaction(HISTORY_SAMPLES_STORE, "readonly")
              .objectStore(HISTORY_SAMPLES_STORE)
              .index("campaignId")
              .getAll(resolved.campaignId),
          )) as HistorySample[];
          const backing = createMemoryHistoryBacking({
            samples: new Map(samples.map((row) => [row.id, row])),
            campaigns: new Map(known.map((row) => [row.id, row])),
          });
          const local = createMemoryHistoryStore(backing);
          const result = await local.record(snapshot, opts);
          if (!result.ok) return result;
          const kept = await local.list(result.campaignId);
          const campaign = backing.campaigns.get(result.campaignId)!;
          const write = db.transaction(
            [HISTORY_SAMPLES_STORE, HISTORY_CAMPAIGNS_STORE],
            "readwrite",
          );
          const done = transactionDone(write);
          // Observe aborts even if a synchronous put throws before the await.
          void done.catch(() => undefined);
          write.objectStore(HISTORY_CAMPAIGNS_STORE).put(campaign);
          write.objectStore(HISTORY_SAMPLES_STORE).put(result.sample);
          const keptIds = new Set(kept.map((row) => row.id));
          for (const row of samples) {
            if (!keptIds.has(row.id)) write.objectStore(HISTORY_SAMPLES_STORE).delete(row.id);
          }
          await done;
          return result;
        } finally {
          db.close();
        }
      });
    },
    async list(campaignId) {
      const db = await openHistoryDb();
      try {
        const rows = (await requestToPromise(
          db
            .transaction(HISTORY_SAMPLES_STORE, "readonly")
            .objectStore(HISTORY_SAMPLES_STORE)
            .index("campaignId")
            .getAll(campaignId),
        )) as HistorySample[];
        return sortSamples(rows);
      } finally {
        db.close();
      }
    },
    async campaigns() {
      const db = await openHistoryDb();
      try {
        return (await requestToPromise(
          db
            .transaction(HISTORY_CAMPAIGNS_STORE, "readonly")
            .objectStore(HISTORY_CAMPAIGNS_STORE)
            .getAll(),
        )) as HistoryCampaign[];
      } finally {
        db.close();
      }
    },
    async get(id) {
      const db = await openHistoryDb();
      try {
        return (await requestToPromise(
          db
            .transaction(HISTORY_SAMPLES_STORE, "readonly")
            .objectStore(HISTORY_SAMPLES_STORE)
            .get(id),
        )) as HistorySample | undefined;
      } finally {
        db.close();
      }
    },
  };
}

let historyWrites: Promise<void> = Promise.resolve();

let defaultStore: HistoryStore | null = null;

export function campaignHistoryStore(): HistoryStore {
  if (!defaultStore) {
    defaultStore =
      typeof window === "undefined" ? createMemoryHistoryStore() : createIndexedDbHistoryStore();
  }
  return defaultStore;
}

export function __setCampaignHistoryStoreForTests(store: HistoryStore | null) {
  defaultStore = store;
}
