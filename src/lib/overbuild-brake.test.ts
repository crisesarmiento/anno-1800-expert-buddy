import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { defaultPulse } from "./play.ts";
import {
  OVERBUILD_BRAKE_CLEAR_ACTION,
  OVERBUILD_BRAKE_NOTICE,
  applyOverbuildBrake,
  initialOverbuildBrake,
  nextMoveUnderBrake,
  reduceOverbuildBrake,
  type ConstructionAdvice,
  type OverbuildBrakeEvent,
  type OverbuildBrakeState,
} from "./overbuild-brake.ts";
import {
  LAST_SESSION_KEY,
  SESSION_STORE_VERSION,
  createMemoryKv,
  createSessionStore,
  parseSessionSnapshot,
  type SessionSnapshot,
} from "./session-store.ts";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(rel: string) {
  return readFileSync(join(srcRoot, rel), "utf8");
}

function sliceBetween(src: string, start: string, end: string) {
  const from = src.indexOf(start);
  const to = src.indexOf(end, from + start.length);
  assert.ok(from >= 0, start);
  assert.ok(to > from, end);
  return src.slice(from, to);
}

const chainNow: ConstructionAdvice = {
  kind: "construction-chain",
  when: "now",
  title: "Armá la cadena de pescado.",
  detail: "Ahora.",
};

const chainLater: ConstructionAdvice = {
  kind: "construction-chain",
  when: "later",
  title: "Después armá acero.",
  detail: "Cuando termines esto.",
};

const other: ConstructionAdvice = {
  kind: "other",
  when: "now",
  title: "Seguí el marcador.",
  detail: "Entregá y volvé.",
};

function active(): OverbuildBrakeState {
  return reduceOverbuildBrake(initialOverbuildBrake, {
    type: "buildMissionChecklistCompleted",
  });
}

function sessionSnap(over: Partial<SessionSnapshot> = {}): SessionSnapshot {
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
      { text: "Mercado cerca del puerto", done: true },
    ],
    completed: ["pro-blast"],
    stamps: ["block-10"],
    calm: "overwhelmed",
    pulse: { ...defaultPulse, coins: "down", houses: "yellow" },
    overbuildBrake: { active: true },
    ...over,
  };
}

