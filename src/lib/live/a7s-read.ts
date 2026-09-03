import { inflateSync } from "node:zlib";

const RDA_MAGIC = "Resource File V2.2";
const FILEDB_MAGIC = 0xfffffffd;
const ENTRY_SIZE = 560;
const BLOCK_HEADER = 32;

export type RdaFile = { name: string; bytes: Buffer };

export type FileDbLeaf = {
  tagPath: string;
  attr: string;
  bytes: Buffer;
};

export type FileDbWalk = {
  tags: Map<number, string>;
  attrs: Map<number, string>;
  leaves: FileDbLeaf[];
};

function u32(buf: Buffer, off: number) {
  return buf.readUInt32LE(off);
}

function u64(buf: Buffer, off: number) {
  return Number(buf.readBigUInt64LE(off));
}

function wideName(buf: Buffer, off: number, bytes: number) {
  let out = "";
  const end = off + bytes;
  for (let i = off; i + 1 < end; i += 2) {
    const c = buf.readUInt16LE(i);
    if (c === 0) break;
    out += String.fromCharCode(c);
  }
  return out;
}

/** Concatenated zlib streams, empty stream terminator, trailing uint32 size. */
export function inflateConcat(payload: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let offset = 0;
  while (offset + 2 <= payload.length) {
    if (payload[offset] !== 0x78) break;
    try {
      const rest = payload.subarray(offset);
      const out = inflateSync(rest);
      if (out.length === 0) break;
      chunks.push(out);
      // Node inflateSync does not report consumed bytes. Scan for the next CMF
      // after this stream by walking zlib headers; fall back to finishing.
      let next = -1;
      for (let i = offset + 2; i + 1 < payload.length; i++) {
        if (payload[i] !== 0x78) continue;
        const flg = payload[i + 1];
        if (flg !== 0x01 && flg !== 0x9c && flg !== 0xda) continue;
        try {
          inflateSync(payload.subarray(i));
          next = i;
          break;
        } catch {
          /* not a stream start */
        }
      }
      if (next < 0) break;
      offset = next;
    } catch {
      break;
    }
  }
  if (chunks.length === 0) {
    try {
      return inflateSync(payload);
    } catch {
      return payload;
    }
  }
  return Buffer.concat(chunks);
}

export function listRdaFiles(buf: Buffer): { name: string; offset: number; stored: number }[] {
  if (buf.toString("ascii", 0, 18) !== RDA_MAGIC) return [];
  const files: { name: string; offset: number; stored: number }[] = [];
  let blockOff = u64(buf, 0x310);
  let guard = 0;
  while (blockOff && blockOff + BLOCK_HEADER <= buf.length && guard++ < 32) {
    const flags = u32(buf, blockOff);
    const dirStored = u64(buf, blockOff + 8);
    const next = u64(buf, blockOff + 24);
    let dir = buf.subarray(blockOff - dirStored, blockOff);
    if (flags & 1) {
      try {
        dir = inflateSync(dir);
      } catch {
        dir = Buffer.alloc(0);
      }
    }
    for (let i = 0; i + ENTRY_SIZE <= dir.length; i += ENTRY_SIZE) {
      const name = wideName(dir, i, 520);
      const offset = Number(dir.readBigUInt64LE(i + 520));
      const stored = Number(dir.readBigUInt64LE(i + 528));
      if (name) files.push({ name, offset, stored });
    }
    blockOff = next && next < buf.length ? next : 0;
  }
  return files;
}

export function unpackA7s(buf: Buffer): RdaFile[] {
  return listRdaFiles(buf).map((entry) => ({
    name: entry.name,
    bytes: inflateConcat(buf.subarray(entry.offset, entry.offset + entry.stored)),
  }));
}

function readCStrings(buf: Buffer, start: number, count: number, ids: number[]): Map<number, string> {
  const map = new Map<number, string>();
  let pos = start;
  for (let i = 0; i < count; i++) {
    const end = buf.indexOf(0, pos);
    const stop = end < 0 ? buf.length : end;
    map.set(ids[i] ?? i, buf.toString("utf8", pos, stop));
    pos = stop + 1;
  }
  return map;
}

