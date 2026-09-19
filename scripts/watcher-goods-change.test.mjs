import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const watcher = readFileSync(new URL("../public/watch-harbor-live.ps1", import.meta.url), "utf8");
const bundledWatcher = readFileSync(
  new URL("../public/watch-harbor-live.bat", import.meta.url),
  "utf8",
);

describe("save-to-save goods evidence for route health", () => {
  it("compares only distinct saves from the same session", () => {
    assert.match(watcher, /\$previousPayload\.sessionName -eq \$sessionName/);
    assert.match(watcher, /\$previousPayload\.savedAt -ne \$currentSavedAt/);
    assert.match(watcher, /\$previousGoodsById/);
  });

  it("writes raw deltas and their previous save timestamp", () => {
    assert.match(watcher, /previousAmount\s+= \[int\]\$previousGood\.amount/);
    assert.match(watcher, /amount\s+= \[int\]\$good\.amount/);
    assert.match(watcher, /delta\s+= \$delta/);
    assert.match(watcher, /previousSavedAt = \[string\]\$previousPayload\.savedAt/);
    assert.match(watcher, /\$telemetry\.goodsChanges = @\(\$goodsChanges\)/);
  });

  it("adds the catalog id to route cargo for reliable matching", () => {
    assert.match(watcher, /\$knownGood = \$guidByNumber\[\[string\]\$good\.guid\]/);
    assert.match(watcher, /\$routeGood\.id = \[string\]\$knownGood\.id/);
  });

  it("ships the same evidence fields in the standalone bat", () => {
    assert.match(bundledWatcher, /\$telemetry\.goodsChanges = @\(\$goodsChanges\)/);
    assert.match(bundledWatcher, /previousSavedAt = \[string\]\$previousPayload\.savedAt/);
    assert.match(bundledWatcher, /\$routeGood\.id = \[string\]\$knownGood\.id/);
  });
});
