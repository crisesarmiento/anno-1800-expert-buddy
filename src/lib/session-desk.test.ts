import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DESK_UMBRALES,
  TALLER_LINK,
  deskCalmUmbral,
  saturadoRojo,
  sessionEstoAhora,
  sessionNowItem,
} from "./session-desk.ts";

const pulse = { coins: "unknown", houses: "unknown", looking: "unknown" } as const;

describe("sessionNowItem", () => {
  it("returns exactly one next action, never a three-item list", () => {
    assert.equal(sessionNowItem(["A", "B", "C", "D"]), "A");
    assert.equal(sessionNowItem(["A", "B", "C"], [0]), "B");
    assert.equal(typeof sessionNowItem(["A"]), "string");
    assert.notEqual(Array.isArray(sessionNowItem(["A", "B", "C"])), true);
  });

  it("does not pad filler checklist rows", () => {
    assert.equal(sessionNowItem(["A"]), "A");
    assert.equal(sessionNowItem([]), "Seguí el marcador de la misión.");
  });
});

describe("sessionEstoAhora", () => {
  it("returns only the first do-item", () => {
    assert.equal(sessionEstoAhora(["A", "B", "C"]), "A");
  });

  it("falls back to the diary prompt when the beat is empty", () => {
    assert.equal(sessionEstoAhora([]), "Tocá el título que ves en el diario.");
  });
});

describe("saturadoRojo", () => {
  it("is Rojo when coins are down", () => {
    assert.deepEqual(saturadoRojo({ ...pulse, coins: "down" }, "session"), {
      saturado: false,
      rojo: true,
    });
  });

  it("is Saturado when houses are yellow", () => {
    assert.deepEqual(saturadoRojo({ ...pulse, houses: "yellow" }, "session"), {
      saturado: true,
      rojo: false,
    });
  });

  it("combines Saturado and Rojo", () => {
    assert.deepEqual(saturadoRojo({ ...pulse, coins: "down", houses: "empty" }, "overwhelmed"), {
      saturado: true,
      rojo: true,
    });
  });
});

describe("deskCalmUmbral", () => {
  it("locks the four umbrales in rank order", () => {
    assert.deepEqual([...DESK_UMBRALES], ["enough", "not-enough", "saturado", "rojo"]);
  });

  it("is enough when pulse and calm are quiet", () => {
    assert.deepEqual(deskCalmUmbral(pulse, "session"), {
      saturado: false,
      rojo: false,
      umbral: "enough",
      alarm: false,
      taller: null,
    });
  });

  it("treats yellow houses as not-enough: Saturado chip, no card alarm, taller link-out", () => {
    assert.deepEqual(deskCalmUmbral({ ...pulse, houses: "yellow" }, "session"), {
      saturado: true,
      rojo: false,
      umbral: "not-enough",
      alarm: false,
      taller: { href: TALLER_LINK.href, label: "Ver taller" },
    });
  });

  it("treats empty houses as not-enough, not a full Saturado alarm", () => {
    const calm = deskCalmUmbral({ ...pulse, houses: "empty" }, "session");
    assert.equal(calm.umbral, "not-enough");
    assert.equal(calm.saturado, true);
    assert.equal(calm.alarm, false);
    assert.equal(calm.taller?.href, TALLER_LINK.href);
  });

  it("alarms Saturado only when the player said overwhelmed", () => {
    assert.deepEqual(deskCalmUmbral(pulse, "overwhelmed"), {
      saturado: true,
      rojo: false,
      umbral: "saturado",
      alarm: true,
      taller: { href: TALLER_LINK.href, label: "Ver taller" },
    });
  });

  it("alarms Rojo without a taller (stop building)", () => {
    assert.deepEqual(deskCalmUmbral({ ...pulse, coins: "down" }, "session"), {
      saturado: false,
      rojo: true,
      umbral: "rojo",
      alarm: true,
      taller: null,
    });
  });

  it("lets Rojo win the umbral when Saturado and Rojo are both on", () => {
    const calm = deskCalmUmbral({ ...pulse, coins: "down", houses: "empty" }, "overwhelmed");
    assert.equal(calm.umbral, "rojo");
    assert.equal(calm.alarm, true);
    assert.equal(calm.saturado, true);
    assert.equal(calm.rojo, true);
    assert.equal(calm.taller, null);
  });

  it("uses a static fandom taller URL with no art payload", () => {
    assert.equal(TALLER_LINK.href, "https://anno1800.fandom.com/wiki/Production_buildings");
    assert.doesNotMatch(TALLER_LINK.href, /ubisoft|cdn|jpg|png|webp/i);
  });
});
