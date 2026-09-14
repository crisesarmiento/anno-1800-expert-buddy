import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { pickCampaignTip } from "./campaign-tips.ts";
import type { LiveBuildingHit, LiveSnapshot } from "./live/types.ts";
import fixture from "./live/fixture.json" with { type: "json" };

const app = readFileSync(new URL("../components/harbor-app.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");
const chips = readFileSync(new URL("../components/diary-chips.tsx", import.meta.url), "utf8");
const live = readFileSync(new URL("../components/live-panel.tsx", import.meta.url), "utf8");
const surface = readFileSync(new URL("../components/session-desk-surface.tsx", import.meta.url), "utf8");
const ahora = readFileSync(new URL("../components/esto-ahora.tsx", import.meta.url), "utf8");
const homeRoute = readFileSync(new URL("../routes/index.tsx", import.meta.url), "utf8");
const sheets = readFileSync(new URL("../components/desk-sheets/desk-disclosure-panels.tsx", import.meta.url), "utf8");
const place = readFileSync(new URL("../components/desk-sheets/place-panel.tsx", import.meta.url), "utf8");
const stamp = readFileSync(new URL("../components/desk-sheets/stamp-panel.tsx", import.meta.url), "utf8");
const tips = readFileSync(new URL("./campaign-tips.ts", import.meta.url), "utf8");
const bench = readFileSync(new URL("../components/taller-bench.tsx", import.meta.url), "utf8");
const city = readFileSync(new URL("../components/taller-city.tsx", import.meta.url), "utf8");

function sliceFn(src: string, name: string) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const next = src.indexOf("\nfunction ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

const COUNT_UI = /telemetry\.buildings[\s\S]{0,200}\.count|\.count\b[\s\S]{0,80}telemetry\.buildings/;
const BUILDING_COUNT_FIELD = /row\.count|hit\.count|building\.count|item\.count/;

describe("Home/diary never consume building grids or counts", () => {
  it("keeps BlockGrid and building lists off Welcome, diary chips, live strip, and the one-card desk", () => {
    const welcome = sliceFn(app, "Welcome");
    const harbor = sliceFn(app, "HarborApp");
    const legacyDesk = sliceFn(app, "SessionDesk");
    for (const src of [welcome, harbor, desk, chips, live, ahora, homeRoute]) {
      assert.doesNotMatch(src, /BlockGrid|HarborRoute/);
      assert.doesNotMatch(src, COUNT_UI);
      assert.doesNotMatch(src, /TallerCity|data-taller-production-building|data-taller-city/);
    }
    assert.doesNotMatch(legacyDesk, /BlockGrid|HarborRoute/);
    assert.doesNotMatch(legacyDesk, /resolved\.buildings|setBuildingId|buildingStamp/);
    assert.doesNotMatch(desk, /telemetry\?\.buildings|liveSnapshot\?\.telemetry\?\.buildings/);
    assert.doesNotMatch(surface, /telemetry\?\.buildings|liveSnapshot\?\.telemetry/);
  });

  it("lets companion sheets keep campaign stamps, never live counts", () => {
    assert.match(sheets, /DeskDisclosurePanels/);
    assert.match(stamp, /BlockGrid/);
    assert.doesNotMatch(stamp, /liveSnapshot|telemetry/);
    assert.doesNotMatch(place, /liveSnapshot|telemetry|\.count/);
    assert.doesNotMatch(sheets, /liveSnapshot|telemetry|\.count/);
  });

  it("leaves Taller free to read telemetry.buildings and city counts", () => {
    assert.match(bench, /live\?\.telemetry\?\.buildings/);
    assert.match(city, /data-taller-production-building/);
    assert.match(city, /seedIsland\.buildings/);
  });

  it("matches diary tips on building id/name only, never count", () => {
    assert.match(tips, /row\.id, row\.name/);
    assert.doesNotMatch(tips, BUILDING_COUNT_FIELD);
    const buildings: LiveBuildingHit[] = [
      { id: "lumberjack", name: "Lumberjack's Hut", count: 77 },
    ];
    const snapshot: LiveSnapshot = {
      ...(fixture as LiveSnapshot),
      pulseHint: { coins: "down", houses: "ok" },
      telemetry: { buildings },
    };
    const pick = pickCampaignTip({ snapshot });
    assert.ok(pick);
    assert.doesNotMatch(pick.line, /\b77\b/);
  });
});
