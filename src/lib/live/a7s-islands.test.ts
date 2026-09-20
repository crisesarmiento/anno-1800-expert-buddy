import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractIslands, islandByAreaId, resolveIslandName } from "./a7s-islands.ts";
import { extractTradeRoutes } from "./a7s-trade-routes.ts";

const FILEDB_MAGIC = 0xfffffffd;

type Rec = { open: number } | { close: true } | { leaf: number; payload: Buffer };

function encodeStream(recs: Rec[]): Buffer {
  const parts: Buffer[] = [];
  for (const r of recs) {
    const h = Buffer.alloc(8);
    if ("open" in r) {
      h.writeUInt16LE(r.open, 4);
      parts.push(h);
    } else if ("close" in r) {
      parts.push(h);
    } else {
      const size = r.payload.length;
      h.writeUInt32LE(size, 0);
      h.writeUInt16LE(r.leaf | 0x8000, 4);
      const pad = (8 - (size % 8)) % 8;
      parts.push(h, r.payload, Buffer.alloc(pad));
    }
  }
  return Buffer.concat(parts);
}

function encodeDict(entries: { id: number; name: string }[]): Buffer {
  const header = Buffer.alloc(4 + entries.length * 2);
  header.writeUInt32LE(entries.length, 0);
  entries.forEach((e, i) => header.writeUInt16LE(e.id, 4 + i * 2));
  const strs = entries.map((e) => Buffer.concat([Buffer.from(e.name, "utf8"), Buffer.from([0])]));
  return Buffer.concat([header, ...strs]);
}

function encodeFileDb(
  recs: Rec[],
  tagNames: Record<number, string>,
  attrNames: Record<number, string>,
): Buffer {
  const body = encodeStream(recs);
  const tagDict = encodeDict(Object.entries(tagNames).map(([id, name]) => ({ id: Number(id), name })));
  const attrDict = encodeDict(Object.entries(attrNames).map(([id, name]) => ({ id: Number(id), name })));
  const trailer = Buffer.alloc(16);
  trailer.writeUInt32LE(body.length, 0);
  trailer.writeUInt32LE(body.length + tagDict.length, 4);
  trailer.writeUInt32LE(8, 8);
  trailer.writeUInt32LE(FILEDB_MAGIC, 12);
  return Buffer.concat([body, tagDict, attrDict, trailer]);
}

function i32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeInt32LE(n, 0);
  return b;
}

function i64(n: number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt(n), 0);
  return b;
}

function wide(s: string): Buffer {
  return Buffer.concat([Buffer.from(s, "utf16le"), Buffer.alloc(2)]);
}

function strg(pairs: { guid: number; amount: number }[]): Buffer {
  const b = Buffer.alloc(pairs.length * 8);
  pairs.forEach((pair, i) => {
    b.writeInt32LE(pair.guid, i * 8);
    b.writeInt32LE(pair.amount, i * 8 + 4);
  });
  return b;
}

const WOOD = 1010196;
const FISH = 1010200;

const INNER_TAGS = {
  GameSessionManager: 1,
  AreaInfo: 2,
  Owner: 3,
  AreaManagers: 4,
  AreaManager_8451: 5,
  AreaManager_9219: 6,
  AreaStorageManager: 7,
  None: 90,
};
const INNER_ATTRS = {
  Identifier: 1,
  CityName: 2,
  CityNameGuid: 3,
  id: 4,
  StrgLrg: 5,
  GameTime: 6,
  SessionTotalTime: 7,
};

