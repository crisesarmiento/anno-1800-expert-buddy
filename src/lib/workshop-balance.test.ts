import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { compute, parseCitySeed } from "./sim/index.ts";
import campaignCh1 from "./sim/fixtures/campaign-ch1.json" with { type: "json" };
import type { LiveSnapshot } from "./live/types.ts";
import {
  classifyWorkshopGoods,
  workshopGoodPaint,
  workshopSaturatedSignal,
} from "./workshop-balance.ts";

const src = readFileSync(new URL("./workshop-balance.ts", import.meta.url), "utf8");

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

describe("clasificador de taller: solo bienes vistos", () => {
  it("devuelve vacío si no hay telemetry.goods", () => {
    const stats = compute(parseCitySeed(campaignCh1));
    assert.deepEqual(
      classifyWorkshopGoods({
        snapshot: snapshot({ telemetry: { buildings: [{ id: "lumberjack", name: "Leñador" }] } }),
        stats,
      }),
      [],
    );
  });

  it("omite bienes del sim que el jugador no vio", () => {
    const stats = compute(parseCitySeed(campaignCh1));
    const rows = classifyWorkshopGoods({
      snapshot: snapshot({
        pulseHint: { coins: "up", houses: "ok" },
        telemetry: { goods: [{ id: "wood", name: "Madera", amount: 20 }] },
      }),
      stats,
    });
    assert.equal(rows.every((row) => row.goodId === "wood"), true);
    assert.equal(rows.some((row) => row.goodId === "fish"), false);
  });
});

describe("clasificador: falta / alcanza / saturado", () => {
  it("marca falta cuando el stock es bajo, la cadena no pega y el sim pide más", () => {
    const rows = classifyWorkshopGoods({
      snapshot: snapshot({
        pulseHint: { coins: "up", houses: "ok" },
        telemetry: {
          goods: [{ id: "fish", name: "Pescado", amount: 2 }],
          chains: [],
          buildings: [{ id: "marketplace", name: "Mercado", count: 1 }],
        },
      }),
      stats: { demand: { fish: 1 }, supply: { fish: 0 }, gap: { fish: -1 } },
    });
    assert.deepEqual(rows, [{ goodId: "fish", status: "falta" }]);
  });

  it("marca alcanza con stock modesto, cadena de campaña y sim en holgura chica", () => {
    const rows = classifyWorkshopGoods({
      snapshot: snapshot({
        pulseHint: { coins: "up", houses: "ok" },
        telemetry: {
          goods: [{ id: "wood", name: "Madera", amount: 18 }],
          chains: [{ id: "wood", name: "Madera" }],
          buildings: [
            { id: "lumberjack", name: "Leñador", count: 1 },
            { id: "sawmill", name: "Aserradero", count: 1 },
          ],
        },
      }),
      stats: { demand: { wood: 1 }, supply: { wood: 1.1 }, gap: { wood: 0.1 } },
    });
    assert.deepEqual(rows, [{ goodId: "wood", status: "alcanza" }]);
  });

  it("marca saturado solo si stock + cadena + sim dicen sobreoferta", () => {
    const rows = classifyWorkshopGoods({
      snapshot: snapshot({
        pulseHint: { coins: "up", houses: "ok" },
        telemetry: {
          goods: [{ id: "wood", name: "Madera", amount: 80 }],
          chains: [{ id: "wood", name: "Madera" }],
          buildings: [
            { id: "lumberjack", name: "Leñador", count: 6 },
            { id: "sawmill", name: "Aserradero", count: 3 },
          ],
        },
      }),
      stats: { demand: { wood: 1 }, supply: { wood: 3 }, gap: { wood: 2 } },
    });
    assert.deepEqual(rows, [{ goodId: "wood", status: "saturado" }]);
  });

  it("no marca saturado con almacén lleno si la cadena no pega y el sim no sobra", () => {
    const rows = classifyWorkshopGoods({
      snapshot: snapshot({
        pulseHint: { coins: "up", houses: "ok" },
        telemetry: {
          goods: [{ id: "schnapps", name: "Schnapps", amount: 90 }],
          buildings: [{ id: "marketplace", name: "Mercado", count: 1 }],
        },
      }),
      stats: { demand: { schnapps: 1 }, supply: { schnapps: 0.2 }, gap: { schnapps: -0.8 } },
    });
    assert.equal(rows[0]?.status, "falta");
  });
});

describe("señal roja / saturado para tips", () => {
  const oversupply = snapshot({
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

  it("unknown o pulseHint ausente no pinta rojo ni emite saturado", () => {
    const missing = classifyWorkshopGoods({ snapshot: oversupply, stats });
    assert.equal(missing[0]?.status, "saturado");
    assert.equal(workshopSaturatedSignal(missing, undefined), false);
    assert.equal(workshopSaturatedSignal(missing, { coins: "unknown", houses: "unknown" }), false);
    assert.equal(workshopSaturatedSignal(missing, { coins: "unknown", houses: "ok" }), false);
    assert.equal(workshopSaturatedSignal(missing, { coins: "up", houses: "unknown" }), false);
  });

  it("emite saturado para tips solo con pulse conocido y sobreoferta", () => {
    const rows = classifyWorkshopGoods({
      snapshot: { ...oversupply, pulseHint: { coins: "up", houses: "ok" } },
      stats,
    });
    assert.equal(workshopSaturatedSignal(rows, { coins: "up", houses: "ok" }), true);
  });
});

describe("pintura por bien en taller", () => {
  it("no pinta saturado de rojo si pulseHint es unknown o falta", () => {
    assert.equal(workshopGoodPaint("saturado", undefined), "none");
    assert.equal(workshopGoodPaint("saturado", { coins: "unknown", houses: "ok" }), "none");
    assert.equal(workshopGoodPaint("falta", { coins: "unknown", houses: "unknown" }), "falta");
    assert.equal(workshopGoodPaint("alcanza", undefined), "alcanza");
  });

  it("pinta saturado solo con pulse conocido", () => {
    assert.equal(workshopGoodPaint("saturado", { coins: "up", houses: "ok" }), "saturado");
  });
});

describe("techo del helper", () => {
  it("no acopla precios, traders ni rutas FileDB inventadas", () => {
    assert.doesNotMatch(src, /\bprices?\b|\btrader|\bcomercio\b|\bfiledb\b|\btradeRoute\b/i);
    assert.doesNotMatch(src, /fetch\(|\/api\//);
  });
});