describe("overbuild brake state", () => {
  it("starts inactive", () => {
    assert.equal(initialOverbuildBrake.active, false);
  });

  it("activates when a build-mission checklist is completed", () => {
    const next = reduceOverbuildBrake(initialOverbuildBrake, {
      type: "buildMissionChecklistCompleted",
    });
    assert.equal(next.active, true);
  });

  it("activates when pulse becomes rojo", () => {
    const next = reduceOverbuildBrake(initialOverbuildBrake, {
      type: "pulse",
      pulse: "rojo",
    });
    assert.equal(next.active, true);
  });

  it("activates when pulse becomes amarillo", () => {
    const next = reduceOverbuildBrake(initialOverbuildBrake, {
      type: "pulse",
      pulse: "amarillo",
    });
    assert.equal(next.active, true);
  });

  it("does not activate on vacío or recado pulse", () => {
    for (const pulse of ["vacio", "recado"] as const) {
      const next = reduceOverbuildBrake(initialOverbuildBrake, {
        type: "pulse",
        pulse,
      });
      assert.equal(next.active, false, pulse);
    }
  });

  it("is idempotent when triggers repeat while already active", () => {
    const first = active();
    const events: OverbuildBrakeEvent[] = [
      { type: "buildMissionChecklistCompleted" },
      { type: "pulse", pulse: "rojo" },
      { type: "pulse", pulse: "amarillo" },
      { type: "buildMissionChecklistCompleted" },
    ];
    let state = first;
    for (const event of events) {
      state = reduceOverbuildBrake(state, event);
      assert.equal(state.active, true);
      assert.deepEqual(state, first);
    }
  });

  it("clears only via the Ya se mudaron acknowledgement", () => {
    assert.equal(OVERBUILD_BRAKE_CLEAR_ACTION, "Ya se mudaron");
    const cleared = reduceOverbuildBrake(active(), { type: "acknowledgeMovedIn" });
    assert.equal(cleared.active, false);
  });

  it("does not clear on time, navigation, pulse, checklist, or lifecycle", () => {
    const events: OverbuildBrakeEvent[] = [
      { type: "timePassed" },
      { type: "navigated" },
      { type: "pulse", pulse: "vacio" },
      { type: "pulse", pulse: "recado" },
      { type: "checklistChanged" },
      { type: "sessionLifecycle" },
    ];
    let state = active();
    for (const event of events) {
      state = reduceOverbuildBrake(state, event);
      assert.equal(state.active, true, event.type);
    }
  });

  it("activates from a completed build-mission checklist snapshot", () => {
    const next = reduceOverbuildBrake(initialOverbuildBrake, {
      type: "checklistChanged",
      missionKind: "build",
      itemCount: 3,
      checkedCount: 3,
    });
    assert.equal(next.active, true);
  });

  it("does not activate from a partial or non-build checklist", () => {
    assert.equal(
      reduceOverbuildBrake(initialOverbuildBrake, {
        type: "checklistChanged",
        missionKind: "build",
        itemCount: 3,
        checkedCount: 2,
      }).active,
      false,
    );
    assert.equal(
      reduceOverbuildBrake(initialOverbuildBrake, {
        type: "checklistChanged",
        missionKind: "errand",
        itemCount: 2,
        checkedCount: 2,
      }).active,
      false,
    );
  });

  it("does not clear if the checklist is later unchecked", () => {
    const next = reduceOverbuildBrake(active(), {
      type: "checklistChanged",
      missionKind: "build",
      itemCount: 3,
      checkedCount: 1,
    });
    assert.equal(next.active, true);
  });
});

describe("construction-chain suppression", () => {
  it("passes recommendations through while the brake is off", () => {
    assert.deepEqual(
      applyOverbuildBrake(initialOverbuildBrake, [chainNow, chainLater, other]),
      [chainNow, chainLater, other],
    );
  });

  it("suppresses construction-chain advice including later-framed ones while active", () => {
    assert.deepEqual(applyOverbuildBrake(active(), [chainNow, chainLater, other]), [other]);
  });

  it("keeps suppressing for the full duration until acknowledgement", () => {
    let state = active();
    state = reduceOverbuildBrake(state, { type: "navigated" });
    state = reduceOverbuildBrake(state, { type: "timePassed" });
    assert.deepEqual(applyOverbuildBrake(state, [chainLater, other]), [other]);
    state = reduceOverbuildBrake(state, { type: "acknowledgeMovedIn" });
    assert.deepEqual(applyOverbuildBrake(state, [chainLater, other]), [chainLater, other]);
  });

  it("drops the yellow-houses chain rec and later build-mission steps while active", () => {
    const yellow = nextMoveUnderBrake(
      { ...defaultPulse, houses: "yellow" },
      ["Armá la cadena de pescado."],
      [],
      active(),
      "build",
    );
    assert.equal(/cadena/i.test(yellow.title + yellow.detail), false);

    const nextBuildStep = nextMoveUnderBrake(
      defaultPulse,
      ["Armá otra cadena."],
      [],
      active(),
      "build",
    );
    assert.equal(/cadena/i.test(nextBuildStep.title + nextBuildStep.detail), false);
    assert.notEqual(nextBuildStep.title, "Esto, ahora.");
  });

  it("restores chain recs after Ya se mudaron", () => {
    const cleared = reduceOverbuildBrake(active(), { type: "acknowledgeMovedIn" });
    const move = nextMoveUnderBrake(
      { ...defaultPulse, houses: "yellow" },
      ["Armá la cadena de pescado."],
      [],
      cleared,
      "build",
    );
    assert.equal(move.title, "Primero las barras amarillas.");
  });
});

