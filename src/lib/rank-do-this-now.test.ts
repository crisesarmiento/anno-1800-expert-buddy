import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LIVE_GAME, LIVE_SCHEMA, type LiveSnapshot } from "./live/types.ts";
import { rankDoThisNow, saturadoRojo, type Pulse } from "./rank-do-this-now.ts";

const MISSION = "ch1-spark";

function pulse(patch: Partial<Pulse> = {}): Pulse {
  return { coins: "unknown", houses: "unknown", looking: "unknown", ...patch };
}

function snapshot(at: string, buildingIds: string[]): LiveSnapshot {
  return {
    schema: LIVE_SCHEMA,
    source: "file",
    updatedAt: at,
    game: LIVE_GAME,
    quests: [],
    telemetry: {
      buildings: buildingIds.map((id) => ({ id, name: id })),
    },
  };
}

function rank(input: Partial<Parameters<typeof rankDoThisNow>[0]> = {}) {
  return rankDoThisNow({
    missionId: MISSION,
    pulse: pulse(),
    checks: [],
    snapshot: null,
    samples: [],
    locale: "es",
    ...input,
  });
}

describe("rankDoThisNow", () => {
  it("returns no rows when pulse is unknown and there is no snapshot", () => {
    assert.deepEqual(rank({}), []);
  });

  it("returns no rows without a mission", () => {
    assert.deepEqual(rank({ missionId: null, pulse: pulse({ coins: "down" }) }), []);
  });

  it("ranks coins-down as the bad hero", () => {
    const rows = rank({ pulse: pulse({ coins: "down" }) });
    assert.equal(rows[0]?.id, "pulse:coins-down");
    assert.equal(rows[0]?.band, "bad");
    assert.equal(rows.length <= 3, true);
  });

  it("treats looking=stats as coins-down", () => {
    const rows = rank({ pulse: pulse({ looking: "stats" }) });
    assert.equal(rows[0]?.id, "pulse:coins-down");
  });

  it("treats broke calm as coins-down", () => {
    const rows = rank({ calm: "broke" });
    assert.equal(rows[0]?.id, "pulse:coins-down");
  });

  it("orders coins-down before empty houses when freshness is equal", () => {
    const rows = rank({ pulse: pulse({ coins: "down", houses: "empty" }) });
    assert.deepEqual(rows.map((row) => row.id), [
      "pulse:coins-down",
      "pulse:houses-empty",
      "mission:do:0",
    ]);
  });

  it("lets the newest sample win inside the same band", () => {
    const rows = rank({
      pulse: pulse({ coins: "down", houses: "empty" }),
      samples: [
        { at: "2026-09-01T10:00:00.000Z", coins: "down", houses: "ok" },
        { at: "2026-09-01T12:00:00.000Z", coins: "down", houses: "empty" },
      ],
    });
    assert.equal(rows[0]?.id, "pulse:houses-empty");
    assert.equal(rows[1]?.id, "pulse:coins-down");
  });

  it("keeps live missing rows out without a snapshot", () => {
    const rows = rank({ pulse: pulse({ coins: "down" }) });
    assert.equal(rows.some((row) => row.id.startsWith("live:missing:")), false);
  });

  it("ranks missing current-mission buildings when live hits exist", () => {
    const rows = rank({
      pulse: pulse({ coins: "up", houses: "ok" }),
      snapshot: snapshot("2026-09-01T12:00:00.000Z", ["lumberjack"]),
    });
    assert.ok(rows.some((row) => row.id === "live:missing:sawmill"));
    assert.equal(rows.some((row) => row.id === "live:missing:lumberjack"), false);
    assert.equal(rows.find((row) => row.id === "live:missing:sawmill")?.presence, "missing");
  });

  it("does not invent a no-telemetry warn", () => {
    const rows = rank({
      snapshot: {
        schema: LIVE_SCHEMA,
        source: "file",
        updatedAt: "2026-09-01T12:00:00.000Z",
        game: LIVE_GAME,
        quests: [],
      },
    });
    assert.equal(rows.some((row) => /telemetr/i.test(row.title)), false);
    assert.equal(rows[0]?.id, "mission:do:0");
  });

  it("drops coins-up, Kahina, and competitor noise", () => {
    const rows = rank({
      pulse: pulse({ coins: "up" }),
      snapshot: {
        ...snapshot("2026-09-01T12:00:00.000Z", ["lumberjack"]),
        telemetry: {
          buildings: [{ id: "lumberjack", name: "lumberjack" }],
          people: [
            { id: "kahina", name: "Kahina" },
            { id: "competitors", name: "Competitors" },
          ],
        },
      },
    });
    assert.equal(rows.some((row) => /Kahina|compañ/i.test(row.title)), false);
    assert.equal(rows.some((row) => row.id === "pulse:coins-down"), false);
  });

  it("holds quest until no bad/warn remains", () => {
    const blocked = rank({ pulse: pulse({ coins: "down", looking: "quest" }) });
    assert.equal(blocked.some((row) => row.id === "pulse:quest"), false);
    const open = rank({ pulse: pulse({ looking: "quest" }) });
    assert.equal(open[0]?.id, "pulse:quest");
  });

  it("never renders more than three rows", () => {
    const rows = rank({
      pulse: pulse({ coins: "down", houses: "empty" }),
      snapshot: snapshot("2026-09-01T12:00:00.000Z", ["lumberjack"]),
    });
    assert.equal(rows.length, 3);
  });

  it("suppresses yellow bars and build-mission do under the overbuild brake", () => {
    const rows = rank({
      pulse: pulse({ houses: "yellow" }),
      brakeActive: true,
      missionKind: "build",
      snapshot: snapshot("2026-09-01T12:00:00.000Z", ["lumberjack"]),
    });
    assert.equal(rows.some((row) => row.id === "pulse:houses-yellow"), false);
    assert.equal(rows.some((row) => row.id.startsWith("mission:do:")), false);
    assert.equal(rows.some((row) => row.id.startsWith("live:missing:")), false);
  });

  it("skips checked do items", () => {
    const rows = rank({
      pulse: pulse({ looking: "quest" }),
      checks: [0, 1, 2],
    });
    assert.equal(rows.some((row) => row.id.startsWith("mission:do:")), false);
  });
});

describe("saturadoRojo", () => {
  it("is presence, not a count", () => {
    assert.deepEqual(saturadoRojo(pulse({ coins: "down", houses: "yellow" }), "session"), {
      saturado: true,
      rojo: true,
    });
  });
});
