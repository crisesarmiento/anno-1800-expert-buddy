export const LIVE_HANDLE_DB = "harbor-buddy-live";
export const LIVE_HANDLE_STORE = "handles";
export const LIVE_HANDLE_KEY = "harbor-live.json";
export const LIVE_POLL_MS = 2500;

export type LiveFileHandle = {
  name?: string;
  queryPermission?: (opts?: { mode?: "read" }) => Promise<PermissionState>;
  requestPermission?: (opts?: { mode?: "read" }) => Promise<PermissionState>;
  getFile: () => Promise<File>;
};

export type LiveHandleKv = {
  get(key: string): Promise<LiveFileHandle | undefined>;
  set(key: string, handle: LiveFileHandle): Promise<void>;
  delete(key: string): Promise<void>;
};

export type LiveChipCopy = {
  pick: string;
  refresh: string;
};

/** Spanish chip copy — Visual A stamp, not locale chrome. */
export const LIVE_CHIP_COPY: LiveChipCopy = {
  pick: "Elegir live",
  refresh: "Actualizar",
};

export function liveChipCopy(_locale?: string): LiveChipCopy {
  return LIVE_CHIP_COPY;
}

export function liveChipLabel(hasHandle: boolean, copy: LiveChipCopy = LIVE_CHIP_COPY) {
  return hasHandle ? copy.refresh : copy.pick;
}

export function shouldReadOnHydrate() {
  return false;
}

/** Browser never walks Documents\Anno 1800 on its own. */
export function liveAutoPath(): string | null {
  return null;
}

export function createMemoryHandleKv(seed?: Record<string, LiveFileHandle>): LiveHandleKv {
  const map = new Map<string, LiveFileHandle>(Object.entries(seed ?? {}));
  return {
    get: async (key) => map.get(key),
    set: async (key, handle) => {
      map.set(key, handle);
    },
    delete: async (key) => {
      map.delete(key);
    },
  };
}

function openLiveHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(LIVE_HANDLE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LIVE_HANDLE_STORE)) {
        db.createObjectStore(LIVE_HANDLE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
}

export function createIndexedDbHandleKv(): LiveHandleKv {
  return {
    async get(key) {
      try {
        const db = await openLiveHandleDb();
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(LIVE_HANDLE_STORE, "readonly");
          const req = tx.objectStore(LIVE_HANDLE_STORE).get(key);
          req.onsuccess = () => resolve(req.result as LiveFileHandle | undefined);
          req.onerror = () => reject(req.error);
        });
      } catch {
        return undefined;
      }
    },
    async set(key, handle) {
      try {
        const db = await openLiveHandleDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(LIVE_HANDLE_STORE, "readwrite");
          const req = tx.objectStore(LIVE_HANDLE_STORE).put(handle, key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch {
        /* stay calm — persist is best-effort */
      }
    },
    async delete(key) {
      try {
        const db = await openLiveHandleDb();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(LIVE_HANDLE_STORE, "readwrite");
          const req = tx.objectStore(LIVE_HANDLE_STORE).delete(key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch {
        /* ignore */
      }
    },
  };
}

let defaultKv: LiveHandleKv | null = null;

export function liveHandleKv(): LiveHandleKv {
  if (!defaultKv) {
    defaultKv = typeof indexedDB === "undefined" ? createMemoryHandleKv() : createIndexedDbHandleKv();
  }
  return defaultKv;
}

export async function persistLiveHandle(handle: LiveFileHandle, kv: LiveHandleKv = liveHandleKv()) {
  await kv.set(LIVE_HANDLE_KEY, handle);
}

export async function readPersistedLiveHandle(kv: LiveHandleKv = liveHandleKv()) {
  return kv.get(LIVE_HANDLE_KEY);
}

export async function clearPersistedLiveHandle(kv: LiveHandleKv = liveHandleKv()) {
  await kv.delete(LIVE_HANDLE_KEY);
}

export async function ensureReadPermission(handle: LiveFileHandle): Promise<PermissionState> {
  const query = handle.queryPermission?.bind(handle);
  if (query) {
    const current = await query({ mode: "read" });
    if (current === "granted" || current === "denied") return current;
  }
  const request = handle.requestPermission?.bind(handle);
  if (request) return request({ mode: "read" });
  return "granted";
}

export async function refreshLiveHandle(kv: LiveHandleKv = liveHandleKv()): Promise<File | undefined> {
  const handle = await readPersistedLiveHandle(kv);
  if (!handle) return undefined;
  const permission = await ensureReadPermission(handle);
  if (permission !== "granted") return undefined;
  return handle.getFile();
}

export async function tickLiveHandle(
  handle: LiveFileHandle,
  lastModified: number,
  onFile: (file: File) => Promise<void>,
): Promise<number> {
  const file = await handle.getFile();
  if (file.lastModified === lastModified) return lastModified;
  await onFile(file);
  return file.lastModified;
}
