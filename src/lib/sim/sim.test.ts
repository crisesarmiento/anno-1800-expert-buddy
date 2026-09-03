import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { BUILDINGS, MISSING_WIKI, chainByGood, chainLinks, chainOutputTMin } from "./chains.ts";
import {
  compute,
  goodBalance,
  housesSupportedFish,
  parseCitySeed,
} from "./compute.ts";
import {
  FARMER_NEEDS,
  HOUSE_CAPACITY,
  JORNALERO_NEEDS,
  WORKER_NEEDS,
  consumeTonsPerMinute,
  consumeTonsPerSecond,
  tonsPerMinutePerHouse,
} from "./needs.ts";
import type { CitySeed } from "./types.ts";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/campaign-ch1.json", import.meta.url), "utf8"),
) as unknown;

function close(actual: number, expected: number, eps = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) < eps,
    `expected ${expected}, got ${actual}`,
  );
}

function farmerNeed(good: string) {
  const row = FARMER_NEEDS.find((need) => need.good === good);
  assert.ok(row?.cTonsPerSecond, good);
  return row;
}

describe("wiki needs C", () => {
  it("farmer fish C is 0.0004166667 t/s → 0.025 t/min → 40 houses per 1 t/min", () => {
    const fish = farmerNeed("fish");
    assert.equal(fish.cTonsPerSecond, 0.0004166667);
    close(tonsPerMinutePerHouse(fish.cTonsPerSecond!), 0.025, 1e-8);
    assert.equal(fish.housesPerTonMin, 40);
    assert.equal(HOUSE_CAPACITY.farmer, 10);
  });

  it("worker fish is double the farmer C", () => {
    const farmer = farmerNeed("fish");
    const worker = WORKER_NEEDS.find((need) => need.good === "fish");
    assert.ok(worker?.cTonsPerSecond);
    close(worker.cTonsPerSecond!, farmer.cTonsPerSecond! * 2, 1e-9);
    assert.equal(worker.housesPerTonMin, 20);
  });

  it("applies C * (1+R) * (1+N) * (1+B)", () => {
    const c = 0.0004166667;
    close(consumeTonsPerSecond(c), c);
    close(consumeTonsPerSecond(c, { R: 0.2 }), c * 1.2);
    close(consumeTonsPerMinute(c, { R: 0, N: 0, B: 0 }), c * 60);
  });

  it("jornalero fried plantains C is wiki 0.00047619", () => {
    const row = JORNALERO_NEEDS.find((need) => need.good === "fried-plantains");
    assert.ok(row);
    assert.equal(row.cTonsPerSecond, 0.00047619);
    assert.equal(row.housesPerTonMin, 35);
    assert.equal(row.unlockInhabitants, 50);
  });
});