describe("Chief P0 sticky stop-building notice", () => {
  it("keeps the notice copy exact", () => {
    assert.equal(OVERBUILD_BRAKE_NOTICE, "Pará de construir. Esperá que se muden.");
    assert.equal(OVERBUILD_BRAKE_CLEAR_ACTION, "Ya se mudaron");
  });

  it("mounts the notice on HarborApp so it survives desk navigation", () => {
    const app = source("components/harbor-app.tsx");
    assert.match(app, /OverbuildBrakeNotice/);
    assert.match(app, /from "@\/components\/overbuild-brake-notice"/);
  });

  it("shows the notice from overbuildBrake.active and clears only via acknowledgeMovedIn", () => {
    const notice = source("components/overbuild-brake-notice.tsx");
    assert.match(notice, /OVERBUILD_BRAKE_NOTICE/);
    assert.match(notice, /OVERBUILD_BRAKE_CLEAR_ACTION/);
    assert.match(notice, /overbuildBrake\.active/);
    assert.match(notice, /acknowledgeMovedIn/);
    assert.match(notice, /if \(!active\) return null/);
    assert.match(notice, /onClick=\{acknowledgeMovedIn\}/);
    assert.match(notice, /sticky/);
    assert.doesNotMatch(notice, /onClose|Escape|aria-label="Cerrar"|DisclosureSheet/);
    assert.doesNotMatch(notice, /construction-chain|Después armá|cadena para más tarde/);
  });

  it("is not a dialog and has no dismissal path except Ya se mudaron", () => {
    const notice = source("components/overbuild-brake-notice.tsx");
    assert.match(notice, /role="status"/);
    assert.match(notice, /aria-live="assertive"/);
    assert.match(notice, /data-overbuild-brake="notice"/);
    assert.match(notice, /type="button"/);
    assert.doesNotMatch(
      notice,
      /Dialog|AlertDialog|Drawer|Vaul|onOpenChange|onPointerDownOutside|onInteractOutside|onEscapeKeyDown|overlay|modal/i,
    );
    const buttons = notice.match(/<button/g) ?? [];
    assert.equal(buttons.length, 1);
  });

  it("sits on HarborApp above the Welcome/desk swap so navigation cannot unmount it", () => {
    const app = source("components/harbor-app.tsx");
    const noticeAt = app.indexOf("<OverbuildBrakeNotice");
    const welcomeAt = app.indexOf("<Welcome");
    const deskAt = app.indexOf("<SessionDeskSurface");
    assert.ok(noticeAt >= 0 && welcomeAt > noticeAt && deskAt > noticeAt);
  });
});

describe("overbuild brake re-latches after the sole clear", () => {
  it("activates again from checklist, rojo, or amarillo after Ya se mudaron", () => {
    const cleared = reduceOverbuildBrake(active(), { type: "acknowledgeMovedIn" });
    assert.equal(cleared.active, false);
    assert.equal(
      reduceOverbuildBrake(cleared, { type: "buildMissionChecklistCompleted" }).active,
      true,
    );
    assert.equal(reduceOverbuildBrake(cleared, { type: "pulse", pulse: "rojo" }).active, true);
    assert.equal(reduceOverbuildBrake(cleared, { type: "pulse", pulse: "amarillo" }).active, true);
  });
});

