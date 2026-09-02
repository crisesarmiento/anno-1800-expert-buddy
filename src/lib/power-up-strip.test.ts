import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { LOCALES, UI } from "./i18n.ts";

const panel = readFileSync(new URL("../components/live-panel.tsx", import.meta.url), "utf8");

function sliceFn(src: string, name: string) {
  const start = src.indexOf(`export function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const next = src.indexOf("\nexport function ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe("PowerUpStrip website collapse + install copy", () => {
  const power = sliceFn(panel, "PowerUpSection");

  it("starts collapsed and is not opened by a live snapshot", () => {
    assert.match(power, /data-power-up-strip=/);
    assert.match(power, /useState\(false\)/);
    assert.doesNotMatch(power, /useState\(\(\) => Boolean\(liveSnapshot\)\)/);
    assert.doesNotMatch(power, /const liveSnapshot = useHarbor/);
    assert.match(power, /open=\{open\}/);
    assert.match(power, /onToggle=\{\(event\) => setOpen\(event\.currentTarget\.open\)\}/);
  });

  it("shows a short install flow when expanded", () => {
    assert.match(power, /t\.power\.expand/);
    assert.match(power, /t\.power\.collapse/);
    assert.match(power, /t\.power\.s1/);
    assert.match(power, /t\.power\.s2/);
    assert.match(power, /t\.power\.s3/);
    assert.match(power, /t\.install\.dlZipBtn/);
    assert.match(power, /<LivePanel \/>/);
    assert.match(power, /to="\/instalar"/);
  });

  it("stays usable at supported viewports", () => {
    assert.match(power, /min-h-11/);
    assert.match(power, /flex-wrap/);
    assert.match(power, /sm:text-2xl/);
    assert.match(power, /sm:p-6/);
  });

  it("does not add or edit Windows installer scripts", () => {
    assert.doesNotMatch(power, /writeFile|fs\.|spawn\(|exec\(/);
    assert.match(power, /href="\/install-harbor-buddy\.bat"/);
    assert.match(power, /href="\/watch-harbor-live\.bat"/);
  });

  it("keeps install copy in every locale", () => {
    for (const locale of LOCALES) {
      const dict = UI[locale].power;
      assert.ok(dict.expand.length > 0, locale);
      assert.ok(dict.collapse.length > 0, locale);
      assert.ok(dict.s1.length > 12, locale);
      assert.ok(dict.s2.length > 12, locale);
      assert.ok(dict.s3.length > 12, locale);
    }
  });
});
