import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { defaultPulse } from "./play.ts";
import { LAST_SESSION_KEY, SESSION_STORE_VERSION, type SessionSnapshot } from "./session-store.ts";
import {
  applyDeskMutation,
  commitDeskMutation,
  type DeskMutation,
  type DeskOfflineHost,
} from "./desk-offline.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function source(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function sample(over: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    version: SESSION_STORE_VERSION,
    sessionKey: LAST_SESSION_KEY,
    updatedAt: 1_700_000_000_000,
    mission: {
      id: "ch1-spark",
      title: "Una chispa que vuelve",
      body: "Construí 1 mercado.",
    },
    checks: [
      { text: "Leñador en los árboles", done: true },
      { text: "Mercado cerca del puerto", done: false },
    ],
    completed: [],
    stamps: [],
    calm: "session",
    pulse: defaultPulse,
    overbuildBrake: { active: false },
    ...over,
  };
}

describe("applyDeskMutation", () => {
  it("adds a check without waiting on a network", () => {
    const next = applyDeskMutation(sample(), { kind: "addCheck", text: "Calle al aserradero" });
    assert.equal(next.checks.length, 3);
    assert.deepEqual(next.checks[2], { text: "Calle al aserradero", done: false });
    assert.ok(next.updatedAt >= sample().updatedAt);
  });

  it("toggles a check in place", () => {
    const next = applyDeskMutation(sample(), { kind: "toggleCheck", index: 1 });
    assert.equal(next.checks[1]?.done, true);
    assert.equal(next.checks[0]?.done, true);
  });

  it("reorders checks last-write-wins", () => {
    const next = applyDeskMutation(sample(), { kind: "reorderChecks", from: 0, to: 1 });
    assert.equal(next.checks[0]?.text, "Mercado cerca del puerto");
    assert.equal(next.checks[1]?.text, "Leñador en los árboles");
  });

  it("applies and removes stamps", () => {
    const applied = applyDeskMutation(sample(), { kind: "applyStamp", id: "block-10" });
    assert.deepEqual(applied.stamps, ["block-10"]);
    const again = applyDeskMutation(applied, { kind: "applyStamp", id: "block-10" });
    assert.deepEqual(again.stamps, ["block-10"]);
    const removed = applyDeskMutation(applied, { kind: "removeStamp", id: "block-10" });
    assert.deepEqual(removed.stamps, []);
  });

  it("runs calm and updates pulse", () => {
    const calm = applyDeskMutation(sample(), { kind: "setCalm", value: "overwhelmed" });
    assert.equal(calm.calm, "overwhelmed");
    const pulse = applyDeskMutation(calm, { kind: "setPulse", patch: { coins: "down" } });
    assert.equal(pulse.pulse.coins, "down");
    assert.equal(pulse.pulse.houses, "unknown");
  });
});

describe("commitDeskMutation", () => {
  function host(initial: SessionSnapshot, laterSync?: DeskOfflineHost["laterSync"]): DeskOfflineHost & {
    applied: SessionSnapshot[];
    persisted: SessionSnapshot[];
  } {
    let current = initial;
    const applied: SessionSnapshot[] = [];
    const persisted: SessionSnapshot[] = [];
    return {
      applied,
      persisted,
      snapshot: () => current,
      apply(next) {
        current = next;
        applied.push(next);
      },
      persist(next) {
        persisted.push(next);
      },
      laterSync,
    };
  }

  it("treats local persist as success even when later-sync fails", async () => {
    const calls: SessionSnapshot[] = [];
    const h = host(sample(), async (snap) => {
      calls.push(snap);
      throw new Error("radio down");
    });
    const result = commitDeskMutation(h, { kind: "setCalm", value: "broke" });
    assert.equal(result.calm, "broke");
    assert.equal(h.persisted.length, 1);
    assert.equal(h.applied[0]?.calm, "broke");
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(calls.length, 1);
    assert.equal(h.applied[0]?.calm, "broke");
  });

  it("does not await later-sync before returning", () => {
    let started = false;
    let finished = false;
    const h = host(sample(), () => {
      started = true;
      return new Promise((resolve) => {
        setTimeout(() => {
          finished = true;
          resolve();
        }, 50);
      });
    });
    const result = commitDeskMutation(h, { kind: "applyStamp", id: "block-10" });
    assert.deepEqual(result.stamps, ["block-10"]);
    assert.equal(started, true);
    assert.equal(finished, false);
    assert.equal(h.persisted.length, 1);
  });

  it("last write wins on a single-device session", () => {
    const h = host(sample({ updatedAt: 1 }));
    commitDeskMutation(h, { kind: "setCalm", value: "overwhelmed" } satisfies DeskMutation);
    const last = commitDeskMutation(h, { kind: "setCalm", value: "broke" });
    assert.equal(last.calm, "broke");
    assert.equal(h.persisted.at(-1)?.calm, "broke");
    assert.ok((h.persisted.at(-1)?.updatedAt ?? 0) >= (h.persisted[0]?.updatedAt ?? 0));
  });
});

describe("desk UI stays local and calm", () => {
  it("session desk and stamp panel commit through desk-offline, never toast a broken desk", () => {
    const desk = source("src/components/session-desk.tsx");
    const stamp = source("src/components/desk-sheets/stamp-panel.tsx");
    const mut = source("src/lib/desk-offline.ts");
    for (const src of [desk, stamp, mut]) {
      assert.doesNotMatch(src, /\btoast\b|\bsonner\b|error toast/i);
      assert.doesNotMatch(src, /RedirectToSignIn|\/login/);
    }
    assert.match(desk, /commitDeskMutation/);
    assert.match(desk, /addCheck|reorderChecks/);
    assert.match(stamp, /commitDeskMutation/);
    assert.match(stamp, /applyStamp|removeStamp/);
    assert.doesNotMatch(mut, /\bfetch\s*\(/);
  });

  it("does not grey out the whole desk when the radio is down", () => {
    const desk = source("src/components/session-desk.tsx");
    const stamp = source("src/components/desk-sheets/stamp-panel.tsx");
    const surface = source("src/components/session-desk-surface.tsx");
    for (const src of [desk, stamp, surface]) {
      assert.doesNotMatch(src, /navigator\.onLine/);
      assert.doesNotMatch(src, /disabled=\{[^}]*radio|disabled=\{[^}]*offline/i);
      assert.doesNotMatch(src, /pointer-events-none.*desk|opacity-40.*desk/);
    }
  });
});
