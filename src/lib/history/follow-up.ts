export const FOLLOW_UP_DB = "harbor-buddy-applied-changes";
export const FOLLOW_UP_STORE = "changes";

export type AppliedChange = {
  id: string;
  campaignId: string;
  branchId: string;
  sampleId: string;
  recordedAt: string;
  note?: string;
};

export type FollowUpStore = {
  list(campaignId: string): Promise<AppliedChange[]>;
  record(change: Omit<AppliedChange, "id" | "recordedAt"> & { recordedAt?: string }): Promise<AppliedChange>;
};

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `f-${Date.now().toString(16)}`;
}

export function createMemoryFollowUpStore(seed: AppliedChange[] = []): FollowUpStore {
  const rows = [...seed];
  return {
    async list(campaignId) {
      return rows
        .filter((row) => row.campaignId === campaignId)
        .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
    },
    async record(input) {
      const change: AppliedChange = {
        id: newId(),
        campaignId: input.campaignId,
        branchId: input.branchId,
        sampleId: input.sampleId,
        recordedAt: input.recordedAt ?? new Date().toISOString(),
      };
      if (input.note?.trim()) change.note = input.note.trim().slice(0, 200);
      rows.push(change);
      return change;
    },
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(FOLLOW_UP_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FOLLOW_UP_STORE)) {
        db.createObjectStore(FOLLOW_UP_STORE, { keyPath: "id" }).createIndex(
          "campaignId",
          "campaignId",
          { unique: false },
        );
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("follow-up open failed"));
  });
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function createIndexedDbFollowUpStore(): FollowUpStore {
  return {
    async list(campaignId) {
      const db = await openDb();
      try {
        const rows = (await requestToPromise(
          db.transaction(FOLLOW_UP_STORE, "readonly").objectStore(FOLLOW_UP_STORE).getAll(),
        )) as AppliedChange[];
        return rows
          .filter((row) => row.campaignId === campaignId)
          .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
      } finally {
        db.close();
      }
    },
    async record(input) {
      const memory = createMemoryFollowUpStore();
      const change = await memory.record(input);
      const db = await openDb();
      try {
        const tx = db.transaction(FOLLOW_UP_STORE, "readwrite");
        tx.objectStore(FOLLOW_UP_STORE).put(change);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        return change;
      } finally {
        db.close();
      }
    },
  };
}

let defaultStore: FollowUpStore | null = null;

export function appliedChangeStore(): FollowUpStore {
  if (!defaultStore) {
    defaultStore =
      typeof window === "undefined" ? createMemoryFollowUpStore() : createIndexedDbFollowUpStore();
  }
  return defaultStore;
}
