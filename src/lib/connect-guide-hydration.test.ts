import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { LOCALES, UI } from "./i18n.ts";

const i18nSrc = readFileSync(new URL("./i18n.ts", import.meta.url), "utf8");
const guideSrc = readFileSync(new URL("../components/connect-guide.tsx", import.meta.url), "utf8");
const useTSrc = readFileSync(new URL("./use-t.ts", import.meta.url), "utf8");

describe("ConnectGuide hydration copy", () => {
  it("keeps connect.s6 as one string so curly quotes cannot split the dict", () => {
    for (const locale of LOCALES) {
      const s6 = UI[locale].connect.s6;
      assert.equal(typeof s6, "string", locale);
      assert.ok(s6.length > 40, locale);
    }
    assert.match(UI.es.connect.s6, /Escribí lo que ves en el diario/);
    assert.match(UI.es.connect.s6, /JSON viene vacío/);
  });

  it("does not put raw typographic quotes in connect.s6 source", () => {
    const s6Lines = i18nSrc.split(/\r?\n/).filter((line) => /^\s*s6:/.test(line));
    assert.equal(s6Lines.length, LOCALES.length);
    for (const line of s6Lines) {
      assert.equal(/\u201C|\u201D|\u201E/.test(line), false, line);
      assert.match(line, /\\u201[CDE]/);
    }
  });

  it("renders each step as one text node (no adjacent index + copy)", () => {
    assert.match(guideSrc, /\$\{index \+ 1\}\. \$\{step\}/);
    assert.doesNotMatch(guideSrc, /\{index \+ 1\}\. <\/span>/);
  });

  it("holds locale-dependent copy at DEFAULT_LOCALE until after mount", () => {
    assert.match(useTSrc, /DEFAULT_LOCALE/);
    assert.match(useTSrc, /useState\(false\)/);
    assert.match(useTSrc, /ready \? locale : DEFAULT_LOCALE/);
  });
});
