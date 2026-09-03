import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const src = readFileSync(new URL("./stamps.tsx", import.meta.url), "utf8");

function block(start: string, end: string): string {
  const startIndex = src.indexOf(start);
  assert.ok(startIndex >= 0, `missing ${start}`);
  const endIndex = src.indexOf(end, startIndex);
  assert.ok(endIndex >= 0, `missing ${end} after ${start}`);
  return src.slice(startIndex + start.length, endIndex);
}

function topLevelKeys(text: string): string[] {
  const keys: string[] = [];
  for (const match of text.matchAll(/^\s{2}(?:"([\w-]+)"|([\w-]+)):/gm)) {
    keys.push(match[1] ?? match[2]!);
  }
  return keys;
}

describe("goods stamps", () => {
  it("maps every GOOD_STAMP icon to an original ICONS glyph, not an <img>", () => {
    assert.doesNotMatch(src, /<img\b/);
    const icons = topLevelKeys(block("const ICONS: Record<string, ReactNode> = {", "\nexport function Stamp"));
    const goodStampBlock = block("export const GOOD_STAMP: Record<GoodId, string> = {", "\n};");
    const goodIcons = [...goodStampBlock.matchAll(/:\s*"([\w-]+)"/g)].map((m) => m[1]!);
    assert.ok(goodIcons.length >= 30, "expected most goods to have a dedicated icon");
    for (const icon of goodIcons) {
      assert.ok(icons.includes(icon), `GOOD_STAMP icon "${icon}" has no ICONS glyph`);
    }
  });

  it("keeps fish reading as fish, the recognizability bar for goods", () => {
    const goodStampBlock = block("export const GOOD_STAMP: Record<GoodId, string> = {", "\n};");
    assert.match(goodStampBlock, /fish:\s*"fish"/);
  });
});