function sessionInner(opts?: { renameSecond?: string }): Buffer {
  const secondName: Rec[] = opts?.renameSecond
    ? [{ leaf: INNER_ATTRS.CityName, payload: wide(opts.renameSecond) }]
    : [{ leaf: INNER_ATTRS.CityNameGuid, payload: i32(999001) }];
  return encodeFileDb(
    [
      { open: INNER_TAGS.GameSessionManager },
      { leaf: INNER_ATTRS.GameTime, payload: i32(12_000) },
      { leaf: INNER_ATTRS.SessionTotalTime, payload: i64(31_807_800) },
      { open: INNER_TAGS.AreaInfo },
      { open: INNER_TAGS.None },
      { leaf: INNER_ATTRS.Identifier, payload: i32(8451) },
      { leaf: INNER_ATTRS.CityName, payload: wide("La Costa") },
      { open: INNER_TAGS.Owner },
      { leaf: INNER_ATTRS.id, payload: i32(0) },
      { close: true },
      { close: true },
      { open: INNER_TAGS.None },
      { leaf: INNER_ATTRS.Identifier, payload: i32(9219) },
      ...secondName,
      { open: INNER_TAGS.Owner },
      { leaf: INNER_ATTRS.id, payload: i32(0) },
      { close: true },
      { close: true },
      { close: true },
      { open: INNER_TAGS.AreaManagers },
      { open: INNER_TAGS.AreaManager_8451 },
      { open: INNER_TAGS.AreaStorageManager },
      { leaf: INNER_ATTRS.StrgLrg, payload: strg([{ guid: WOOD, amount: 10 }]) },
      { close: true },
      { close: true },
      { open: INNER_TAGS.AreaManager_9219 },
      { open: INNER_TAGS.AreaStorageManager },
      { leaf: INNER_ATTRS.StrgLrg, payload: strg([{ guid: WOOD, amount: 50 }, { guid: FISH, amount: 7 }]) },
      { close: true },
      { close: true },
      { close: true },
      { close: true },
    ],
    Object.fromEntries(Object.entries(INNER_TAGS).map(([name, id]) => [id, name])),
    Object.fromEntries(Object.entries(INNER_ATTRS).map(([name, id]) => [id, name])),
  );
}

const OUTER_TAGS = {
  MetaGameManager: 1,
  GameSessions: 2,
  SessionDesc: 3,
  SessionTradeRouteManager: 4,
  RouteMap: 5,
  Stations: 6,
  Owner: 7,
  None: 90,
};
const OUTER_ATTRS = {
  SessionGUID: 1,
  SessionData: 2,
  AreaID: 3,
  id: 4,
  Name: 5,
};

function buildSave(inner = sessionInner()): Buffer {
  return encodeFileDb(
    [
      { open: OUTER_TAGS.MetaGameManager },
      { open: OUTER_TAGS.GameSessions },
      { open: OUTER_TAGS.None },
      { open: OUTER_TAGS.SessionDesc },
      { leaf: OUTER_ATTRS.SessionGUID, payload: i32(180023) },
      { close: true },
      { leaf: OUTER_ATTRS.SessionData, payload: inner },
      { close: true },
      { close: true },
      { open: OUTER_TAGS.SessionTradeRouteManager },
      { open: OUTER_TAGS.RouteMap },
      { open: OUTER_TAGS.None },
      { leaf: OUTER_ATTRS.Name, payload: wide("Tablones Costa - Otra") },
      { open: OUTER_TAGS.Owner },
      { leaf: OUTER_ATTRS.id, payload: i32(0) },
      { close: true },
      { open: OUTER_TAGS.Stations },
      { open: OUTER_TAGS.None },
      { leaf: OUTER_ATTRS.AreaID, payload: i32(8451) },
      { close: true },
      { open: OUTER_TAGS.None },
      { leaf: OUTER_ATTRS.AreaID, payload: i32(9219) },
      { close: true },
      { close: true },
      { close: true },
      { close: true },
      { close: true },
      { close: true },
    ],
    Object.fromEntries(Object.entries(OUTER_TAGS).map(([name, id]) => [id, name])),
    Object.fromEntries(Object.entries(OUTER_ATTRS).map(([name, id]) => [id, name])),
  );
}

