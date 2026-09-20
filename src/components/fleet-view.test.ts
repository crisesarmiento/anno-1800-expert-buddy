import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { UI } from "../lib/i18n.ts";

const card = readFileSync(new URL("./fleet-view.tsx", import.meta.url), "utf8");
const economy = readFileSync(new URL("./taller-economy.tsx", import.meta.url), "utf8");
const bench = readFileSync(new URL("./taller-bench.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("./harbor-app.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("./editorial-home.tsx", import.meta.url), "utf8");

describe("Taller fleet view", () => {
  it("lives on Taller as a secondary view, never Home or Diario", () => {
    assert.match(bench, /FleetViewCard/);
    assert.match(card, /data-taller-fleet/);
    assert.match(economy, /data-economy-fleet-upkeep/);
    assert.doesNotMatch(app, /FleetViewCard|data-taller-fleet/);
    assert.doesNotMatch(home, /FleetViewCard|data-taller-fleet/);
  });

  it("never labels escort surplus or promises combat", () => {
    assert.match(card, /t\.fleet\.noSurplus/);
    assert.match(card, /t\.fleet\.noDismantle/);
    assert.match(card, /t\.fleet\.noCombat/);
    assert.match(card, /t\.fleet\.noAuto/);
    assert.match(card, /data-fleet-surplus/);
    assert.doesNotMatch(card, /desarm|win the fight|ganá el combate/i);
  });

  it("defines fleet copy in every locale", () => {
    for (const dict of Object.values(UI)) {
      assert.equal(typeof dict.fleet.risk, "string");
      assert.match(dict.fleet.risk, /no evaluable|not evaluable|non valutabile|nicht bewertbar/i);
      assert.equal(typeof dict.fleet.noSurplus, "string");
      assert.equal(typeof dict.fleet.noAuto, "string");
      assert.equal(typeof dict.economy.fleetUpkeep, "string");
    }
  });
});
