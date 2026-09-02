import type { Pulse } from "./play.ts";
import type { SessionCalm, SessionCheckItem, SessionSnapshot } from "./session-store.ts";

export type DeskMutation =
  | { kind: "addCheck"; text: string }
  | { kind: "toggleCheck"; index: number }
  | { kind: "reorderChecks"; from: number; to: number }
  | { kind: "applyStamp"; id: string }
  | { kind: "removeStamp"; id: string }
  | { kind: "setCalm"; value: SessionCalm }
  | { kind: "setPulse"; patch: Partial<Pulse> };

export type LaterSync = (snapshot: SessionSnapshot) => Promise<void> | void;

export type DeskOfflineHost = {
  snapshot(): SessionSnapshot;
  apply(snapshot: SessionSnapshot): void;
  persist(snapshot: SessionSnapshot): void;
  laterSync?: LaterSync;
};

function bump(snapshot: SessionSnapshot, over: Partial<SessionSnapshot>): SessionSnapshot {
  const nextUpdated = Math.max(Date.now(), snapshot.updatedAt + 1);
  return {
    ...snapshot,
    ...over,
    updatedAt: nextUpdated,
  };
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list;
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item === undefined) return list;
  next.splice(to, 0, item);
  return next;
}

/** Pure last-write-wins patch. No I/O. */
export function applyDeskMutation(snapshot: SessionSnapshot, mutation: DeskMutation): SessionSnapshot {
  switch (mutation.kind) {
    case "addCheck": {
      const text = mutation.text.replace(/\s+/g, " ").trim();
      if (!text) return snapshot;
      const checks: SessionCheckItem[] = [...snapshot.checks, { text, done: false }];
      return bump(snapshot, { checks });
    }
    case "toggleCheck": {
      const index = mutation.index;
      if (index < 0 || index >= snapshot.checks.length) return snapshot;
      const checks = snapshot.checks.map((item, i) =>
        i === index ? { ...item, done: !item.done } : item,
      );
      return bump(snapshot, { checks });
    }
    case "reorderChecks":
      return bump(snapshot, { checks: moveItem(snapshot.checks, mutation.from, mutation.to) });
    case "applyStamp": {
      if (!mutation.id || snapshot.stamps.includes(mutation.id)) return snapshot;
      return bump(snapshot, { stamps: [...snapshot.stamps, mutation.id] });
    }
    case "removeStamp":
      if (!snapshot.stamps.includes(mutation.id)) return snapshot;
      return bump(snapshot, { stamps: snapshot.stamps.filter((id) => id !== mutation.id) });
    case "setCalm":
      if (snapshot.calm === mutation.value) return snapshot;
      return bump(snapshot, { calm: mutation.value });
    case "setPulse":
      return bump(snapshot, { pulse: { ...snapshot.pulse, ...mutation.patch } });
  }
}

/**
 * Local-commit is success. Optional later-sync is fire-and-forget:
 * a rejected remote call never reverts the desk and never throws to the UI.
 */
export function commitDeskMutation(host: DeskOfflineHost, mutation: DeskMutation): SessionSnapshot {
  const next = applyDeskMutation(host.snapshot(), mutation);
  host.apply(next);
  host.persist(next);
  const sync = host.laterSync;
  if (sync) {
    try {
      void Promise.resolve(sync(next)).catch(() => {
        /* keep local state */
      });
    } catch {
      /* sync threw before returning a promise */
    }
  }
  return next;
}

let boundHost: (() => DeskOfflineHost) | null = null;

export function bindDeskOfflineHost(factory: () => DeskOfflineHost): void {
  boundHost = factory;
}

export function mutateDesk(mutation: DeskMutation): SessionSnapshot | null {
  if (!boundHost) return null;
  return commitDeskMutation(boundHost(), mutation);
}
