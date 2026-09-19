import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { UI } from "../lib/i18n.ts";

const panel = readFileSync(new URL("./install-panel.tsx", import.meta.url), "utf8");

describe("/instalar — OCR extractor block translates through i18n, no auto-download", () => {
  it("reads every OCR string from t.install.nativeOcr instead of hardcoding Spanish", () => {
    assert.match(panel, /t\.install\.nativeOcr\.kicker/);
    assert.match(panel, /t\.install\.nativeOcr\.title/);
    assert.match(panel, /t\.install\.nativeOcr\.copy/);
    assert.match(panel, /t\.install\.nativeOcr\.note/);
    assert.match(panel, /t\.install\.nativeOcr\.download/);
  });

  it("links to the UXEnhancer release instead of redistributing the binary", () => {
    assert.match(
      panel,
      /https:\/\/github\.com\/NiHoel\/Anno1800UXEnhancer\/releases\/latest/,
    );
  });

  it("does not auto-download the external extractor (no download attribute on that link)", () => {
    const start = panel.indexOf("data-native-ocr-install");
    assert.ok(start >= 0);
    const end = panel.indexOf("</li>", start);
    const block = panel.slice(start, end);
    assert.doesNotMatch(block, /\bdownload=/);
  });

  it("every locale defines the nativeOcr install copy", () => {
    for (const dict of Object.values(UI)) {
      assert.equal(typeof dict.install.nativeOcr.kicker, "string");
      assert.equal(typeof dict.install.nativeOcr.title, "string");
      assert.equal(typeof dict.install.nativeOcr.copy, "string");
      assert.equal(typeof dict.install.nativeOcr.note, "string");
      assert.equal(typeof dict.install.nativeOcr.download, "string");
    }
  });
});
