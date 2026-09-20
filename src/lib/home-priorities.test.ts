import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { homePriorities, routeAnchor } from "./home-priorities.ts";
import { editorialCopy } from "./editorial-copy.ts";
import type { HistorySample } from "./history/types.ts";
import type { LiveSnapshot, LiveProductionMetric, LiveTradeRoute } from "./live/types.ts";

const time = "2026-09-19T12:00:00Z";
const now = Date.parse(time);
const metric: LiveProductionMetric = {
  guid: 1010278,
  id: "fishery",
  name: "Fishery",
  observedAt: time,
  buildingCountObservedAt: time,
  islandName: "Ditchwater",
  buildingCount: 1,
  requiredTMin: 3.5,
  productivity: 100,
};
function route(id: number, shipCount = 1): LiveTradeRoute {
  return {
    id,
    name: `Route ${id}`,
    ownerId: 0,
    shipCount,
    stops: [{ goods: [{ guid: 1, id: "bread", name: "Bread", amount: 20 }] }, { goods: [] }],
  };
}
function snapshot(): LiveSnapshot {
  return {
    schema: "harbor-live-v1",
    game: "anno-1800",
    source: "save",
    quests: [],
    updatedAt: time,
    savedAt: time,
    connection: {
      mode: "documents-save",
      native: {
        provider: "ux-enhancer-ocr",
        view: "production",
        observedAt: time,
        islandName: "Ditchwater",
      },
      nativeProbe: { provider: "ux-enhancer-ocr", state: "reachable", lastProbeAt: time },
    },
    telemetry: {
      production: [{ ...metric }],
      routes: [route(1)],
      goodsChanges: [
        {
          id: "bread",
          name: "Bread",
          previousAmount: 120,
          amount: 96,
          delta: -24,
          previousSavedAt: "2026-09-19T11:55:00Z",
        },
      ],
    },
  };
}
describe("editorial operational priorities", () => {
  it("never turns preserved rows into current advice when the server sees no island/window", () => {
    for (const result of ["no_observation", "no_window"] as const) {
      const data = snapshot();
      data.connection!.nativeProbe!.result = result;
      const model = homePriorities(data, now);
      assert.equal(model.readiness, "historical");
      assert.ok(model.priorities.every((item) => item.kind !== "production"));
    }
  });
  it("handles no data without invented tasks", () => {
    assert.deepEqual(homePriorities(null, now), {
      priorities: [],
      readiness: "off",
      island: undefined,
      hasRoutes: false,
    });
  });
  it("orders structural issues, deficits, surpluses and stock; caps at three", () => {
    const s = snapshot();
    s.telemetry!.routes!.push(route(2, 0));
    s.telemetry!.production!.push({
      ...metric,
      guid: 1010312,
      id: "distillery",
      buildingCount: 3,
      requiredTMin: 2,
    });
    const result = homePriorities(s, now);
    assert.deepEqual(
      result.priorities.map((p) => p.kind),
      ["route", "production", "production"],
    );
    assert.equal(result.priorities[0].key, "route-2");
    assert.equal(
      result.priorities[1].kind === "production" && result.priorities[1].advice.status,
      "falta",
    );
    assert.equal(
      result.priorities[2].kind === "production" && result.priorities[2].advice.status,
      "sobra",
    );
  });
  it("deduplicates stock by good and preserves comparison timestamps", () => {
    const s = snapshot();
    s.telemetry!.routes!.push(route(2));
    s.telemetry!.production = [];
    const result = homePriorities(s, now).priorities;
    assert.equal(result.length, 1);
    assert.equal(result[0].kind, "stock");
    assert.equal(result[0].kind === "stock" && result[0].previousSavedAt, "2026-09-19T11:55:00Z");
  });
  it("uses stable order for structural route issues and excludes other players", () => {
    const s = snapshot();
    s.telemetry!.routes = [route(9, 0), { ...route(1, 0), ownerId: 2 }, route(7, 0)];
    assert.deepEqual(
      homePriorities(s, now)
        .priorities.slice(0, 2)
        .map((p) => p.key),
      ["route-9", "route-7"],
    );
    assert.equal(routeAnchor({ ...route(1), id: undefined }, 2), "route-2");
  });
  it("requires explicit productivity instead of assuming 100 percent", () => {
    const s = snapshot();
    delete s.telemetry!.production![0].productivity;
    assert.ok(homePriorities(s, now).priorities.every((p) => p.kind !== "production"));
    assert.equal(homePriorities(s, now).readiness, "production");
  });
  it("requires demand and factory count", () => {
    for (const field of ["requiredTMin", "buildingCount"] as const) {
      const s = snapshot();
      delete s.telemetry!.production![0][field];
      assert.ok(homePriorities(s, now).priorities.every((p) => p.kind !== "production"));
    }
  });
  it("requires known catalog rates", () => {
    const s = snapshot();
    s.telemetry!.production![0].id = "unmapped";
    assert.equal(homePriorities(s, now).readiness, "catalog");
    assert.ok(homePriorities(s, now).priorities.every((p) => p.kind !== "production"));
  });
  it("does not mix samples from another island or an unidentified island", () => {
    for (const island of ["Other island", undefined]) {
      const s = snapshot();
      s.connection!.native!.islandName = island;
      assert.equal(homePriorities(s, now).readiness, "production");
      assert.ok(homePriorities(s, now).priorities.every((p) => p.kind !== "production"));
    }
  });
  it("Finance age is independent; absent Finance timestamp is incomplete", () => {
    for (const at of ["2026-09-19T11:30:00Z", undefined]) {
      const s = snapshot();
      s.telemetry!.production![0].buildingCountObservedAt = at;
      assert.equal(homePriorities(s, now).readiness, "finance");
      assert.ok(homePriorities(s, now).priorities.every((p) => p.kind !== "production"));
    }
  });
  it("expires evidence with wall clock even when no new snapshot arrives", () => {
    const s = snapshot();
    assert.equal(homePriorities(s, now).readiness, "ready");
    assert.equal(homePriorities(s, now + 16 * 60_000).readiness, "historical");
    assert.ok(
      homePriorities(s, now + 16 * 60_000).priorities.every((p) => p.kind !== "production"),
    );
  });
  it("a newer save invalidates old OCR without treating a new probe as fresh evidence", () => {
    const s = snapshot();
    s.savedAt = "2026-09-19T12:02:00Z";
    s.connection!.nativeProbe!.lastProbeAt = "2026-09-19T12:03:00Z";
    assert.equal(homePriorities(s, now + 180_000).readiness, "historical");
  });
  it("retains route observations but suppresses production advice when OCR is unreachable or paused", () => {
    const s = snapshot();
    s.telemetry!.routes = [route(1, 0)];
    s.connection!.nativeProbe!.state = "unreachable";
    const result = homePriorities(s, now);
    assert.equal(result.readiness, "historical");
    assert.equal(result.priorities[0].kind, "route");
    assert.equal(homePriorities(snapshot(), now, false).readiness, "historical");
  });
  it("does not substitute JSON generation time for save time", () => {
    const s = snapshot();
    delete s.savedAt;
    s.telemetry!.routes = [route(1, 0)];
    const first = homePriorities(s, now).priorities[0];
    assert.ok(first.kind === "route");
    assert.equal(first.observedAt, undefined);
  });
  it("puts recurrent cash losses first and ignores an isolated purchase", () => {
    const cash = (id: string, treasury: number, simTime: number): HistorySample => ({
      id,
      campaignId: "camp",
      branchId: "main",
      recordedAt: `2026-09-20T12:0${simTime}:00.000Z`,
      contentHash: id,
      simTime,
      savedAt: `2026-09-20T12:0${simTime}:00.000Z`,
      summary: { islands: [], treasury },
    });
    const s = snapshot();
    s.telemetry!.production = [];
    s.telemetry!.routes = [];
    s.telemetry!.goodsChanges = [];
    const recurrent = homePriorities(s, now, true, [
      cash("a", 5000, 1),
      cash("b", 3000, 2),
      cash("c", 1000, 3),
    ]);
    assert.equal(recurrent.priorities[0]?.kind, "treasury");
    const isolated = homePriorities(s, now, false, [
      cash("a", 5000, 1),
      cash("b", 1200, 2),
      cash("c", 1800, 3),
    ]);
    assert.ok(isolated.priorities.every((item) => item.kind !== "treasury"));
    assert.equal(isolated.readiness, "historical");
  });

  it("balanced data can yield no priorities without inventing a healthy-economy claim", () => {
    const s = snapshot();
    s.telemetry!.production![0].requiredTMin = 2;
    s.telemetry!.goodsChanges = [];
    assert.equal(homePriorities(s, now).priorities.length, 0);
    assert.equal(homePriorities(s, now).readiness, "ready");
  });
  it("provides all editorial copy keys in all four languages", () => {
    for (const copy of Object.values(editorialCopy)) {
      assert.deepEqual(Object.keys(copy).sort(), Object.keys(editorialCopy.es).sort());
      assert.ok(Object.values(copy).every((text) => text.trim().length > 0));
    }
  });
});
