import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractFleet, liveFleetFromExtracted } from "./a7s-fleet.ts";

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

function wide(s: string): Buffer {
  return Buffer.concat([Buffer.from(s, "utf16le"), Buffer.alloc(2)]);
}

const TAGS = {
  GameSessionManager: 1,
  AreaManagers: 2,
  AreaManager_3: 3,
  AreaObjectManager: 4,
  GameObject: 5,
  objects: 6,
  Nameable: 7,
  Owner: 8,
  PropertyTradeRouteVehicle: 9,
  MetaPersistent: 10,
  SessionTradeRouteManager: 11,
  RouteMap: 12,
};
const ATTRS = {
  guid: 1,
  VehicleName: 2,
  id: 3,
  TradeRouteID: 4,
  MetaID: 5,
  ID: 6,
  Name: 7,
  SessionGUID: 8,
};
const ITEM = 90;

function buildFleetA7s(): Buffer {
  const recs: Rec[] = [
    { open: TAGS.GameSessionManager },
    { leaf: ATTRS.SessionGUID, payload: i32(180023) },
    { open: TAGS.AreaManagers },
    { open: TAGS.AreaManager_3 },
    { open: TAGS.AreaObjectManager },
    { open: TAGS.GameObject },
    { open: TAGS.objects },
    { open: ITEM },
    { leaf: ATTRS.guid, payload: i32(100438) },
    { open: TAGS.Owner },
    { leaf: ATTRS.id, payload: i32(0) },
    { close: true },
    { open: TAGS.Nameable },
    { leaf: ATTRS.VehicleName, payload: wide("Conflicto") },
    { close: true },
    { open: TAGS.PropertyTradeRouteVehicle },
    { leaf: ATTRS.TradeRouteID, payload: i32(26) },
    { close: true },
    { open: TAGS.MetaPersistent },
    { leaf: ATTRS.MetaID, payload: i32(88) },
    { close: true },
    { close: true },
    { open: ITEM },
    { leaf: ATTRS.guid, payload: i32(100439) },
    { open: TAGS.Owner },
    { leaf: ATTRS.id, payload: i32(0) },
    { close: true },
    { open: TAGS.Nameable },
    { leaf: ATTRS.VehicleName, payload: wide("Heraldo") },
    { close: true },
    { close: true },
    { open: ITEM },
    { leaf: ATTRS.guid, payload: i32(100439) },
    { open: TAGS.Owner },
    { leaf: ATTRS.id, payload: i32(2) },
    { close: true },
    { open: TAGS.Nameable },
    { leaf: ATTRS.VehicleName, payload: wide("Blake") },
    { close: true },
    { close: true },
    { open: ITEM },
    { leaf: ATTRS.guid, payload: i32(100438) },
    { open: TAGS.Nameable },
    { leaf: ATTRS.VehicleName, payload: wide("SinDueño") },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
  ];
  const withRoutes: Rec[] = [
    { open: 20 },
    ...recs,
    { open: TAGS.SessionTradeRouteManager },
    { open: TAGS.RouteMap },
    { open: ITEM },
    { leaf: ATTRS.ID, payload: i32(26) },
    { leaf: ATTRS.Name, payload: wide("Tablones La - Les") },
    { open: TAGS.Owner },
    { leaf: ATTRS.id, payload: i32(0) },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
    { close: true },
  ];
  const tagNames = {
    ...Object.fromEntries(Object.entries(TAGS).map(([name, id]) => [id, name])),
    20: "MetaGameManager",
  };
  const attrNames = Object.fromEntries(Object.entries(ATTRS).map(([name, id]) => [id, name]));
  return encodeFileDb(withRoutes, tagNames, attrNames);
}

describe("extractFleet", () => {
  it("keeps participant 0 ships only and does not invent idle or NPC hulls", () => {
    const ships = extractFleet(buildFleetA7s());
    assert.equal(ships.length, 2);
    assert.equal(ships.every((ship) => ship.ownerId === 0), true);
    assert.equal(ships.some((ship) => ship.name === "Blake"), false);
    assert.equal(ships.some((ship) => ship.name === "SinDueño"), false);
    const trade = ships.find((ship) => ship.name === "Conflicto");
    assert.equal(trade?.guid, 100438);
    assert.equal(trade?.routeId, 26);
    assert.equal(trade?.areaId, 3);
    const military = ships.find((ship) => ship.name === "Heraldo");
    assert.equal(military?.routeId, null);
  });

  it("does not write catalog upkeep onto the save ship", () => {
    const live = liveFleetFromExtracted(extractFleet(buildFleetA7s()), buildFleetA7s());
    assert.equal(live[0] && "maintenance" in live[0], false);
    const assigned = live.find((ship) => ship.name === "Conflicto");
    assert.equal(assigned?.assignment?.kind, "trade-route");
    assert.equal(assigned?.assignment?.routeName, "Tablones La - Les");
    assert.equal(assigned?.kind, "trade");
    const idleLooking = live.find((ship) => ship.name === "Heraldo");
    assert.equal(idleLooking?.assignment, undefined);
    assert.equal(idleLooking?.kind, "military");
  });
});