describe("wiki production", () => {
  it("1 fishery = 2 t/min = 80 farmer houses of fish", () => {
    const fishery = BUILDINGS.fishery;
    assert.equal(fishery.cycleMin, 0.5);
    close(1 / fishery.cycleMin, 2);
    close(housesSupportedFish(1, "farmer"), 80, 1e-4);
    close(housesSupportedFish(1, "worker"), 40, 1e-4);
    assert.equal(fishery.maintenance, -40);
    assert.equal(fishery.workforce?.farmer, 25);
  });

  it("1 clothes chain supplies 65 farmer residences", () => {
    const chain = chainByGood("work-clothes");
    assert.ok(chain);
    assert.deepEqual(chain.supplies, { farmer: 65, worker: 32.5 });
    close(chainOutputTMin(chain, "campaign"), 2);
  });

  it("1 schnapps chain supplies 60 farmer residences", () => {
    const chain = chainByGood("schnapps");
    assert.ok(chain);
    assert.deepEqual(chain.supplies, { farmer: 60, worker: 30 });
  });

  it("1 sausages chain supplies 50 worker residences", () => {
    const chain = chainByGood("sausages");
    assert.ok(chain);
    assert.equal(chain.supplies?.worker, 50);
    close(chainOutputTMin(chain, "campaign"), 1);
  });

  it("1 bakery = 1 t/min bread = 55 worker houses; perfect chain is 2 bakeries", () => {
    const bakery = BUILDINGS.bakery;
    close(1 / bakery.cycleMin, 1);
    const chain = chainByGood("bread");
    assert.ok(chain);
    assert.deepEqual(
      chainLinks(chain, "campaign").map((link) => `${link.buildingId}:${link.count}`),
      ["grain:1", "mill:1", "bakery:1"],
    );
    assert.deepEqual(
      chainLinks(chain, "perfect").map((link) => `${link.buildingId}:${link.count}`),
      ["grain:2", "mill:1", "bakery:2"],
    );
    assert.equal(chain.supplies?.worker, 110);
  });

  it("steel campaign is one of each; perfect is wiki 1 mine : 2 kiln : 2 furnace : 3 steelworks", () => {
    const chain = chainByGood("steel-beams");
    assert.ok(chain);
    assert.deepEqual(
      chainLinks(chain, "campaign").map((link) => `${link.buildingId}:${link.count}`),
      ["iron-mine:1", "charcoal:1", "furnace:1", "steelworks:1"],
    );
    assert.deepEqual(
      chainLinks(chain, "perfect").map((link) => `${link.buildingId}:${link.count}`),
      ["iron-mine:1", "charcoal:2", "furnace:2", "steelworks:3"],
    );
  });

  it("1 fried-plantain kitchen supplies 70 jornalero residences", () => {
    const chain = chainByGood("fried-plantains");
    assert.ok(chain);
    close(chainOutputTMin(chain, "campaign"), 2);
    assert.equal(chain.supplies?.jornalero, 70);
    assert.equal(chain.supplies?.obrero, 35);
  });
});

describe("campaign-ch1 fixture", () => {
  it("parses La Inapetente, not Bright Sands, and asks for a fishery", () => {
    const seed = parseCitySeed(fixture);
    assert.equal(seed.mode, "campaign");
    assert.equal(seed.chapterId, "ch1");
    assert.equal(seed.islands[0]?.id, "la-inapetente");
    assert.equal(seed.islands[0]?.name, "La Inapetente");
    assert.notEqual(seed.islands[0]?.id, "bright-sands");
    assert.equal(seed.islands[0]?.houses.farmer, 10);
    assert.equal(seed.islands[0]?.buildings.fishery, 0);

    const stats = compute(seed);
    const island = stats.islands[0];
    assert.ok(island);
    assert.equal(stats.nextBuild?.buildingId, "fishery");
    assert.equal(island.nextBuild?.buildingId, "fishery");
    assert.ok(island.alerts.some((row) => row.id === "fish-missing"));
    assert.match(
      island.alerts.find((row) => row.id === "fish-missing")?.line ?? "",
      /0 pescaderías/,
    );
    assert.ok(island.alerts.some((row) => row.id === "clothes-soon"));
    assert.match(
      island.alerts.find((row) => row.id === "clothes-soon")?.line ?? "",
      /0 telares/,
    );
    assert.equal(
      island.alerts.some((row) => row.good === "schnapps" || /schnapps/i.test(row.line)),
      false,
      "lujo no se pide mientras falta un básico",
    );
  });

  it("10 farmer houses demand 0.25 fish t/min and 0 fishery leaves a negative gap", () => {
    const stats = compute(parseCitySeed(fixture));
    const island = stats.islands[0];
    assert.ok(island);
    close(island.demand.fish ?? -1, 0.25, 1e-6);
    close(island.supply.fish ?? -1, 0, 1e-9);
    close(island.gap.fish ?? 1, -0.25, 1e-6);
    close(island.housesSupported.fish?.farmer ?? -1, 0, 1e-9);
  });

  it("does not invent workforce when lumberjack/sawmill rows are null", () => {
    const stats = compute(parseCitySeed(fixture));
    assert.equal(stats.islands[0]?.workforce, null);
    assert.equal(stats.islands[0]?.maintenance, null);
  });
});

