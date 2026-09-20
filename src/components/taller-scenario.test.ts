import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { UI } from "../lib/i18n.ts";

const card = readFileSync(new URL("./taller-scenario.tsx", import.meta.url), "utf8");
const bench = readFileSync(new URL("./taller-bench.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("./harbor-app.tsx", import.meta.url), "utf8");

describe("Taller produce-or-import", () => {
  it("lives on Taller, never Home", () => {
    assert.match(bench, /TallerScenarioCard/);
    assert.match(card, /data-taller-scenario/);
    assert.match(card, /observeScenario/);
    assert.match(card, /compareScenarios/);
    assert.doesNotMatch(app, /TallerScenarioCard|data-taller-scenario/);
  });

  it("lets the player pick island and good, and allows a missing-data verdict", () => {
    assert.match(card, /data-taller-scenario-island/);
    assert.match(card, /data-taller-scenario-good/);
    assert.match(card, /data-taller-scenario-verdict/);
    assert.match(card, /data-taller-scenario-next/);
    assert.match(card, /t\.scenario\.verdictMissing/);
    assert.match(card, /t\.scenario\.stockNotSurplus/);
    assert.match(card, /t\.scenario\.noCut/);
  });

  it("defines scenario copy in every locale", () => {
    for (const dict of Object.values(UI)) {
      assert.equal(typeof dict.scenario.verdictMissing, "string");
      assert.equal(typeof dict.scenario.nextDatum, "string");
      assert.equal(typeof dict.scenario.expandLocal, "string");
      assert.equal(typeof dict.scenario.transport, "string");
    }
  });
});
