import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { applyLiveToProgress } from "./apply.ts";
import { matchLiveQuests } from "./match.ts";
import { LIVE_MSG } from "./messages.ts";
import { ingestLiveBytes, ingestLiveJsonText, normalizeSnapshot } from "./validate.ts";
import {
  routeStockDrop,
  tradeRouteHealth,
  tradeRouteIssue,
  uniqueTradeGoods,
} from "../trade-route-health.ts";

const fixture = JSON.parse(
  readFileSync(new URL("./fixture.json", import.meta.url), "utf8"),
) as unknown;

const encoder = new TextEncoder();

it("preserves capture outcome separately from historical observation", () => {
  const raw = readFileSync(new URL("./fixture-no-observation.json", import.meta.url), "utf8");
  const result = ingestLiveJsonText(raw);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.snapshot.connection?.nativeProbe?.result, "no_observation");
  assert.equal(result.snapshot.connection?.native?.observedAt, "2026-09-19T12:00:00.000Z");
  const invalid = ingestLiveJsonText(raw.replace('"no_observation"', '"invented"'));
  assert.equal(invalid.ok && invalid.snapshot.connection?.nativeProbe?.result, undefined);
});

describe("harbor-live ingest", () => {
  it("accepts the good fixture and matches Una chispa que vuelve", () => {
    const raw = JSON.stringify(fixture);
    const result = ingestLiveBytes({
      filename: "harbor-live.json",
      mime: "application/json",
      bytes: encoder.encode(raw),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.snapshot.schema, "harbor-live-v1");
    assert.equal(result.snapshot.quests[0]?.title, "Una chispa que vuelve");
    const match = matchLiveQuests(result.snapshot.quests);
    assert.equal(match.missionId, "ch1-spark");
    assert.ok(match.confidence >= 3);
    const progress = applyLiveToProgress(result.snapshot, match);
    assert.equal(progress.matched, true);
    assert.equal(progress.missionId, "ch1-spark");
    assert.ok(progress.completed.includes("pro-blast"));
    assert.deepEqual(progress.checks["pro-blast"], [0, 1, 2]);
    assert.equal(progress.pulse.looking, "quest");
    assert.equal(progress.pulse.coins, "down");
    assert.equal(result.snapshot.telemetry?.buildings?.[0]?.id, "lumberjack");
    assert.equal(result.snapshot.sessionName, "Autosave");
    assert.equal(result.snapshot.islandName, "Bright Sands");
    assert.equal(result.snapshot.savedAt, "2026-08-31T23:50:00.000Z");
    assert.equal(result.snapshot.workforce?.farmers, true);
    assert.equal(result.snapshot.connection?.routeCount, 2);
    assert.equal(result.snapshot.telemetry?.routes?.[0]?.name, "Tablones La - Les");
    assert.equal(result.snapshot.telemetry?.routes?.[1]?.shipCount, 0);
    assert.equal(result.snapshot.telemetry?.routes?.[0]?.stops[0]?.goods[0]?.id, "timber");
    assert.equal(result.snapshot.telemetry?.goodsChanges?.[0]?.delta, -17);
    assert.equal(result.snapshot.islandSnapshots, undefined);
  });

  it("accepts optional islandSnapshots without redefining islandName as a colony", () => {
    const raw = readFileSync(new URL("./fixture-islands.json", import.meta.url), "utf8");
    const result = ingestLiveJsonText(raw);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.snapshot.islandName, "Old World");
    assert.equal(result.snapshot.islandSnapshots?.length, 2);
    assert.equal(result.snapshot.islandSnapshots?.[0]?.stock?.[0]?.amount, 10);
    assert.equal(result.snapshot.islandSnapshots?.[1]?.stock?.[0]?.amount, 50);
    assert.equal(result.snapshot.islandSnapshots?.[0]?.coverage.identity.source, "save");
    assert.equal(result.snapshot.simTime, 12000);
    assert.equal(result.snapshot.playerId, 0);
  });

  it("keeps schema required keys and strips refused extras", () => {
    const schema = JSON.parse(
      readFileSync(new URL("../../../docs/harbor-live.schema.json", import.meta.url), "utf8"),
    ) as { required: string[]; properties: Record<string, unknown> };
    assert.deepEqual(schema.required, ["schema", "source", "updatedAt", "game", "quests"]);
    assert.ok(schema.properties.sessionName);
    assert.ok(schema.properties.islandName);
    assert.ok(schema.properties.savedAt);
    assert.ok(schema.properties.workforce);
    assert.ok(schema.properties.connection);
    assert.ok(
      (schema.properties.telemetry as { properties?: { goods?: unknown } }).properties?.goods,
    );
    assert.ok(
      (schema.properties.telemetry as { properties?: { routes?: unknown } }).properties?.routes,
    );
    assert.ok(
      (schema.properties.telemetry as { properties?: { production?: unknown } }).properties
        ?.production,
    );
    assert.ok(
      (schema.properties.telemetry as { properties?: { goodsChanges?: unknown } }).properties
        ?.goodsChanges,
    );
    assert.ok(
      (
        schema.properties.connection as {
          properties?: { nativeProbe?: unknown };
        }
      ).properties?.nativeProbe,
    );
    assert.equal(schema.properties.population, undefined);
    assert.equal(schema.properties.warehouse, undefined);
    assert.equal(schema.properties.goods, undefined);
    assert.equal(schema.properties.tradeRoutes, undefined);
    assert.ok(schema.properties.islandSnapshots);
    assert.ok(schema.properties.campaignId);
    assert.ok(schema.properties.simTime);

    const result = normalizeSnapshot({
      schema: "harbor-live-v1",
      source: "save",
      updatedAt: "2026-09-02T12:00:00.000Z",
      savedAt: "2026-09-02T11:59:00.000Z",
      game: "anno-1800",
      sessionName: "quicksave",
      islandName: "Ditchwater",
      workforce: { farmers: true, workers: true, farmersCount: 50, artisans: false },
      quests: [],
      population: { farmers: 50 },
      warehouse: { fullness: 0.8, wood: 12 },
      goods: [{ id: "wood", stock: 12 }],
      tradeRoutes: [{ npc: "kahina", good: "spices" }],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.snapshot.sessionName, "quicksave");
    assert.equal(result.snapshot.islandName, "Ditchwater");
    assert.equal(result.snapshot.savedAt, "2026-09-02T11:59:00.000Z");
    assert.deepEqual(result.snapshot.workforce, { farmers: true, workers: true });
    assert.equal("population" in result.snapshot, false);
    assert.equal("warehouse" in result.snapshot, false);
    assert.equal("goods" in result.snapshot, false);
    assert.equal("tradeRoutes" in result.snapshot, false);
  });

  it("preserves an optional building count, and drops a bad one without failing", () => {
    const result = normalizeSnapshot({
      schema: "harbor-live-v1",
      source: "save",
      updatedAt: "2026-09-10T00:00:00.000Z",
      game: "anno-1800",
      quests: [],
      telemetry: {
        buildings: [
          { id: "fishery", name: "Pescadería", count: 2 },
          { id: "marketplace", name: "Mercado", count: 0 },
          { id: "lumberjack", name: "Cabaña de leñador", count: -1 },
          { id: "sawmill", name: "Aserradero" },
        ],
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const buildings = result.snapshot.telemetry?.buildings ?? [];
    assert.equal(buildings.find((row) => row.id === "fishery")?.count, 2);
    assert.equal("count" in (buildings.find((row) => row.id === "marketplace") ?? {}), false);
    assert.equal("count" in (buildings.find((row) => row.id === "lumberjack") ?? {}), false);
    assert.equal("count" in (buildings.find((row) => row.id === "sawmill") ?? {}), false);
  });

  it("drops a goods change whose claimed delta does not match the two amounts", () => {
    const result = normalizeSnapshot({
      schema: "harbor-live-v1",
      source: "save",
      updatedAt: "2026-09-18T12:00:00.000Z",
      game: "anno-1800",
      quests: [],
      telemetry: {
        goodsChanges: [
          {
            id: "timber",
            name: "Tablones",
            previousAmount: 48,
            amount: 31,
            delta: -1,
            previousSavedAt: "2026-09-18T11:50:00.000Z",
          },
        ],
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.snapshot.telemetry?.goodsChanges, undefined);
  });

  it("still validates presence-only telemetry.buildings (no count at all)", () => {
    const result = normalizeSnapshot({
      schema: "harbor-live-v1",
      source: "file",
      updatedAt: "2026-09-10T00:00:00.000Z",
      game: "anno-1800",
      quests: [],
      telemetry: {
        buildings: [{ id: "marketplace", name: "Mercado" }],
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.snapshot.telemetry?.buildings, [
      { id: "marketplace", name: "Mercado" },
    ]);
  });

  it("normalizes evidence-stamped OCR production and drops malformed rows", () => {
    const result = normalizeSnapshot({
      schema: "harbor-live-v1",
      source: "save",
      updatedAt: "2026-09-15T12:00:00.000Z",
      game: "anno-1800",
      quests: [],
      connection: {
        mode: "ubisoft-cloud",
        native: {
          provider: "ux-enhancer-ocr",
          view: "production",
          observedAt: "2026-09-15T11:59:58.000Z",
          islandName: "La Inapetente",
          serverVersion: "v11.0",
        },
      },
      telemetry: {
        production: [
          {
            guid: 1010278,
            id: "fishery",
            name: "Fishery",
            observedAt: "2026-09-15T11:59:58.000Z",
            islandName: "La Inapetente",
            requiredTMin: 3.5,
            productivity: 120,
            buildingCount: 2,
          },
          { guid: "bad", name: "Bad", observedAt: "not-a-date" },
        ],
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.snapshot.connection?.native?.view, "production");
    assert.equal(result.snapshot.connection?.native?.islandName, "La Inapetente");
    assert.equal(result.snapshot.telemetry?.production?.length, 1);
    assert.equal(result.snapshot.telemetry?.production?.[0]?.requiredTMin, 3.5);
  });

  it("accepts legacy JSON with no connection.nativeProbe at all", () => {
    const result = normalizeSnapshot({
      schema: "harbor-live-v1",
      source: "save",
      updatedAt: "2026-09-19T00:00:00.000Z",
      game: "anno-1800",
      quests: [],
      connection: { mode: "documents-save" },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.snapshot.connection?.nativeProbe, undefined);
  });

  it("normalizes a technical nativeProbe and drops one with a bad state", () => {
    const ok = normalizeSnapshot({
      schema: "harbor-live-v1",
      source: "save",
      updatedAt: "2026-09-19T00:00:00.000Z",
      game: "anno-1800",
      quests: [],
      connection: {
        mode: "documents-save",
        nativeProbe: {
          provider: "ux-enhancer-ocr",
          state: "unreachable",
          lastProbeAt: "2026-09-19T00:00:00.000Z",
          reason: "connection_refused",
        },
      },
    });
    assert.equal(ok.ok, true);
    if (!ok.ok) return;
    assert.deepEqual(ok.snapshot.connection?.nativeProbe, {
      provider: "ux-enhancer-ocr",
      state: "unreachable",
      lastProbeAt: "2026-09-19T00:00:00.000Z",
      reason: "connection_refused",
    });

    const bad = normalizeSnapshot({
      schema: "harbor-live-v1",
      source: "save",
      updatedAt: "2026-09-19T00:00:00.000Z",
      game: "anno-1800",
      quests: [],
      connection: {
        mode: "documents-save",
        nativeProbe: {
          provider: "ux-enhancer-ocr",
          state: "starting",
          lastProbeAt: "2026-09-19T00:00:00.000Z",
        },
      },
    });
    assert.equal(bad.ok, true);
    if (!bad.ok) return;
    assert.equal(bad.snapshot.connection?.nativeProbe, undefined);
  });

  it("keeps connection.native + telemetry.production when nativeProbe reports unreachable (preserve evidence)", () => {
    const result = normalizeSnapshot({
      schema: "harbor-live-v1",
      source: "save",
      updatedAt: "2026-09-19T00:05:00.000Z",
      game: "anno-1800",
      quests: [],
      connection: {
        mode: "documents-save",
        native: {
          provider: "ux-enhancer-ocr",
          view: "production",
          observedAt: "2026-09-19T00:00:00.000Z",
          islandName: "La Inapetente",
        },
        nativeProbe: {
          provider: "ux-enhancer-ocr",
          state: "unreachable",
          lastProbeAt: "2026-09-19T00:05:00.000Z",
          lastSuccessAt: "2026-09-19T00:00:00.000Z",
          reason: "timeout",
        },
      },
      telemetry: {
        production: [
          {
            guid: 1010278,
            id: "fishery",
            name: "Fishery",
            observedAt: "2026-09-19T00:00:00.000Z",
            buildingCountObservedAt: "2026-09-19T00:00:30.000Z",
            islandName: "La Inapetente",
            requiredTMin: 3.5,
            productivity: 100,
            buildingCount: 1,
          },
        ],
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.snapshot.connection?.native?.islandName, "La Inapetente");
    assert.equal(result.snapshot.connection?.nativeProbe?.state, "unreachable");
    assert.equal(
      result.snapshot.connection?.nativeProbe?.lastSuccessAt,
      "2026-09-19T00:00:00.000Z",
    );
    assert.equal(
      result.snapshot.telemetry?.production?.[0]?.buildingCountObservedAt,
      "2026-09-19T00:00:30.000Z",
    );
  });

  it("rejects a bad schema", () => {
    const result = ingestLiveJsonText(
      JSON.stringify({
        schema: "harbor-live-v0",
        game: "anno-1800",
        quests: [{ title: "Una chispa que vuelve", state: "active" }],
      }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, LIVE_MSG.schema);
  });

  it("rejects an .a7s-like Resource File header", () => {
    const bytes = encoder.encode("Resource File\nthis is a save not json");
    const result = ingestLiveBytes({
      filename: "harbor-live.json",
      mime: "application/json",
      bytes,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, LIVE_MSG.saveFile);
  });

  it("rejects a huge string", () => {
    const huge = "x".repeat(400 * 1024 + 40);
    const result = ingestLiveJsonText(huge);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, LIVE_MSG.tooBig);
  });

  it("accepts empty quests without applying a mission", () => {
    const result = normalizeSnapshot({
      schema: "harbor-live-v1",
      source: "file",
      game: "anno-1800",
      quests: [],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const match = matchLiveQuests(result.snapshot.quests);
    assert.equal(match.missionId, null);
    const progress = applyLiveToProgress(result.snapshot, match);
    assert.equal(progress.matched, false);
  });

  it("rejects an invalid quest state", () => {
    const result = ingestLiveJsonText(
      JSON.stringify({
        schema: "harbor-live-v1",
        game: "anno-1800",
        quests: [{ title: "Una chispa que vuelve", state: "paused" }],
      }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, LIVE_MSG.badState);
  });

  it("rejects a non-json extension without touching the payload", () => {
    const result = ingestLiveBytes({
      filename: "save.a7s",
      mime: "application/octet-stream",
      bytes: encoder.encode(JSON.stringify(fixture)),
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, LIVE_MSG.notJson);
  });

  it("rejects a different game", () => {
    const result = ingestLiveJsonText(
      JSON.stringify({
        schema: "harbor-live-v1",
        game: "anno-2205",
        quests: [{ title: "Una chispa que vuelve", state: "active" }],
      }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, LIVE_MSG.game);
  });
});

describe("trade route structural health", () => {
  const configured = {
    id: 26,
    name: "Tablones La - Les",
    ownerId: 0,
    shipCount: 1,
    stops: [
      { areaId: 8451, goods: [{ guid: 1010196, id: "timber", name: "Tablones", amount: 20 }] },
      { areaId: 9219, goods: [{ guid: 1010196, id: "timber", name: "Tablones", amount: 20 }] },
    ],
  };

  it("does not overclaim an issue for a configured route", () => {
    assert.equal(tradeRouteIssue(configured), null);
    assert.deepEqual(uniqueTradeGoods(configured), [{ name: "Tablones", amount: 20 }]);
  });

  it("prioritizes missing ships, stops, then goods", () => {
    assert.equal(tradeRouteIssue({ ...configured, shipCount: 0 }), "Sin barco asignado");
    assert.equal(
      tradeRouteIssue({ ...configured, stops: configured.stops.slice(0, 1) }),
      "Sólo tiene una parada",
    );
    assert.equal(
      tradeRouteIssue({
        ...configured,
        stops: configured.stops.map((stop) => ({ ...stop, goods: [] })),
      }),
      "No tiene bienes configurados",
    );
  });

  it("flags a meaningful save-wide stock drop as observation, not confirmed failure", () => {
    const changes = [
      {
        id: "timber",
        name: "Tablones",
        previousAmount: 48,
        amount: 31,
        delta: -17,
        previousSavedAt: "2026-09-15T11:55:00.000Z",
      },
    ];
    assert.equal(routeStockDrop(configured, changes)?.delta, -17);
    assert.deepEqual(tradeRouteHealth(configured, changes), {
      level: "watch",
      message: "Stock global de Tablones bajó",
      change: changes[0],
    });
  });

  it("ignores small noise, increases and unrelated stock changes", () => {
    const changes = [
      {
        id: "timber",
        name: "Tablones",
        previousAmount: 48,
        amount: 45,
        delta: -3,
        previousSavedAt: "2026-09-15T11:55:00.000Z",
      },
      {
        id: "fish",
        name: "Pescado",
        previousAmount: 20,
        amount: 5,
        delta: -15,
        previousSavedAt: "2026-09-15T11:55:00.000Z",
      },
    ];
    assert.equal(routeStockDrop(configured, changes), null);
    assert.equal(tradeRouteHealth(configured, changes).level, "ok");
  });

  it("keeps a structural failure above a matching stock signal", () => {
    const health = tradeRouteHealth({ ...configured, shipCount: 0 }, [
      {
        id: "timber",
        name: "Tablones",
        previousAmount: 48,
        amount: 31,
        delta: -17,
        previousSavedAt: "2026-09-15T11:55:00.000Z",
      },
    ]);
    assert.deepEqual(health, { level: "confirmed", message: "Sin barco asignado" });
  });
});