describe("Harbor store integration", () => {
  const store = source("lib/store.ts");
  const boot = source("lib/session-boot.ts");
  const buddy = source("lib/buddy.ts");
  const chat = source("components/buddy-chat.tsx");

  it("latches from a completed build-mission checklist via toggleCheck", () => {
    const toggle = sliceBetween(store, "toggleCheck: (missionId, index) =>", "markComplete: (id) =>");
    assert.match(toggle, /type: "checklistChanged"/);
    assert.match(toggle, /missionKind: mission\?\.kind/);
    assert.match(toggle, /itemCount: mission\?\.do\.length/);
    assert.match(toggle, /checkedCount: next\.length/);
  });

  it("latches independently from HUD rojo and amarillo, not vacío/recado", () => {
    const note = sliceBetween(store, "noteHudPulse: (pulse) =>", "acknowledgeMovedIn: () =>");
    assert.match(note, /type: "pulse", pulse/);
    const setPulse = sliceBetween(store, "setPulse: (patch) =>", "noteHudPulse: (pulse) =>");
    assert.match(setPulse, /pulse\.coins === "down" \? "rojo"/);
    assert.match(setPulse, /pulse\.houses === "yellow" \? "amarillo"/);
  });

  it("keeps the brake across navigation, chat, calm, reset, and mission complete", () => {
    assert.match(sliceBetween(store, "setMissionId: (id) =>", "setSpoilers: (value) =>"), /type: "navigated"/);
    assert.match(sliceBetween(store, "resetProgress: () =>", "name: \"harbor-buddy-es\""), /type: "sessionLifecycle"/);
    assert.doesNotMatch(sliceBetween(store, "markComplete: (id) =>", "addChat: (turn) =>"), /overbuildBrake/);
    assert.doesNotMatch(sliceBetween(store, "addChat: (turn) =>", "clearChat: () =>"), /overbuildBrake/);
    assert.doesNotMatch(sliceBetween(store, "setCalm: (value) =>", "setPulse: (patch) =>"), /overbuildBrake/);
    assert.doesNotMatch(sliceBetween(store, "setSpoilers: (value) =>", "setCalm: (value) =>"), /overbuildBrake/);
    assert.match(store, /acknowledgeMovedIn: \(\) =>/);
  });

  it("persists overbuildBrake for reload and restores it on last-session hydrate", () => {
    assert.match(store, /overbuildBrake: state\.overbuildBrake/);
    assert.match(store, /name: "harbor-buddy-es"/);
    assert.match(boot, /overbuildBrake:/);
    assert.match(boot, /applyHarborSnapshot/);
    assert.match(sliceBetween(boot, "applyHarborSnapshot", "hydrateHarborFromSessionStore"), /overbuildBrake:/);
    assert.match(sliceBetween(boot, "snapshotFromHarbor", "applyHarborSnapshot"), /overbuildBrake:/);
    assert.doesNotMatch(boot, /acknowledgeMovedIn/);
  });

  it("suppresses construction-chain recs in the buddy prompt until acknowledgement", () => {
    assert.match(chat, /overbuildBrakeActive: snapshot\.overbuildBrake\.active/);
    assert.match(buddy, /overbuildBrakeActive: Boolean\(input\.overbuildBrakeActive\)/);
    assert.match(buddy, /Freno de overbuild ACTIVO/);
    assert.match(buddy, /ni ahora ni .después. \/ .más tarde/);
    assert.match(buddy, /Las casas vacías no pagan/);
  });
});

describe("last-session restoration of the overbuild brake", () => {
  it("round-trips an active brake through persist and a fresh store", async () => {
    const kv = createMemoryKv();
    const store = createSessionStore(kv);
    const snap = sessionSnap();
    await store.persistNow(snap);

    const restarted = createSessionStore(kv);
    const loaded = restarted.hydrateSync();
    assert.equal(loaded?.overbuildBrake.active, true);
    assert.deepEqual(loaded?.overbuildBrake, { active: true });
  });

  it("parses a missing brake field as inactive so old snapshots still load", () => {
    const { overbuildBrake: _drop, ...legacy } = sessionSnap();
    void _drop;
    const parsed = parseSessionSnapshot(JSON.stringify(legacy));
    assert.equal(parsed?.overbuildBrake.active, false);
  });

  it("does not drop an active brake when unrelated snapshot fields change", async () => {
    const kv = createMemoryKv();
    const store = createSessionStore(kv);
    await store.persistNow(sessionSnap());
    const mid = store.hydrateSync();
    assert.ok(mid);
    await store.persistNow({
      ...mid,
      updatedAt: mid.updatedAt + 1,
      calm: "broke",
      overbuildBrake: mid.overbuildBrake,
    });
    const loaded = createSessionStore(kv).hydrateSync();
    assert.equal(loaded?.calm, "broke");
    assert.equal(loaded?.overbuildBrake.active, true);
  });
});
