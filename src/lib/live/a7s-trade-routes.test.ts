import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractRouteShips,
  extractRouteVisits,
  extractTradeRoutes,
  summarizeRouteDeliveries,
} from "./a7s-trade-routes.ts";

const FILEDB_MAGIC = 0xfffffffd;

// Minimal encoder for the RDA FileDB node format used by a7s-read.ts:
// each record is an 8-byte header [size:u32][id:u16][pad:u16] followed,
// for leaves (id & 0x8000), by `size` payload bytes padded to a multiple
// of 8. The stream is followed by a tag-name dict, an attr-name dict, and
// a 16-byte trailer [tagOff][attrOff][headerSize=8][magic=0xfffffffd].
// See docs/filedb-spike-routes.md for the format notes this mirrors.
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

function encodeFileDb(recs: Rec[], tagNames: Record<number, string>, attrNames: Record<number, string>): Buffer {
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

function wide(s: string): Buffer {
  return Buffer.concat([Buffer.from(s, "utf16le"), Buffer.alloc(2)]);
}

function int64Array(ids: number[]): Buffer {
  const b = Buffer.alloc(ids.length * 8);
  ids.forEach((id, i) => b.writeBigInt64LE(BigInt(id), i * 8));
  return b;
}

const TAGS = {
  MetaGameManager: 1,
  SessionTradeRouteManager: 2,
  RouteMap: 3,
  Owner: 11,
  Stations: 12,
  GoodInfos: 13,
  Nameable: 14,
  PropertyTradeRouteVehicle: 15,
  TradedGoods: 16,
};
const ATTRS = {
  ID: 1,
  Name: 2,
  IsDefaultName: 3,
  id: 4,
  Ships: 5,
  AreaID: 6,
  ProductGUID: 7,
  Amount: 8,
  IsLoading: 9,
  VehicleName: 10,
  TradeRouteID: 11,
  RouteID: 12,
  ExecutionTime: 13,
  Finalized: 14,
  GoodGuid: 15,
  GoodAmount: 16,
};
const UNNAMED_TAG = 90; // route/station/good instances -- real saves also fall back to "tag_N"

function buildDataA7s(): Buffer {
  const recs: Rec[] = [
    { open: TAGS.MetaGameManager },
    { open: TAGS.SessionTradeRouteManager },
    { open: TAGS.RouteMap },
    // Route 1: player-named, one ship, one station with one good.
    { open: UNNAMED_TAG },
    { leaf: ATTRS.ID, payload: i32(101) },
    { leaf: ATTRS.Name, payload: wide("Ruta Uno") },
    { leaf: ATTRS.IsDefaultName, payload: Buffer.from([0]) },
    { open: TAGS.Owner },
    { leaf: ATTRS.id, payload: i32(7) },
    { close: true },
    { leaf: ATTRS.Ships, payload: int64Array([500, 501]) },
    { open: TAGS.Stations },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.AreaID, payload: i32(42) },
    { open: TAGS.GoodInfos },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.ProductGUID, payload: i32(1010266) },
    { leaf: ATTRS.Amount, payload: i32(12) },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
    { close: true }, // route 1
    // Route 2: default name, no ships, no stations.
    { open: UNNAMED_TAG },
    { leaf: ATTRS.ID, payload: i32(102) },
    { leaf: ATTRS.Name, payload: wide("Nueva ruta de comercio") },
    { leaf: ATTRS.IsDefaultName, payload: Buffer.from([1]) },
    { open: TAGS.Owner },
    { leaf: ATTRS.id, payload: i32(3) },
    { close: true },
    { close: true }, // route 2
    { close: true }, // RouteMap
    { close: true }, // SessionTradeRouteManager
    { close: true }, // MetaGameManager
  ];
  const tagNames = Object.fromEntries(Object.entries(TAGS).map(([name, id]) => [id, name]));
  const attrNames = Object.fromEntries(Object.entries(ATTRS).map(([name, id]) => [id, name]));
  return encodeFileDb(recs, tagNames, attrNames);
}