function readDict(buf: Buffer, offset: number): Map<number, string> {
  if (offset < 0 || offset + 4 > buf.length) return new Map();
  const count = u32(buf, offset);
  if (count <= 0 || count > 50_000) return new Map();
  const ids: number[] = [];
  let pos = offset + 4;
  for (let i = 0; i < count; i++) {
    if (pos + 2 > buf.length) break;
    ids.push(buf.readUInt16LE(pos));
    pos += 2;
  }
  return readCStrings(buf, pos, ids.length, ids);
}

function findTrailer(buf: Buffer): { tagOff: number; attrOff: number; nodeEnd: number } | null {
  for (let end = buf.length; end >= 20; end--) {
    if (u32(buf, end - 4) !== FILEDB_MAGIC) continue;
    const headerSize = u32(buf, end - 8);
    if (headerSize !== 8) continue;
    const attrOff = u32(buf, end - 12);
    const tagOff = u32(buf, end - 16);
    if (tagOff > 0 && tagOff < buf.length && attrOff > 0 && attrOff < buf.length) {
      return { tagOff, attrOff, nodeEnd: tagOff };
    }
  }
  return null;
}

export function visitFileDb(
  buf: Buffer,
  onLeaf: (tagPath: string, attr: string, bytes: Buffer) => void,
): { tags: Map<number, string>; attrs: Map<number, string> } {
  const tags = new Map<number, string>();
  const attrs = new Map<number, string>();
  const trailer = findTrailer(buf);
  if (!trailer) return { tags, attrs };
  for (const [id, name] of readDict(buf, trailer.tagOff)) tags.set(id, name);
  for (const [id, name] of readDict(buf, trailer.attrOff)) attrs.set(id, name);

  const stack: string[] = [];
  let pos = 0;
  const end = trailer.nodeEnd;
  while (pos + 8 <= end) {
    const size = u32(buf, pos);
    const id = buf.readUInt16LE(pos + 4);
    pos += 8;
    if (id === 0) {
      stack.pop();
      continue;
    }
    if (id & 0x8000) {
      const payload = size > 0 ? buf.subarray(pos, Math.min(pos + size, end)) : Buffer.alloc(0);
      const pad = (8 - (size % 8)) % 8;
      pos += size + pad;
      const attr = attrs.get(id) ?? attrs.get(id & 0x7fff) ?? (id === 0x8000 ? "None" : `attr_${id}`);
      onLeaf(stack.join("/"), attr, payload);
      continue;
    }
    stack.push(tags.get(id) ?? `tag_${id}`);
  }
  return { tags, attrs };
}

export function walkFileDb(buf: Buffer, opts?: { maxLeaves?: number }): FileDbWalk {
  const leaves: FileDbLeaf[] = [];
  const maxLeaves = opts?.maxLeaves ?? 250_000;
  const { tags, attrs } = visitFileDb(buf, (tagPath, attr, bytes) => {
    if (leaves.length >= maxLeaves) return;
    leaves.push({ tagPath, attr, bytes: Buffer.from(bytes) });
  });
  return { tags, attrs, leaves };
}

export function leafI32(bytes: Buffer): number | null {
  if (bytes.length === 4) return bytes.readInt32LE(0);
  if (bytes.length === 2) return bytes.readUInt16LE(0);
  if (bytes.length === 8) {
    const n = bytes.readBigInt64LE(0);
    if (n > BigInt(Number.MAX_SAFE_INTEGER) || n < BigInt(Number.MIN_SAFE_INTEGER)) return null;
    return Number(n);
  }
  return null;
}

export function leafText(bytes: Buffer): string {
  if (bytes.length === 0) return "";
  if (bytes.length % 2 === 0) {
    const wide = bytes.toString("utf16le").replace(/\0+$/, "");
    if (wide.length >= 2 && /^[\x20-\x7e\u00a0-\u024f]+$/.test(wide)) return wide.trim();
  }
  const ascii = bytes.toString("utf8").replace(/\0+$/, "").trim();
  if (/^[\x20-\x7e]+$/.test(ascii)) return ascii;
  return "";
}
