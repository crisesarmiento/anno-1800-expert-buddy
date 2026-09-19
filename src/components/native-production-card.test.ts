import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { UI } from "../lib/i18n.ts";

const card = readFileSync(new URL("./native-production-card.tsx", import.meta.url), "utf8");

describe("NativeProductionCard — seal from nativeProbe + derived freshness", () => {
  it("derives its state from nativeCardState and staleness from isOcrSampleStale, not raw fields", () => {
    assert.match(card, /from "@\/lib\/native-probe-copy"/);
    assert.match(card, /nativeCardState\(connection\)/);
    assert.match(card, /from "@\/lib\/native-freshness"/);
    assert.match(card, /isOcrSampleStale\(/);
  });

  it("never says the server is not installed, and never shows a starting state", () => {
    assert.doesNotMatch(card, /no está instalado/i);
    assert.doesNotMatch(card, /"starting"/);
    assert.doesNotMatch(card, /wrong_view/);
  });

  it("marks OCR readings Confirmed and the recommendation Inferred", () => {
    assert.match(card, /t\.nativeProbe\.confirmed/);
    assert.match(card, /t\.nativeProbe\.inferred/);
  });

  it("marks a disconnected-but-evidenced state as historical, never dropping the last observation", () => {
    assert.match(card, /cardState === "historical"/);
    assert.match(card, /t\.nativeProbe\.historical/);
  });

  it("gives screen guidance for population/unknown views instead of a diagnostic label", () => {
    assert.match(card, /t\.nativeProbe\.populationGuidance/);
    assert.match(card, /t\.nativeProbe\.unknownGuidance/);
  });

  it("every locale defines the nativeProbe copy the card reads", () => {
    for (const dict of Object.values(UI)) {
      assert.equal(typeof dict.nativeProbe.unreachable, "string");
      assert.equal(typeof dict.nativeProbe.historical, "string");
      assert.equal(typeof dict.nativeProbe.populationGuidance, "string");
      assert.equal(typeof dict.nativeProbe.unknownGuidance, "string");
      assert.equal(typeof dict.nativeProbe.confirmed, "string");
      assert.equal(typeof dict.nativeProbe.inferred, "string");
      assert.equal(typeof dict.nativeProbe.stale, "string");
    }
  });
});