describe("presence confidence", () => {
  it("does not invent t/min when the watcher only saw names", () => {
    const seed: CitySeed = {
      schema: "harbor-city-v1",
      game: "anno-1800",
      updatedAt: "2026-09-03T00:00:00.000Z",
      mode: "campaign",
      islands: [
        {
          id: "la-inapetente",
          world: "old",
          houses: {},
          buildings: {},
          confidence: "presence",
        },
      ],
    };
    const stats = compute(seed, { buildingIds: ["fishery", "marketplace"] });
    assert.equal(stats.confidence, "presence");
    assert.equal(stats.islands[0]?.nextBuild, null);
    assert.equal(stats.islands[0]?.workforce, null);
    assert.ok(stats.islands[0]?.alerts.some((row) => row.id === "presence"));
    assert.equal(Object.keys(stats.islands[0]?.demand ?? {}).length, 0);
  });
});

function ch1Fed(island: CitySeed["islands"][number], extra: CitySeed["islands"][number]["buildings"]) {
  return {
    ...island,
    buildings: {
      ...island.buildings,
      fishery: 1,
      sheep: 1,
      knitters: 1,
      potato: 1,
      distillery: 1,
      ...extra,
    },
  };
}

describe("sim gate: chapter already seen + perfect copy", () => {
  it("does not recommend steel or New World on a ch1 seed", () => {
    const base = parseCitySeed(fixture);
    const island = base.islands[0]!;
    const seed: CitySeed = {
      ...base,
      chapterId: "ch1",
      islands: [ch1Fed(island, { "iron-mine": 1 })],
    };
    const stats = compute(seed);
    assert.equal(stats.nextBuild, null);
    assert.notEqual(stats.nextBuild?.buildingId, "charcoal");
    assert.notEqual(stats.nextBuild?.buildingId, "kitchen");
    assert.equal(
      stats.alerts.some((row) => /acería|plátanos|nuevo mundo/i.test(row.line)),
      false,
    );
  });

  it("recommends the next steel link once chapter 2 is already seen", () => {
    const base = parseCitySeed(fixture);
    const island = base.islands[0]!;
    const seed: CitySeed = {
      ...base,
      chapterId: "ch2",
      islands: [ch1Fed(island, { "iron-mine": 1 })],
    };
    const stats = compute(seed);
    assert.equal(stats.nextBuild?.buildingId, "charcoal");
  });

  it("perfect pickNextBuild does not use ch1 campaign narration", () => {
    const base = parseCitySeed(fixture);
    const stats = compute({ ...base, mode: "perfect" });
    assert.equal(stats.nextBuild?.buildingId, "fishery");
    assert.doesNotMatch(stats.nextBuild?.line ?? "", /100 granjeros|ropa a 100/);
    for (const alert of stats.alerts) {
      assert.doesNotMatch(alert.line, /ropa a 100 granjeros/);
    }
    assert.match(stats.nextBuild?.line ?? "", /ratio wiki|80 residencias/i);
  });

  it("does not demand fish before the 50-farmer unlock", () => {
    const base = parseCitySeed(fixture);
    const island = base.islands[0]!;
    const stats = compute({
      ...base,
      islands: [{ ...island, houses: { ...island.houses, farmer: 4 } }],
    });
    assert.equal(stats.islands[0]?.demand.fish, undefined);
    assert.equal(stats.islands[0]?.demand["work-clothes"], undefined);
  });
});

describe("missing wiki stays null", () => {
  it("lists fields that were not copied from a building infobox", () => {
    assert.ok(MISSING_WIKI.length >= 5);
    assert.equal(BUILDINGS.lumberjack.maintenance, null);
    assert.equal(BUILDINGS.knitters.maintenance, null);
    assert.equal(BUILDINGS.slaughterhouse.maintenance, null);
  });
});

