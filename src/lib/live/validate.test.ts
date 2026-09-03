import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { applyLiveToProgress } from "./apply.ts";
import { matchLiveQuests } from "./match.ts";
import { LIVE_MSG } from "./messages.ts";
import { ingestLiveBytes, ingestLiveJsonText, normalizeSnapshot } from "./validate.ts";

const fixture = JSON.parse(
  readFileSync(new URL("./fixture.json", import.meta.url), "utf8"),
) as unknown;

const encoder = new TextEncoder();

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
    assert.ok((schema.properties.telemetry as { properties?: { goods?: unknown } }).properties?.goods);
    assert.equal(schema.properties.population, undefined);
    assert.equal(schema.properties.warehouse, undefined);
    assert.equal(schema.properties.goods, undefined);
    assert.equal(schema.properties.tradeRoutes, undefined);

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
