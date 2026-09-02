import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { defaultPulse } from "./play.ts";
import {
  LAST_SESSION_KEY,
  SESSION_STORE_VERSION,
  createMemoryKv,
  createSessionStore,
  emptyDeskFromSnapshot,
  parseSessionSnapshot,
  type SessionSnapshot,
} from "./session-store.ts";

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
      body: "Construí 1 mercado, 10 casas de granjeros y atraé 50 granjeros.",
    },
    checks: [
      { text: "Leñador en los árboles", done: true },
      { text: "Mercado cerca del puerto", done: false },
    ],
    completed: ["pro-blast"],
    stamps: ["block-10"],
    calm: "overwhelmed",
    pulse: { ...defaultPulse, coins: "down", houses: "yellow" },
    overbuildBrake: { active: false },
    ...over,
  };
}

describe("parseSessionSnapshot", () => {
  it("accepts a versioned last-session payload", () => {
    const snap = parseSessionSnapshot(JSON.stringify(sample()));
    assert.equal(snap?.mission?.id, "ch1-spark");
    assert.equal(snap?.checks[0]?.done, true);
    assert.equal(snap?.calm, "overwhelmed");
    assert.equal(snap?.stamps[0], "block-10");
    assert.equal(snap?.pulse.coins, "down");
  });

  it("rejects garbage and unknown versions", () => {
    assert.equal(parseSessionSnapshot(""), null);
    assert.equal(parseSessionSnapshot("{"), null);
    assert.equal(parseSessionSnapshot(JSON.stringify({ version: 99 })), null);
  });
});

describe("durable last-session store", () => {
  it("hydrates null from an empty kv — empty desk, not a wait", () => {
    const store = createSessionStore(createMemoryKv());
    assert.equal(store.hydrateSync(), null);
    assert.equal(emptyDeskFromSnapshot(null), true);
  });

  it("round-trips last mission, checks, stamps, calm, and pulse", async () => {
    const kv = createMemoryKv();
    const store = createSessionStore(kv);
    const snap = sample();
    await store.persistNow(snap);

    const restarted = createSessionStore(kv);
    const loaded = restarted.hydrateSync();
    assert.deepEqual(loaded, snap);
    assert.equal(emptyDeskFromSnapshot(loaded), false);
  });

  it("keeps offline mutations after a second restart", async () => {
    const kv = createMemoryKv();
    const first = createSessionStore(kv);
    await first.persistNow(sample());

    const second = createSessionStore(kv);
    const mid = second.hydrateSync();
    assert.ok(mid);
    const mutated: SessionSnapshot = {
      ...mid,
      updatedAt: mid.updatedAt + 1,
      checks: mid.checks.map((item, index) =>
        index === 1 ? { ...item, done: true } : item,
      ),
      calm: "broke",
    };
    await second.persistNow(mutated);

    const third = createSessionStore(kv);
    const loaded = third.hydrateSync();
    assert.equal(loaded?.checks[1]?.done, true);
    assert.equal(loaded?.calm, "broke");
  });

  it("debounces persist to ≤300ms and last write wins", async () => {
    const kv = createMemoryKv();
    const timers: Array<{ ms: number; fn: () => void }> = [];
    const store = createSessionStore(kv, {
      debounceMs: 300,
      schedule: (fn, ms) => {
        const handle = { ms, fn };
        timers.push(handle);
        return () => {
          const i = timers.indexOf(handle);
          if (i >= 0) timers.splice(i, 1);
        };
      },
    });

    store.schedulePersist(sample({ calm: "session" }));
    store.schedulePersist(sample({ calm: "broke", updatedAt: 2 }));
    assert.equal(store.hydrateSync(), null);
    assert.equal(timers.length, 1);
    assert.ok(timers[0].ms <= 300);
    timers[0].fn();
    await Promise.resolve();
    assert.equal(store.hydrateSync()?.calm, "broke");
  });

  it("evicts older sessions and keeps only last", async () => {
    const kv = createMemoryKv();
    const store = createSessionStore(kv);
    await store.persistNow(sample({ sessionKey: "old", mission: { id: "old", title: "Old", body: "" } }));
    await store.persistNow(sample({ sessionKey: LAST_SESSION_KEY }));
    const keys = kv.keys().filter((key) => key.startsWith("session:"));
    assert.deepEqual(keys, [`session:${LAST_SESSION_KEY}`]);
    assert.equal(store.hydrateSync()?.mission?.id, "ch1-spark");
  });
});

describe("boot path: local hydrate before network", () => {
  const files = [
    "src/lib/session-store.ts",
    "src/lib/session-boot.ts",
    "src/components/session-boot.tsx",
    "src/routes/index.tsx",
    "src/components/harbor-app.tsx",
  ];

  it("boot helpers never call fetch, auth, or token refresh", () => {
    const store = source("src/lib/session-store.ts");
    const boot = source("src/lib/session-boot.ts");
    for (const src of [store, boot]) {
      assert.doesNotMatch(src, /\bfetch\s*\(/);
      assert.doesNotMatch(src, /get-session|getSession|signIn|refreshToken|\/api\/auth/);
    }
  });

  it("home paints an empty desk, not a server spinner, while the store is empty", () => {
    const boot = source("src/components/session-boot.tsx");
    const index = source("src/routes/index.tsx");
    assert.match(index, /SessionBoot/);
    assert.match(boot, /useLayoutEffect/);
    assert.match(boot, /hydrateHarborFromSessionStore/);
    assert.match(boot, /data-empty-desk/);
    assert.doesNotMatch(boot, /spinner|Loading…|Cargando/i);
    assert.doesNotMatch(boot, /get-session|RedirectToSignIn|\/login/);
  });

  it("documents schema and last-session eviction", () => {
    const doc = source("docs/session-store.md");
    assert.match(doc, /version/);
    assert.match(doc, /sessionKey/);
    assert.match(doc, /mission/);
    assert.match(doc, /checks/);
    assert.match(doc, /stamps/);
    assert.match(doc, /calm/);
    assert.match(doc, /pulse/);
    assert.match(doc, /last session/i);
    assert.match(doc, /evict/i);
    assert.match(doc, /300/);
  });

  for (const file of files) {
    it(`${file} exists for the restore path`, () => {
      assert.ok(source(file).length > 0);
    });
  }
});

afterEach(() => {
  // isolation is per-test via fresh MemoryKv
});