describe("extractTradeRoutes", () => {
  it("reads routes, stations, goods, ships and owner from a tiny FileDB fixture", () => {
    const routes = extractTradeRoutes(buildDataA7s());
    assert.equal(routes.length, 2);

    const [r1, r2] = routes;
    assert.equal(r1.id, 101);
    assert.equal(r1.name, "Ruta Uno");
    assert.equal(r1.isDefaultName, false);
    assert.equal(r1.ownerId, 7);
    assert.deepEqual(r1.shipIds, [500, 501]);
    assert.equal(r1.stations.length, 1);
    assert.equal(r1.stations[0].areaId, 42);
    assert.deepEqual(r1.stations[0].goods, [{ guid: 1010266, amount: 12, isLoading: null }]);

    assert.equal(r2.id, 102);
    assert.equal(r2.name, "Nueva ruta de comercio");
    assert.equal(r2.isDefaultName, true);
    assert.equal(r2.ownerId, 3);
    assert.deepEqual(r2.shipIds, []);
    assert.deepEqual(r2.stations, []);
  });

  it("returns an empty list when SessionTradeRouteManager/RouteMap is absent", () => {
    const recs: Rec[] = [{ open: TAGS.MetaGameManager }, { close: true }];
    const tagNames = { [TAGS.MetaGameManager]: "MetaGameManager" };
    const buf = encodeFileDb(recs, tagNames, {});
    assert.deepEqual(extractTradeRoutes(buf), []);
  });

  it("returns an empty list for a non-FileDB buffer", () => {
    assert.deepEqual(extractTradeRoutes(Buffer.from("not a filedb")), []);
  });
});

function i64(n: number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt(n), 0);
  return b;
}

function buildLogisticsA7s(): Buffer {
  const recs: Rec[] = [
    { open: TAGS.MetaGameManager },
    { open: TAGS.SessionTradeRouteManager },
    { open: TAGS.RouteMap },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.ID, payload: i32(26) },
    { leaf: ATTRS.Name, payload: wide("Tablones La - Les") },
    { open: TAGS.Owner },
    { leaf: ATTRS.id, payload: i32(0) },
    { close: true },
    { leaf: ATTRS.Ships, payload: int64Array([177]) },
    { open: TAGS.Stations },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.AreaID, payload: i32(8451) },
    { open: TAGS.GoodInfos },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.ProductGUID, payload: i32(1010196) },
    { leaf: ATTRS.Amount, payload: i32(20) },
    { close: true },
    { close: true },
    { close: true },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.AreaID, payload: i32(9219) },
    { open: TAGS.GoodInfos },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.ProductGUID, payload: i32(1010196) },
    { leaf: ATTRS.Amount, payload: i32(20) },
    { leaf: ATTRS.IsLoading, payload: Buffer.from([0]) },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
    { open: UNNAMED_TAG },
    { open: TAGS.Nameable },
    { leaf: ATTRS.VehicleName, payload: wide("Conflicto") },
    { close: true },
    { open: TAGS.PropertyTradeRouteVehicle },
    { leaf: ATTRS.TradeRouteID, payload: i32(26) },
    { close: true },
    { close: true },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.RouteID, payload: i32(26) },
    { leaf: ATTRS.AreaID, payload: i32(8451) },
    { leaf: ATTRS.ExecutionTime, payload: i64(10_000) },
    { leaf: ATTRS.Finalized, payload: Buffer.from([1]) },
    { open: TAGS.TradedGoods },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.GoodGuid, payload: i32(1010196) },
    { leaf: ATTRS.GoodAmount, payload: i32(-12) },
    { close: true },
    { close: true },
    { close: true },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.RouteID, payload: i32(26) },
    { leaf: ATTRS.AreaID, payload: i32(9219) },
    { leaf: ATTRS.ExecutionTime, payload: i64(22_000) },
    { leaf: ATTRS.Finalized, payload: Buffer.from([1]) },
    { open: TAGS.TradedGoods },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.GoodGuid, payload: i32(1010196) },
    { leaf: ATTRS.GoodAmount, payload: i32(11) },
    { close: true },
    { close: true },
    { close: true },
  ];
  const tagNames = Object.fromEntries(Object.entries(TAGS).map(([name, id]) => [id, name]));
  const attrNames = Object.fromEntries(Object.entries(ATTRS).map(([name, id]) => [id, name]));
  return encodeFileDb(recs, tagNames, attrNames);
}

