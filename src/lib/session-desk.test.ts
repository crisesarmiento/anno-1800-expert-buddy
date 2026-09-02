import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultPulse } from "./play.ts";
import { saturadoRojo, sessionChecklist } from "./session-desk.ts";

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
