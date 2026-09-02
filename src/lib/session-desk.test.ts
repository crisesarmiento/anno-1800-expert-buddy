import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { saturadoRojo, sessionNowItem } from "./session-desk.ts";

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
