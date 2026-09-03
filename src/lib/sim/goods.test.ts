import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GOOD_NAME_ES, goodNameEs } from "./goods.ts";
import type { GoodId } from "./types.ts";

const ALL_GOODS: readonly GoodId[] = [
  "wood",
  "timber",
  "fish",
  "wool",
  "work-clothes",
  "potato",
  "schnapps",
  "pigs",
  "sausages",
  "grain",
  "flour",
  "bread",
  "clay",
  "bricks",
  "iron",
  "coal",
  "steel",
  "steel-beams",
  "tallow",
  "soap",
  "sails",
  "weapons",
  "plantains",
  "fish-oil",
  "fried-plantains",
  "alpaca-wool",
  "ponchos",
  "sugar-cane",
  "rum",
  "canned-food",
  "sewing-machines",
  "fur-coats",
  "glasses",
  "coffee",
  "beer",
  "tortillas",
  "bowler-hats",
];

describe("GOOD_NAME_ES", () => {
  it("names every good in Spanish, not the raw English id", () => {
    for (const good of ALL_GOODS) {
      const name = GOOD_NAME_ES[good];
      assert.ok(name, `missing Spanish name for ${good}`);
      assert.notEqual(name, good);
    }
  });

  it("matches the wiki Spanish text already used in needs.ts/chains.ts", () => {
    assert.equal(goodNameEs("fish"), "Pescado");
    assert.equal(goodNameEs("work-clothes"), "Ropa de trabajo");
    assert.equal(goodNameEs("schnapps"), "Schnapps");
    assert.equal(goodNameEs("sausages"), "Salchichas");
  });

  it("falls back to the raw id when a good is unmapped", () => {
    assert.equal(goodNameEs("nonexistent" as GoodId), "nonexistent");
  });
});
