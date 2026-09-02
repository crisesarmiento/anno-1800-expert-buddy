import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyDeskMutation,
  commitDeskMutation,
  type DeskOfflineHost,
} from "./desk-offline.ts";
import { decideBootAuth, shouldRedirectToLogin } from "./offline-desk.ts";
import { defaultPulse } from "./play.ts";
import {
  RADIO_DOWN_COPY,
  askForCheck,
  localSuggestedAsks,
} from "./radio-down.ts";
import {
  LAST_SESSION_KEY,
  SESSION_STORE_VERSION,
  createMemoryKv,
  createSessionStore,
  emptyDeskFromSnapshot,
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
    completed: [],
    stamps: [],
    calm: "session",
    pulse: defaultPulse,
    overbuildBrake: { active: false },
    ...over,
  };
}

function hostFromStore(
  initial: SessionSnapshot,
  persist: (snap: SessionSnapshot) => void,
): DeskOfflineHost {
  let current = initial;
  return {
    snapshot: () => current,
    apply(next) {
      current = next;
    },
    persist,
  };
}

describe("P0 offline session desk composition", () => {
  it("desk stamps, checks, calm, and pulse commit locally and restore from last session", () => {
    const kv = createMemoryKv();
    const store = createSessionStore(kv);
    const h = hostFromStore(sample(), (snap) => store.persistNow(snap));

    commitDeskMutation(h, { kind: "addCheck", text: "Calle al aserradero" });
    commitDeskMutation(h, { kind: "toggleCheck", index: 1 });
    commitDeskMutation(h, { kind: "applyStamp", id: "block-10" });
    commitDeskMutation(h, { kind: "setCalm", value: "broke" });
    const last = commitDeskMutation(h, { kind: "setPulse", patch: { coins: "down" } });

    const restored = createSessionStore(kv).hydrateSync();
    assert.equal(emptyDeskFromSnapshot(restored), false);
    assert.deepEqual(restored?.mission, last.mission);
    assert.deepEqual(restored?.checks, [
      { text: "Leñador en los árboles", done: true },
      { text: "Mercado cerca del puerto", done: true },
      { text: "Calle al aserradero", done: false },
    ]);
    assert.deepEqual(restored?.stamps, ["block-10"]);
    assert.equal(restored?.calm, "broke");
    assert.equal(restored?.pulse.coins, "down");
  });

  it("empty store is an empty desk, never a login wall", () => {
    const restored = createSessionStore(createMemoryKv()).hydrateSync();
    assert.equal(restored, null);
    assert.equal(emptyDeskFromSnapshot(restored), true);

    const boot = decideBootAuth({
      online: false,
      hasCachedSession: false,
      hasAccount: false,
      tokenExpired: false,
      sessionPending: true,
    });
    assert.equal(boot.showDesk, true);
    assert.equal(boot.redirectToLogin, false);
    assert.equal(boot.blockFirstPaint, false);
    assert.equal(shouldRedirectToLogin({ online: false, surface: "desk" }), false);
    assert.equal(shouldRedirectToLogin({ online: false, surface: "chat" }), false);
    assert.equal(shouldRedirectToLogin({ online: false, surface: "account" }), false);
  });

  it("offline chat uses the exact banner and local asks from the restored mission", () => {
    const restored = applyDeskMutation(sample(), { kind: "addCheck", text: "Calle al aserradero" });
    const boot = decideBootAuth({
      online: false,
      hasCachedSession: false,
      hasAccount: false,
      tokenExpired: false,
    });
    assert.equal(boot.chatCta, "radio-down");
    assert.equal(RADIO_DOWN_COPY, "radio apagada — usá la lista");

    const asks = localSuggestedAsks({
      title: restored.mission?.title,
      body: restored.mission?.body,
      checks: restored.checks,
    });
    assert.ok(asks.length >= 3 && asks.length <= 6);
    assert.ok(asks.some((ask) => ask.includes("Una chispa que vuelve")));
    assert.ok(asks.includes(askForCheck("Mercado cerca del puerto")));
    assert.ok(asks.includes(askForCheck("Calle al aserradero")));
    assert.ok(!asks.some((ask) => ask.includes("Leñador en los árboles")));
  });

  it("wires restore, desk mutations, radio-down chat, and no login wall", () => {
    const index = source("src/routes/index.tsx");
    const chat = source("src/components/buddy-chat.tsx");
    const desk = source("src/components/session-desk.tsx");
    const boot = source("src/components/session-boot.tsx");

    assert.match(index, /SessionBoot/);
    assert.match(index, /HarborApp/);
    assert.doesNotMatch(index, /RedirectToSignIn|\/login/);

    assert.match(boot, /hydrateHarborFromSessionStore/);
    assert.match(boot, /data-empty-desk/);

    assert.match(desk, /commitDeskMutation/);
    assert.doesNotMatch(desk, /RedirectToSignIn|\/login/);

    assert.match(chat, /RADIO_DOWN_COPY/);
    assert.match(chat, /localSuggestedAsks/);
    assert.match(chat, /takeLocalAsk/);
    assert.match(chat, /if \(!radio\) return/);
    assert.match(chat, /storedChecks/);
    assert.doesNotMatch(chat, /signIn\(|RedirectToSignIn|Iniciá sesi[oó]n/);
  });
});
