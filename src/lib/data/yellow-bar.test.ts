import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  YELLOW_BAR_NEEDS,
  YELLOW_BAR_ZONES,
  decodeYellowBar,
  yellowBarDecoder,
} from "./yellow-bar.ts";

const RECIPE_MARK = /\+|→|->|\bt\/min\b|\bpor minuto\b|\d+\s*:\s*\d+|\bratio\b/i;

describe("yellowBarDecoder", () => {
  it("is exactly six rows, one per P0 chip", () => {
    assert.equal(yellowBarDecoder.length, 6);
    assert.deepEqual(
      yellowBarDecoder.map((row) => row.need),
      [...YELLOW_BAR_NEEDS],
    );
  });

  it("maps each need to one building and one allowed zone", () => {
    for (const row of yellowBarDecoder) {
      assert.equal(typeof row.building, "string");
      assert.ok(row.building.length > 0);
      assert.ok(!row.building.includes(" y "));
      assert.ok(!RECIPE_MARK.test(row.building));
      assert.ok(
        (YELLOW_BAR_ZONES as readonly string[]).includes(row.zone),
        row.need,
      );
    }
  });

  it("treats Schnapps and Taberna as luxury income, never required chains", () => {
    const luxury = yellowBarDecoder.filter((row) => row.luxury).map((row) => row.need);
    assert.deepEqual(luxury, ["Schnapps", "Taberna"]);
    for (const row of yellowBarDecoder) {
      assert.ok(!RECIPE_MARK.test(JSON.stringify(row)));
    }
  });

  it("pins the glanceable placements", () => {
    assert.deepEqual(decodeYellowBar("Mercado"), {
      need: "Mercado",
      building: "Mercado",
      zone: "10x10",
      luxury: false,
    });
    assert.deepEqual(decodeYellowBar("Pescado"), {
      need: "Pescado",
      building: "Pescadería",
      zone: "costa",
      luxury: false,
    });
    assert.deepEqual(decodeYellowBar("Ropa"), {
      need: "Ropa",
      building: "Telares",
      zone: "10x10",
      luxury: false,
    });
    assert.deepEqual(decodeYellowBar("Schnapps"), {
      need: "Schnapps",
      building: "Destilería de Schnapps",
      zone: "10x10",
      luxury: true,
    });
    assert.deepEqual(decodeYellowBar("Taberna"), {
      need: "Taberna",
      building: "Taberna",
      zone: "10x10",
      luxury: true,
    });
    assert.deepEqual(decodeYellowBar("calle"), {
      need: "calle",
      building: "Calle",
      zone: "10x10",
      luxury: false,
    });
  });

  it("accepts screenshot-style aliases and rejects unknown chips", () => {
    assert.equal(decodeYellowBar("  ROPA DE TRABAJO  ")?.need, "Ropa");
    assert.equal(decodeYellowBar("Pescado")?.zone, "costa");
    assert.equal(decodeYellowBar("calles")?.building, "Calle");
    assert.equal(decodeYellowBar("pan"), null);
    assert.equal(decodeYellowBar(""), null);
  });
});
