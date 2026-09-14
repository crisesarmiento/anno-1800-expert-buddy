import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNestedFileDbTree, isNestedFileDb } from "./a7s-read.ts";

const FILEDB_MAGIC = 0xfffffffd;

// Same tiny encoder as a7s-trade-routes.test.ts -- see that file for format notes.
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

describe("parseNestedFileDbTree", () => {
  it("re-enters a leaf whose payload is itself a FileDB, like SessionData/BinaryData", () => {
    const inner = encodeFileDb(
      [
        { open: 10 }, // AreaInfo
        { leaf: 1, payload: i32(777) }, // CityNameGuid
        { close: true },
      ],
      { 10: "AreaInfo" },
      { 1: "CityNameGuid" },
    );
    const outer = encodeFileDb(
      [
        { open: 1 }, // GameSessionManager
        { leaf: 2, payload: inner }, // BinaryData
        { close: true },
      ],
      { 1: "GameSessionManager" },
      { 2: "BinaryData" },
    );

    assert.equal(isNestedFileDb(inner), true);
    const root = parseNestedFileDbTree(outer);
    assert.ok(root);
    const gsm = root!.children.find((c) => c.tag === "GameSessionManager");
    assert.ok(gsm);
    // The BinaryData leaf's bytes are preserved...
    assert.equal(gsm!.leaves.find((l) => l.attr === "BinaryData")?.bytes.length, inner.length);
    // ...and also transparently expanded into a child node so nested
    // structure (AreaInfo/CityNameGuid) is reachable without a second call.
    const binaryDataChild = gsm!.children.find((c) => c.tag === "BinaryData");
    assert.ok(binaryDataChild);
    const areaInfo = binaryDataChild!.children.find((c) => c.tag === "AreaInfo");
    assert.ok(areaInfo);
    assert.equal(areaInfo!.leaves[0]?.attr, "CityNameGuid");
    assert.equal(areaInfo!.leaves[0]?.bytes.readInt32LE(0), 777);
  });

  it("returns a root node with no children for a FileDB with only a top-level leaf", () => {
    const buf = encodeFileDb([{ leaf: 1, payload: i32(1) }], {}, { 1: "Foo" });
    const root = parseNestedFileDbTree(buf);
    assert.ok(root);
    assert.deepEqual(root!.children, []);
    assert.equal(root!.leaves[0]?.attr, "Foo");
  });

  it("returns null for a non-FileDB buffer", () => {
    assert.equal(parseNestedFileDbTree(Buffer.from("nope")), null);
  });
});