describe("per-island stats stay per-island", () => {
  function twoIslandSeed(): CitySeed {
    const base = parseCitySeed(fixture);
    const first = base.islands[0]!;
    const second = {
      ...first,
      id: "second-island",
      name: "Segunda Isla",
      houses: { farmer: 20, worker: 0, artisan: 0, engineer: 0, investor: 0 },
      buildings: { ...first.buildings, fishery: 1 },
    };
    return { ...base, islands: [first, second] };
  }

  it("does not mix one island's houses/buildings into another's demand or supply", () => {
    const seed = twoIslandSeed();
    const stats = compute(seed);
    const [a, b] = stats.islands;
    assert.ok(a && b);
    close(a.demand.fish ?? -1, 0.25, 1e-6);
    close(a.supply.fish ?? -1, 0, 1e-9);
    close(b.demand.fish ?? -1, 0.5, 1e-6);
    close(b.supply.fish ?? -1, 2, 1e-9);
    assert.equal(a.housesMax.farmer, 100);
    assert.equal(b.housesMax.farmer, 200);
  });

  it("merges city-wide totals from both islands without double counting either", () => {
    const seed = twoIslandSeed();
    const stats = compute(seed);
    close(stats.demand.fish ?? -1, 0.75, 1e-6);
    close(stats.supply.fish ?? -1, 2, 1e-9);
  });
});

describe("mano de obra estimada (occupancy)", () => {
  it("assumes full houses and says so when the seed has no occupancy", () => {
    const seed = parseCitySeed(fixture);
    const stats = compute(seed);
    const island = stats.islands[0]!;
    assert.equal(island.occupancyAssumedFull, true);
    assert.equal(island.workforceEstimate.farmer, island.housesMax.farmer);
  });

  it("scales workforce estimate down when occupancy is under 1", () => {
    const base = parseCitySeed(fixture);
    const island = base.islands[0]!;
    const stats = compute({
      ...base,
      islands: [{ ...island, occupancy: { farmer: 0.5 } }],
    });
    const first = stats.islands[0]!;
    assert.equal(first.occupancyAssumedFull, false);
    assert.equal(first.housesMax.farmer, 100);
    assert.equal(first.workforceEstimate.farmer, 50);
  });
});

describe("workforce warning when buildings outdemand houses", () => {
  function fisheryOnlyIsland(fisheryCount: number): CitySeed["islands"][number] {
    return {
      id: "la-inapetente",
      world: "old",
      houses: { farmer: 10 },
      buildings: { fishery: fisheryCount },
    };
  }

  it("warns when fisheries need more farmers than the houses can supply", () => {
    const base = parseCitySeed(fixture);
    const stats = compute({ ...base, islands: [fisheryOnlyIsland(5)] });
    const first = stats.islands[0]!;
    assert.equal(first.workforce?.farmer, 125);
    assert.equal(first.housesMax.farmer, 100);
    assert.ok(first.alerts.some((row) => row.id === "workforce-farmer"));
    assert.match(
      first.alerts.find((row) => row.id === "workforce-farmer")?.line ?? "",
      /125.*100/,
    );
  });

  it("does not warn when the houses cover the workforce the fisheries need", () => {
    const base = parseCitySeed(fixture);
    const stats = compute({ ...base, islands: [fisheryOnlyIsland(1)] });
    const first = stats.islands[0]!;
    assert.equal(first.alerts.some((row) => row.id === "workforce-farmer"), false);
  });
});

describe("goodBalance classifier", () => {
  it("is null when either side is unknown", () => {
    assert.equal(goodBalance(null, 1), null);
  });

  it("is falta when the gap is negative", () => {
    assert.equal(goodBalance(-0.1, 1), "falta");
  });

  it("is alcanza for a modest surplus", () => {
    assert.equal(goodBalance(0.1, 1), "alcanza");
  });

  it("is saturado for a large oversupply", () => {
    assert.equal(goodBalance(2, 1), "saturado");
  });
});