describe("extractIslands nested FileDB", () => {
  it("keeps the same good independent on two player islands", () => {
    const { islands, meta } = extractIslands(buildSave());
    assert.equal(islands.length, 2);
    assert.equal(meta.simTime, 31_807_800);
    const costa = islands.find((row) => row.areaId === 8451);
    const other = islands.find((row) => row.areaId === 9219);
    assert.equal(costa?.regionId, 180023);
    assert.equal(costa?.ownerId, 0);
    assert.equal(costa?.name, "La Costa");
    assert.equal(costa?.nameSource, "city-name");
    assert.equal(costa?.stock?.find((g) => g.id === "wood")?.amount, 10);
    assert.equal(other?.name, "[999001]");
    assert.equal(other?.nameSource, "city-name-guid");
    assert.equal(other?.stock?.find((g) => g.id === "wood")?.amount, 50);
    assert.notEqual(
      costa?.stock?.find((g) => g.id === "wood")?.amount,
      other?.stock?.find((g) => g.id === "wood")?.amount,
    );
  });

  it("does not invent a CityName when only CityNameGuid is present", () => {
    const { islands } = extractIslands(buildSave());
    const other = islands.find((row) => row.areaId === 9219);
    assert.equal(other?.cityName, null);
    assert.equal(other?.name.startsWith("["), true);
    assert.notEqual(other?.name.toLowerCase().includes("inapetente"), true);
  });

  it("links trade-route stations by area id, not by display name", () => {
    const buf = buildSave();
    const { islands } = extractIslands(buf);
    const routes = extractTradeRoutes(buf);
    assert.equal(routes[0]?.stations[0]?.areaId, 8451);
    assert.equal(routes[0]?.stations[1]?.areaId, 9219);
    assert.equal(islandByAreaId(islands, 8451)?.name, "La Costa");
    assert.equal(islandByAreaId(islands, 9219)?.name, "[999001]");
    assert.equal(islandByAreaId(islands, 1), null);
  });

  it("prefers lastSnapshot over session clocks when both exist", () => {
    const inner = sessionInner();
    const buf = encodeFileDb(
      [
        { open: OUTER_TAGS.MetaGameManager },
        { leaf: 9, payload: i64(31_805_300) },
        { open: OUTER_TAGS.GameSessions },
        { open: OUTER_TAGS.None },
        { open: OUTER_TAGS.SessionDesc },
        { leaf: OUTER_ATTRS.SessionGUID, payload: i32(180023) },
        { close: true },
        { leaf: OUTER_ATTRS.SessionData, payload: inner },
        { close: true },
        { close: true },
        { close: true },
      ],
      Object.fromEntries(Object.entries(OUTER_TAGS).map(([name, id]) => [id, name])),
      {
        ...Object.fromEntries(Object.entries(OUTER_ATTRS).map(([name, id]) => [id, name])),
        9: "lastSnapshot",
      },
    );
    assert.equal(extractIslands(buf).meta.simTime, 31_805_300);
  });

  it("keeps identity when the player later renames the island", () => {
    const before = extractIslands(buildSave()).islands.find((row) => row.areaId === 9219);
    const after = extractIslands(buildSave(sessionInner({ renameSecond: "Puerto Nuevo" }))).islands.find(
      (row) => row.areaId === 9219,
    );
    assert.equal(before?.regionId, after?.regionId);
    assert.equal(before?.areaId, after?.areaId);
    assert.equal(after?.name, "Puerto Nuevo");
    assert.equal(after?.nameSource, "city-name");
  });
});

describe("resolveIslandName", () => {
  it("prefers CityName, then translation, then bracketed GUID evidence", () => {
    assert.deepEqual(resolveIslandName({ cityName: "La Costa", cityNameGuid: 1, areaId: 3 }), {
      name: "La Costa",
      nameSource: "city-name",
    });
    assert.deepEqual(
      resolveIslandName({
        cityName: null,
        cityNameGuid: 77,
        areaId: 3,
        translate: (guid) => (guid === 77 ? "Ditchwater" : undefined),
      }),
      { name: "Ditchwater", nameSource: "city-name-guid" },
    );
    assert.deepEqual(resolveIslandName({ cityName: null, cityNameGuid: 77, areaId: 3 }), {
      name: "[77]",
      nameSource: "city-name-guid",
    });
    assert.deepEqual(resolveIslandName({ cityName: null, cityNameGuid: null, areaId: 8451 }), {
      name: "area-8451",
      nameSource: "neutral",
    });
  });
});
