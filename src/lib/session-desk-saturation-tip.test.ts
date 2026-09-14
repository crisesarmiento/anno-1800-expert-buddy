import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { LiveSnapshot } from "./live/types.ts";
import {
  HOME_SATURATED_TIP_LINE,
  homeWorkshopSaturated,
  pickHomeSaturatedTip,
} from "./home-saturated-tip.ts";
import { scopeEstoAhoraLine } from "./island-focus.ts";

const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");

function snapshot(over: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    source: "save",
    updatedAt: "2026-09-14T00:00:00.000Z",
    game: "anno-1800",
    quests: [],
    ...over,
  };
}

const saturado = snapshot({
  pulseHint: { coins: "up", houses: "ok" },
  telemetry: {
    goods: [{ id: "wood", name: "Madera", amount: 80 }],
    chains: [{ id: "wood", name: "Madera" }],
    buildings: [
      { id: "lumberjack", name: "Leñador", count: 6 },
      { id: "sawmill", name: "Aserradero", count: 3 },
    ],
  },
});
const simSaturado = { demand: { wood: 1 }, supply: { wood: 3 }, gap: { wood: 2 } };

describe("Esto, ahora priority on the session desk", () => {
  it("wires the saturation tip in, ranked between the urgent campaign tip and the construction tip", () => {
    assert.match(desk, /useHomeSaturatedTip/);
    assert.match(desk, /data-home-saturated-tip/);
    const urgentIdx = desk.indexOf("const urgentCampaignTip =");
    const saturatedIdx = desk.indexOf(
      "const saturatedTip = urgentCampaignTip ? null : homeSaturatedTip;",
    );
    const constructionIdx = desk.indexOf(
      "const constructionTip = urgentCampaignTip || saturatedTip ? null : constructionTipLine(islandId);",
    );
    const activeLineIdx = desk.indexOf("const activeLine =");
    assert.ok(urgentIdx >= 0 && saturatedIdx >= 0 && constructionIdx >= 0 && activeLineIdx >= 0);
    assert.ok(urgentIdx < saturatedIdx, "urgent tip must be resolved before the saturation tip");
    assert.ok(
      saturatedIdx < constructionIdx,
      "saturation tip must outrank the construction tip",
    );
    assert.ok(constructionIdx < activeLineIdx);
  });

  it("resolves activeLine coins/brake first, then saturation, then construction, then the rest", () => {
    const activeLineBlock = desk.slice(
      desk.indexOf("const activeLine ="),
      desk.indexOf("const scopedLine ="),
    );
    const order = [
      "urgentCampaignTip",
      "saturatedTip",
      "constructionTip",
      "campaignTip?.line",
      "now?.text",
      "ESTO_AHORA_IDLE",
    ];
    let cursor = -1;
    for (const token of order) {
      const idx = activeLineBlock.indexOf(token);
      assert.ok(idx > cursor, `${token} out of priority order`);
      cursor = idx;
    }
  });

  it("stays silent when pulseHint is unknown — never invents a saturation signal", () => {
    const unknown = { coins: "unknown", houses: "unknown" } as const;
    assert.equal(homeWorkshopSaturated({ ...saturado, pulseHint: unknown }, simSaturado), false);
    assert.equal(homeWorkshopSaturated({ ...saturado, pulseHint: undefined }, simSaturado), false);
    assert.equal(pickHomeSaturatedTip({ saturated: false, shownAt: null, now: 0 }), null);
  });

  it("shows the Spanish sell/brake line when saturated, scoped to the focused island", () => {
    const line = pickHomeSaturatedTip({ saturated: true, shownAt: null, now: 0 });
    assert.equal(line, HOME_SATURATED_TIP_LINE);
    const scoped = scopeEstoAhoraLine("la-inapetente", line ?? "");
    assert.match(scoped, /^La Inapetente:/);
    assert.doesNotMatch(line ?? "", /trader|precio|vend[ée] a\b/i);
  });

  it("never invents tradeRoutes, FileDB routes, or a Home goods grid on the desk", () => {
    assert.doesNotMatch(
      desk,
      /trader|priceGrid|price-grid|tradeRoute|FileDB|goods\.map|data-taller-seen-(?:goods|good|status)/i,
    );
  });
});
