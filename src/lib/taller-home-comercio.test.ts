import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import type { LiveSnapshot } from "./live/types.ts";
import {
  HOME_SATURATED_TIP_LINE,
  HOME_SATURATED_TIP_MS,
  homeWorkshopSaturated,
  pickHomeSaturatedTip,
  stampHomeSaturatedVisit,
} from "./home-saturated-tip.ts";
import {
  classifyWorkshopGoods,
  workshopGoodPaint,
  workshopSaturatedSignal,
} from "./workshop-balance.ts";

const libDir = dirname(fileURLToPath(import.meta.url));
const srcDir = dirname(libDir);
const componentDir = join(srcDir, "components");
const routeDir = join(srcDir, "routes");
const app = readFileSync(join(componentDir, "harbor-app.tsx"), "utf8");
const bench = readFileSync(join(componentDir, "taller-bench.tsx"), "utf8");
const balance = readFileSync(join(componentDir, "taller-goods-balance.tsx"), "utf8");
const routeTree = readFileSync(join(srcDir, "routeTree.gen.ts"), "utf8");

function archivosTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return archivosTsx(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function funcion(src: string, name: string): string {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `falta ${name}`);
  const next = src.indexOf("\nfunction ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
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

describe("Comercio: balance observado sin rutas inventadas", () => {
  it("clasifica bienes vistos como falta, alcanza y saturado usando stock, cadena y sim", () => {
    const rows = classifyWorkshopGoods({
      snapshot: snapshot({
        pulseHint: { coins: "up", houses: "ok" },
        telemetry: {
          goods: [
            { id: "fish", name: "Pescado", amount: 2 },
            { id: "clothes", name: "Ropa de trabajo", amount: 18 },
            { id: "wood", name: "Madera", amount: 80 },
          ],
          chains: [
            { id: "clothes", name: "Ropa de trabajo" },
            { id: "wood", name: "Madera" },
          ],
          buildings: [
            { id: "lumberjack", name: "Leñador", count: 6 },
            { id: "sawmill", name: "Aserradero", count: 3 },
          ],
        },
      }),
      stats: {
        demand: { fish: 1, clothes: 1, wood: 1 },
        supply: { fish: 0, clothes: 1.1, wood: 3 },
        gap: { fish: -1, clothes: 0.1, wood: 2 },
      },
    });

    assert.deepEqual(rows, [
      { goodId: "fish", status: "falta" },
      { goodId: "clothes", status: "alcanza" },
      { goodId: "wood", status: "saturado" },
    ]);
  });

  it("omite todo bien no visto y no depende de precios, traders ni FileDB", () => {
    const rows = classifyWorkshopGoods({
      snapshot: snapshot({ telemetry: { goods: [{ id: "fish", name: "Pescado", amount: 2 }] } }),
      stats: {
        demand: { fish: 1, wood: 1 },
        supply: { fish: 0, wood: 3 },
        gap: { fish: -1, wood: 2 },
      },
    });
    assert.deepEqual(rows, [{ goodId: "fish", status: "falta" }]);
    assert.doesNotMatch(balance, /price-grid|trader|tradeRoute|FileDB|fetch\(|\/api\//i);
  });

  it("pulseHint desconocido nunca pinta rojo ni habilita el tip", () => {
    const rows = classifyWorkshopGoods({ snapshot: saturado, stats: simSaturado });
    const unknown = { coins: "unknown", houses: "unknown" } as const;
    assert.equal(rows[0]?.status, "saturado");
    assert.equal(workshopGoodPaint("saturado", unknown), "none");
    assert.equal(workshopSaturatedSignal(rows, unknown), false);
    assert.equal(homeWorkshopSaturated({ ...saturado, pulseHint: unknown }, simSaturado), false);
  });
});

describe("Taller: grilla de estado solo en /taller", () => {
  it("monta una fila por bien visto con copy Falta, Alcanza o Saturado", () => {
    assert.match(bench, /<TallerGoodsBalance\s*\/>/);
    assert.match(balance, /rows\.map/);
    assert.match(balance, /data-taller-seen-good=/);
    assert.match(balance, /data-taller-seen-status=/);
    assert.match(balance, /Falta/);
    assert.match(balance, /Alcanza/);
    assert.match(balance, /Saturado/);
    assert.match(balance, /rows\.length === 0\) return null/);
  });

  it("no monta la grilla de estados fuera de Taller", () => {
    const permitidos = new Set([
      "components/taller-bench.tsx",
      "components/taller-goods-balance.tsx",
    ]);
    for (const path of [...archivosTsx(componentDir), ...archivosTsx(routeDir)]) {
      const name = relative(srcDir, path);
      if (permitidos.has(name)) continue;
      const src = readFileSync(path, "utf8");
      assert.doesNotMatch(
        src,
        /<TallerGoodsBalance\b|data-taller-seen-(?:goods|good|status)/,
        name,
      );
    }
  });

  it("el chip Comercio sigue entrando a Taller y no existe /comercio", () => {
    assert.match(app, /to="\/taller"[\s\S]*?>\s*Taller\s*</);
    assert.doesNotMatch(app, /to="\/comercio"/);
    assert.doesNotMatch(routeTree, /['"]\/comercio['"]/);
  });
});

describe("Campaign Home: un solo tip de freno durante diez segundos", () => {
  it("muestra exactamente el copy español enviado", () => {
    assert.equal(HOME_SATURATED_TIP_LINE, "Vendé lo que ya producís. Frená.");
    assert.equal(HOME_SATURATED_TIP_MS, 10_000);
  });

  it("ofrece como máximo un tip por visita y vence a los diez segundos", () => {
    const primero = pickHomeSaturatedTip({ saturated: true, shownAt: null, now: 1_000 });
    const sello = stampHomeSaturatedVisit(null, 1_000, primero != null);
    assert.equal(primero, HOME_SATURATED_TIP_LINE);
    assert.equal(
      pickHomeSaturatedTip({ saturated: true, shownAt: sello, now: 10_999 }),
      HOME_SATURATED_TIP_LINE,
    );
    assert.equal(pickHomeSaturatedTip({ saturated: true, shownAt: sello, now: 11_000 }), null);
    assert.equal(stampHomeSaturatedVisit(sello, 12_000, true), sello);
    assert.equal(pickHomeSaturatedTip({ saturated: true, shownAt: sello, now: 12_000 }), null);
  });

  it("ocupa el único Esto ahora de Home sin apilar otro tip", () => {
    const home = funcion(app, "Welcome");
    assert.equal((home.match(/data-home-saturated-tip=/g) ?? []).length, 1);
    assert.equal((home.match(/data-esto-ahora-item=/g) ?? []).length, 1);
    assert.match(home, /saturatedTip\s*\?/);
    assert.match(home, /:\s*campaignTip\?\.kind === "chip"/);
  });

  it("no muestra el tip saturado fuera de Campaign Home o Esto ahora del desk", () => {
    const permitidos = new Set([
      "components/harbor-app.tsx",
      "components/home-saturated-tip.tsx",
      "components/session-desk.tsx",
    ]);
    for (const path of [...archivosTsx(componentDir), ...archivosTsx(routeDir)]) {
      const name = relative(srcDir, path);
      if (permitidos.has(name)) continue;
      const src = readFileSync(path, "utf8");
      assert.doesNotMatch(
        src,
        /useHomeSaturatedTip|data-home-saturated-tip|HOME_SATURATED_TIP_/,
        name,
      );
    }
  });

  it("Home no renderiza traders ni una grilla de precios", () => {
    const home = funcion(app, "Welcome");
    assert.doesNotMatch(home, /trader|priceGrid|price-grid|tradeRoute|FileDB|\/comercio/i);
    assert.doesNotMatch(home, /goods\.map|data-taller-seen-(?:goods|good|status)/);
  });
});