describe("stage 4 route fields from FileDB", () => {
  it("keeps missing IsLoading as null and false as unload, never inventing load", () => {
    const route = extractTradeRoutes(buildLogisticsA7s())[0];
    assert.equal(route.stations[0]?.goods[0]?.isLoading, null);
    assert.equal(route.stations[1]?.goods[0]?.isLoading, false);
  });

  it("names a ship only when VehicleName joins TradeRouteID", () => {
    const ships = extractRouteShips(buildLogisticsA7s());
    assert.deepEqual(ships, [{ routeId: 26, name: "Conflicto" }]);
  });

  it("summarizes finalized visits without treating signed amounts as direction", () => {
    const visits = extractRouteVisits(buildLogisticsA7s());
    assert.equal(visits.length, 2);
    assert.equal(visits[0]?.goods[0]?.amount, -12);
    const summary = summarizeRouteDeliveries(visits);
    assert.equal(summary[0]?.visitCount, 2);
    assert.equal(summary[0]?.intervalMsMedian, 12_000);
    assert.equal(summary[0]?.goods[0]?.medianAbsAmount, 12);
    assert.equal(summary[0]?.goods[0]?.lastAmount, 11);
    assert.equal(summary[0]?.stations.length, 2);
    assert.equal(summary[0]?.stations.find((row) => row.areaId === 9219)?.medianAbsAmount, 11);
  });
});

function buildAlternatingVisitsA7s(): Buffer {
  const recs: Rec[] = [
    { open: TAGS.MetaGameManager },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.RouteID, payload: i32(26) },
    { leaf: ATTRS.AreaID, payload: i32(8451) },
    { leaf: ATTRS.ExecutionTime, payload: i64(0) },
    { leaf: ATTRS.Finalized, payload: Buffer.from([1]) },
    { open: TAGS.TradedGoods },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.GoodGuid, payload: i32(1010196) },
    { leaf: ATTRS.GoodAmount, payload: i32(10) },
    { close: true },
    { close: true },
    { close: true },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.RouteID, payload: i32(26) },
    { leaf: ATTRS.AreaID, payload: i32(9219) },
    { leaf: ATTRS.ExecutionTime, payload: i64(60_000) },
    { leaf: ATTRS.Finalized, payload: Buffer.from([1]) },
    { open: TAGS.TradedGoods },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.GoodGuid, payload: i32(1010196) },
    { leaf: ATTRS.GoodAmount, payload: i32(-10) },
    { close: true },
    { close: true },
    { close: true },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.RouteID, payload: i32(26) },
    { leaf: ATTRS.AreaID, payload: i32(8451) },
    { leaf: ATTRS.ExecutionTime, payload: i64(120_000) },
    { leaf: ATTRS.Finalized, payload: Buffer.from([1]) },
    { open: TAGS.TradedGoods },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.GoodGuid, payload: i32(1010196) },
    { leaf: ATTRS.GoodAmount, payload: i32(10) },
    { close: true },
    { close: true },
    { close: true },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.RouteID, payload: i32(26) },
    { leaf: ATTRS.AreaID, payload: i32(9219) },
    { leaf: ATTRS.ExecutionTime, payload: i64(180_000) },
    { leaf: ATTRS.Finalized, payload: Buffer.from([1]) },
    { open: TAGS.TradedGoods },
    { open: UNNAMED_TAG },
    { leaf: ATTRS.GoodGuid, payload: i32(1010196) },
    { leaf: ATTRS.GoodAmount, payload: i32(-10) },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
  ];
  const tagNames = Object.fromEntries(Object.entries(TAGS).map(([name, id]) => [id, name]));
  const attrNames = Object.fromEntries(Object.entries(ATTRS).map(([name, id]) => [id, name]));
  return encodeFileDb(recs, tagNames, attrNames);
}

describe("P1-A deliveries per destination and good", () => {
  it("does not report 10 t/min when the destination receives 10 t every two minutes", () => {
    const visits = extractRouteVisits(buildAlternatingVisitsA7s());
    assert.equal(visits.length, 4);
    const summary = summarizeRouteDeliveries(visits);
    const dest = summary[0]?.stations.find((row) => row.areaId === 9219 && row.guid === 1010196);
    assert.equal(dest?.intervalMsMedian, 120_000);
    assert.equal(dest?.medianAbsAmount, 10);
    assert.equal(summary[0]?.intervalMsMedian, 60_000);
    const destTMin = dest?.intervalMsMedian
      ? dest.medianAbsAmount / (dest.intervalMsMedian / 60_000)
      : null;
    const mixedTMin = summary[0]?.intervalMsMedian
      ? 10 / (summary[0].intervalMsMedian / 60_000)
      : null;
    assert.equal(destTMin, 5);
    assert.equal(mixedTMin, 10);
  });
});
