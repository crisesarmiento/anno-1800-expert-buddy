import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CONSTRUCTION_TIP_DEFAULT_LAYOUT_ID,
  constructionLayoutIdForIsland,
  constructionTipLine,
} from "./construction-tip.ts";
import { layoutsById } from "./data/layouts.ts";
import { scopeEstoAhoraLine } from "./island-focus.ts";

const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");

const RATIO = /\d+\s*:\s*\d+/;
const WIKI = /wiki|fandom|ubisoft|https?:\/\//i;

describe("construction tip scoped to the focused island", () => {
  it("returns a layout-backed line for the seeded island", () => {
    const line = constructionTipLine("la-inapetente");
    assert.ok(line);
    assert.equal(constructionLayoutIdForIsland("la-inapetente"), "first-city");
    assert.equal(line, layoutsById["first-city"]?.hint);
  });

  it("falls back to the calm 10x10 stamp default for an island with no override", () => {
    assert.equal(constructionLayoutIdForIsland("bright-sands"), CONSTRUCTION_TIP_DEFAULT_LAYOUT_ID);
    const line = constructionTipLine("bright-sands");
    assert.equal(line, layoutsById[CONSTRUCTION_TIP_DEFAULT_LAYOUT_ID]?.hint);
  });

  it("never invents an island name inside the raw line — only the Esto ahora scope adds it", () => {
    const line = constructionTipLine("la-inapetente") ?? "";
    assert.doesNotMatch(line, /la inapetente|bright sands/i);
    const scoped = scopeEstoAhoraLine("la-inapetente", line);
    assert.match(scoped, /^La Inapetente:/);
  });

  it("changes when the island focus changes", () => {
    const a = constructionTipLine("la-inapetente");
    const b = constructionTipLine("bright-sands");
    assert.notEqual(a, b);
  });
});

describe("construction tip is capped and wiki/ratio-free", () => {
  it("caps every layout hint at the 10s length and never carries a ratio or a wiki link", () => {
    for (const layout of Object.values(layoutsById)) {
      assert.ok(layout.hint.length <= 140, layout.id);
      assert.doesNotMatch(layout.hint, RATIO, layout.id);
      assert.doesNotMatch(layout.hint, WIKI, layout.id);
    }
  });

  it("runs every line through tenSecondLine so a future longer hint still gets capped", () => {
    const src = readFileSync(new URL("./construction-tip.ts", import.meta.url), "utf8");
    assert.match(src, /tenSecondLine/);
  });
});

describe("session desk prefers the construction tip over a non-urgent campaign tip", () => {
  it("wires constructionTipLine in and only clears it when a coins/brake tip is urgent", () => {
    assert.match(desk, /constructionTipLine/);
    assert.match(desk, /data-construction-tip-line/);
    assert.match(desk, /family === "coins" \|\| campaignTip\.family === "brake"/);
    assert.match(
      desk,
      /constructionTip = urgentCampaignTip \|\| saturatedTip \? null : constructionTipLine\(islandId\)/,
    );
  });

  it("keeps the diary free of wiki ratios, nextBuild chains, or building counts", () => {
    assert.doesNotMatch(desk, /nextBuild|NiHoel/);
    assert.doesNotMatch(desk, RATIO);
  });
});
