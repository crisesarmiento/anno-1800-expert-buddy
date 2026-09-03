import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CAMPAIGN_TIP_CHIP,
  CAMPAIGN_TIPS_SCHEMA,
  campaignTips,
  filterSeenTips,
  liveTipFamily,
  pickCampaignTip,
  regionArrived,
  tenSecondLine,
} from "./campaign-tips.ts";
import type { LiveSnapshot } from "./live/types.ts";
import fixture from "./live/fixture.json" with { type: "json" };

const seedRaw = readFileSync(new URL("./data/campaign-tips.json", import.meta.url), "utf8");
const welcome = readFileSync(new URL("../components/harbor-app.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");
const tipsSrc = readFileSync(new URL("./campaign-tips.ts", import.meta.url), "utf8");

const RATIO = /\d+\s*:\s*\d+/;
const WIKI = /wiki|fandom|https?:\/\//i;

function snapshot(over: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    ...(fixture as LiveSnapshot),
    ...over,
    pulseHint: over.pulseHint ?? (fixture as LiveSnapshot).pulseHint,
    telemetry: over.telemetry ?? (fixture as LiveSnapshot).telemetry,
  };
}

describe("campaign tip seed", () => {
  it("loads a static Spanish seed with terrain, org, and economy families", () => {
    assert.match(seedRaw, new RegExp(CAMPAIGN_TIPS_SCHEMA));
    assert.ok(campaignTips.length >= 8);
    assert.ok(campaignTips.length <= 24);
    const cats = new Set(campaignTips.map((tip) => tip.category));
    assert.ok(cats.has("terrain"));
    assert.ok(cats.has("org"));
    assert.ok(cats.has("economy"));
    for (const tip of campaignTips) {
      assert.match(tip.line, /\b(el|la|de|no|que|este|ya|pará|llená|vendé)\b/i, tip.id);
      assert.doesNotMatch(tip.line, RATIO);
      assert.doesNotMatch(tip.line, WIKI);
      assert.ok(tip.line.length <= 140, tip.id);
    }
  });

  it("does not scrape wiki, parse missions, or rank on the internet", () => {
    assert.doesNotMatch(tipsSrc, /fetch\(|wikiCatalog|missionsById|missions\.find/);
    assert.doesNotMatch(tipsSrc, /mission\.do/);
  });
});

describe("live family from harbor-live thresholds", () => {
  it("maps balance red to coins, saturation to brake, island to applies-now", () => {
    assert.equal(liveTipFamily(null), null);
    assert.equal(liveTipFamily(snapshot({ pulseHint: { coins: "down", houses: "ok" } })), "coins");
    assert.equal(liveTipFamily(snapshot({ pulseHint: { coins: "up", houses: "yellow" } })), "brake");
    assert.equal(liveTipFamily(snapshot({ pulseHint: { coins: "up", houses: "empty" } })), "brake");
    assert.equal(
      liveTipFamily(
        snapshot({
          pulseHint: { coins: "up", houses: "ok" },
          telemetry: { islands: [{ id: "bright-sands", name: "Bright Sands" }] },
        }),
      ),
      "applies-now",
    );
    assert.equal(
      liveTipFamily(
        snapshot({
          pulseHint: { coins: "unknown", houses: "unknown" },
          telemetry: { buildings: [{ id: "marketplace", name: "Mercado" }] },
        }),
      ),
      null,
    );
  });

  it("lets red balance win over saturation", () => {
    assert.equal(liveTipFamily(snapshot({ pulseHint: { coins: "down", houses: "yellow" } })), "coins");
  });
});

describe("already-seen Scout+Story filter", () => {
  it("hides New World, Arctic, and Enbesa until diary or chip says arrived", () => {
    const live = snapshot({
      pulseHint: { coins: "up", houses: "ok" },
      telemetry: { islands: [{ id: "bright-sands", name: "Bright Sands" }] },
    });
    const ids = filterSeenTips("applies-now", { snapshot: live }).map((tip) => tip.id);
    assert.ok(ids.includes("ow-terrain-scout"));
    assert.equal(ids.includes("nw-terrain-home"), false);
    assert.equal(ids.includes("arctic-terrain-wait"), false);
    assert.equal(ids.includes("enbesa-org-wait"), false);
    assert.equal(regionArrived("new-world", "Bright Sands"), false);
    assert.equal(regionArrived("new-world", "ch3-hand Isabel"), true);
    assert.equal(regionArrived("arctic", "arrived:arctic"), true);
    assert.equal(regionArrived("enbesa", "Enbesa"), true);
  });

  it("keeps Kahina org tips until she is in the live hits", () => {
    const bare = snapshot({
      pulseHint: { coins: "up", houses: "ok" },
      telemetry: { islands: [{ id: "bright-sands", name: "Bright Sands" }] },
    });
    const withKahina = snapshot({
      pulseHint: { coins: "up", houses: "ok" },
      telemetry: {
        islands: [{ id: "bright-sands", name: "Bright Sands" }],
        people: [{ id: "kahina", name: "Madame Kahina" }],
      },
    });
    assert.equal(
      filterSeenTips("applies-now", { snapshot: bare }).some((tip) => tip.id === "ow-org-kahina"),
      false,
    );
    assert.equal(
      filterSeenTips("applies-now", { snapshot: withKahina }).some((tip) => tip.id === "ow-org-kahina"),
      true,
    );
  });
});

describe("one 10s tip or one chip", () => {
  it("returns a single Esto ahora line, never a list of 12", () => {
    const pick = pickCampaignTip({ snapshot: snapshot() });
    assert.ok(pick);
    assert.equal(pick.kind, "esto-ahora");
    assert.equal(pick.family, "coins");
    assert.equal(pick.id, "ow-coins-stop");
    assert.ok(!Array.isArray(pick.line));
    assert.equal(tenSecondLine("1:1 acero").includes(":"), false);
  });

  it("falls back to one chip when the family has nothing already seen", () => {
    const pick = pickCampaignTip({
      snapshot: snapshot({
        pulseHint: { coins: "up", houses: "ok" },
        telemetry: { islands: [{ id: "ghost", name: "Ghost Cay" }] },
        quests: [],
      }),
      stamps: [],
    });
    assert.deepEqual(pick, {
      kind: "chip",
      family: "applies-now",
      id: null,
      line: CAMPAIGN_TIP_CHIP,
    });
  });

  it("does not pick without live thresholds", () => {
    assert.equal(pickCampaignTip({ snapshot: null }), null);
  });
});

describe("Home surfaces one tip", () => {
  it("wires Welcome and the session desk to pickCampaignTip, not a mapped list", () => {
    assert.match(welcome, /pickCampaignTip/);
    assert.match(desk, /pickCampaignTip/);
    assert.doesNotMatch(welcome, /campaignTips\.map/);
    assert.doesNotMatch(desk, /campaignTips\.map/);
    assert.match(welcome, /data-campaign-tip-chip/);
    assert.match(desk, /data-campaign-tip-chip/);
  });
});
