import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DESK_UMBRALES,
  TALLER_LINK,
  deskCalmUmbral,
  saturadoRojo,
  sessionChecklist,
} from "./session-desk.ts";

const defaultPulse = {
  coins: "unknown",
  houses: "unknown",
  looking: "unknown",
} as const;

describe("sessionChecklist", () => {
  it("returns the first three do-items of the beat", () => {
    assert.deepEqual(sessionChecklist(["A", "B", "C", "D"]), ["A", "B", "C"]);
  });

  it("pads to exactly three actionable items", () => {
    const items = sessionChecklist(["A"]);
    assert.equal(items.length, 3);
    assert.equal(items[0], "A");
    assert.equal(items[1], "Seguí el marcador de la misión.");
    assert.equal(items[2], "Una cosa a la vez.");
  });
});

describe("saturadoRojo", () => {
  it("is Rojo when coins are down", () => {
    assert.deepEqual(saturadoRojo({ ...defaultPulse, coins: "down" }, "session"), {
      saturado: false,
      rojo: true,
    });
  });

  it("is Saturado when houses are yellow", () => {
    assert.deepEqual(saturadoRojo({ ...defaultPulse, houses: "yellow" }, "session"), {
      saturado: true,
      rojo: false,
    });
  });

  it("combines Saturado and Rojo", () => {
    assert.deepEqual(
      saturadoRojo({ ...defaultPulse, coins: "down", houses: "empty" }, "overwhelmed"),
      { saturado: true, rojo: true },
    );
  });
});

describe("deskCalmUmbral", () => {
  it("locks the four umbrales in rank order", () => {
    assert.deepEqual([...DESK_UMBRALES], ["enough", "not-enough", "saturado", "rojo"]);
  });

  it("is enough when pulse and calm are quiet", () => {
    assert.deepEqual(deskCalmUmbral(defaultPulse, "session"), {
      saturado: false,
      rojo: false,
      umbral: "enough",
      alarm: false,
      taller: null,
    });
  });

  it("treats yellow houses as not-enough: Saturado chip, no card alarm, taller link-out", () => {
    assert.deepEqual(deskCalmUmbral({ ...defaultPulse, houses: "yellow" }, "session"), {
      saturado: true,
      rojo: false,
      umbral: "not-enough",
      alarm: false,
      taller: { href: TALLER_LINK.href, label: "Ver taller" },
    });
  });

  it("treats empty houses as not-enough, not a full Saturado alarm", () => {
    const calm = deskCalmUmbral({ ...defaultPulse, houses: "empty" }, "session");
    assert.equal(calm.umbral, "not-enough");
    assert.equal(calm.saturado, true);
    assert.equal(calm.alarm, false);
    assert.equal(calm.taller?.href, TALLER_LINK.href);
  });

  it("alarms Saturado only when the player said overwhelmed", () => {
    assert.deepEqual(deskCalmUmbral(defaultPulse, "overwhelmed"), {
      saturado: true,
      rojo: false,
      umbral: "saturado",
      alarm: true,
      taller: { href: TALLER_LINK.href, label: "Ver taller" },
    });
  });

  it("alarms Rojo without a taller (stop building)", () => {
    assert.deepEqual(deskCalmUmbral({ ...defaultPulse, coins: "down" }, "session"), {
      saturado: false,
      rojo: true,
      umbral: "rojo",
      alarm: true,
      taller: null,
    });
  });

  it("lets Rojo win the umbral when Saturado and Rojo are both on", () => {
    const calm = deskCalmUmbral(
      { ...defaultPulse, coins: "down", houses: "empty" },
      "overwhelmed",
    );
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
