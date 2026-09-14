import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { LiveSnapshot } from "./live/types.ts";
import {
  HOME_SATURATED_TIP_LINE,
  HOME_SATURATED_TIP_MS,
  homeWorkshopSaturated,
  pickHomeSaturatedTip,
  stampHomeSaturatedVisit,
} from "./home-saturated-tip.ts";

const src = readFileSync(new URL("./home-saturated-tip.ts", import.meta.url), "utf8");
const welcomeApp = readFileSync(new URL("../components/harbor-app.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");
const chips = readFileSync(new URL("../components/diary-chips.tsx", import.meta.url), "utf8");

function sliceFn(text: string, name: string) {
  const start = text.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const next = text.indexOf("\nfunction ", start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

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

const oversupply = snapshot({
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
const stats = { demand: { wood: 1 }, supply: { wood: 3 }, gap: { wood: 2 } };

describe("tip saturado en Campaign Home", () => {
  it("ofrece una sola línea en español: vendé lo que ya producís / frená", () => {
    assert.equal(HOME_SATURATED_TIP_MS, 10_000);
    assert.match(HOME_SATURATED_TIP_LINE, /vendé lo que ya producís/i);
    assert.match(HOME_SATURATED_TIP_LINE, /frená/i);
    assert.ok(HOME_SATURATED_TIP_LINE.length <= 140);
    const line = pickHomeSaturatedTip({
      saturated: true,
      shownAt: null,
      now: 0,
    });
    assert.equal(line, HOME_SATURATED_TIP_LINE);
  });

  it("enciende solo con clasificador saturado y pulseHint conocido", () => {
    assert.equal(homeWorkshopSaturated(oversupply, stats), true);
    assert.equal(homeWorkshopSaturated(oversupply), true);
    assert.equal(homeWorkshopSaturated({ ...oversupply, pulseHint: undefined }, stats), false);
    assert.equal(
      homeWorkshopSaturated(
        { ...oversupply, pulseHint: { coins: "unknown", houses: "unknown" } },
        stats,
      ),
      false,
    );
    assert.equal(
      homeWorkshopSaturated(
        snapshot({
          pulseHint: { coins: "up", houses: "ok" },
          telemetry: { goods: [{ id: "wood", name: "Madera", amount: 18 }] },
        }),
        { demand: { wood: 1 }, supply: { wood: 1.1 }, gap: { wood: 0.1 } },
      ),
      false,
    );
  });

  it("dura 10s, no se apila y no se repite en la misma visita", () => {
    const first = pickHomeSaturatedTip({ saturated: true, shownAt: null, now: 1000 });
    assert.equal(first, HOME_SATURATED_TIP_LINE);
    const shownAt = stampHomeSaturatedVisit(null, 1000, true);
    assert.equal(shownAt, 1000);
    assert.equal(pickHomeSaturatedTip({ saturated: true, shownAt, now: 1000 + 9_999 }), HOME_SATURATED_TIP_LINE);
    assert.equal(pickHomeSaturatedTip({ saturated: true, shownAt, now: 1000 + 10_000 }), null);
    assert.equal(stampHomeSaturatedVisit(shownAt, 20_000, true), shownAt);
    assert.equal(pickHomeSaturatedTip({ saturated: true, shownAt, now: 20_000 }), null);
    assert.equal(pickHomeSaturatedTip({ saturated: false, shownAt: null, now: 0 }), null);
  });
});

describe("Home no es comercio", () => {
  it("Welcome usa el picker y no lista bienes ni pinta rojo si unknown", () => {
    const home = sliceFn(welcomeApp, "Welcome");
    assert.match(home, /pickHomeSaturatedTip|useHomeSaturatedTip/);
    assert.match(home, /data-home-saturated-tip/);
    assert.doesNotMatch(home, /classifyWorkshopGoods\(/);
    assert.doesNotMatch(home, /status === \"saturado\"/);
    assert.doesNotMatch(home, /goods\.map/);
    assert.equal((home.match(/data-esto-ahora-item/g) ?? []).length, 1);
  });

  it("no hay traders, grilla de precios ni rutas FileDB inventadas", () => {
    const home = sliceFn(welcomeApp, "Welcome");
    assert.doesNotMatch(home, /trader|priceGrid|price-grid|tradeRoute|FileDB|\/comercio/i);
    assert.doesNotMatch(src, /trader|priceGrid|tradeRoute|FileDB/i);
    assert.doesNotMatch(desk, /trader|priceGrid|price-grid|tradeRoute|\/comercio/i);
  });

  it("el chip Comercio sigue siendo Taller", () => {
    assert.match(welcomeApp, /to=\"\/taller\"/);
    assert.match(welcomeApp, />\s*Taller\s*</);
    assert.doesNotMatch(welcomeApp, /to=\"\/comercio\"/);
    assert.doesNotMatch(chips, /\/comercio|trader|price/i);
  });
});
