import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { ingestLiveJsonText } from "./validate.ts";
import { HARBOR_LIVE_LAST_GOOD, HARBOR_LIVE_NAME, ingestLivePreferLastGood } from "./crash-safe.ts";
import { readHarborLiveCrashSafe, writeHarborLiveCrashSafe } from "./crash-safe-node.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixture.json", import.meta.url), "utf8")) as Record<
  string,
  unknown
>;

const good = JSON.stringify({
  ...fixture,
  sessionName: "Autosave",
});

const goodLater = JSON.stringify({
  ...fixture,
  sessionName: "Quicksave",
  updatedAt: "2026-09-02T18:00:00.000Z",
});

describe("crash-safe harbor-live.json", () => {
  it("falls back to last-good when primary JSON is corrupt", () => {
    const result = ingestLivePreferLastGood({
      primary: "{\"schema\":\"harbor-live-v1\",",
      lastGood: good,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.usedLastGood, true);
    assert.equal(result.snapshot.sessionName, "Autosave");
  });

  it("fails silent (no empty-state scream) when primary is corrupt and last-good is missing", () => {
    const result = ingestLivePreferLastGood({
      primary: "not-json{{{",
      lastGood: null,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.silent, true);
    assert.equal(result.kind, "broken");
  });

  it("keeps a normal schema error loud — that is not a crash-corrupt file", () => {
    const result = ingestLivePreferLastGood({
      primary: JSON.stringify({ schema: "harbor-live-v0", quests: [] }),
      lastGood: good,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.notEqual(result.silent, true);
  });

  it("writes tmp → fsync → rename, then last-good; corrupt dest still reads last-good", () => {
    const dir = mkdtempSync(join(tmpdir(), "harbor-live-"));
    try {
      writeHarborLiveCrashSafe(dir, good);
      const dest = join(dir, HARBOR_LIVE_NAME);
      const lastGood = join(dir, HARBOR_LIVE_LAST_GOOD);
      assert.equal(JSON.parse(readFileSync(dest, "utf8")).sessionName, "Autosave");
      assert.equal(JSON.parse(readFileSync(lastGood, "utf8")).sessionName, "Autosave");

      writeHarborLiveCrashSafe(dir, goodLater);
      assert.equal(JSON.parse(readFileSync(dest, "utf8")).sessionName, "Quicksave");

      writeFileSync(dest, "{\"schema\":\"harbor-live-v1\", truncated");
      const result = readHarborLiveCrashSafe(dir);
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.usedLastGood, true);
      assert.equal(result.snapshot.sessionName, "Quicksave");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses to write anything but harbor-live.json in the target dir", () => {
    const dir = mkdtempSync(join(tmpdir(), "harbor-live-"));
    try {
      assert.throws(() => writeHarborLiveCrashSafe(dir, "nope"));
      writeHarborLiveCrashSafe(dir, good);
      assert.equal(readFileSync(join(dir, HARBOR_LIVE_NAME), "utf8").includes("Autosave"), true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("plain ingest still reports broken JSON (watcher/app split the silent path)", () => {
    const result = ingestLiveJsonText("{\"schema\":");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.kind, "broken");
  });

  it("watcher source uses same-volume tmp fsync rename + last-good, never WriteAllText dest", () => {
    const ps = readFileSync(new URL("../../../public/watch-harbor-live.ps1", import.meta.url), "utf8");
    assert.match(ps, /function Write-HarborLiveCrashSafe/);
    assert.match(ps, /Flush\(\$true\)/);
    assert.match(ps, /harbor-live\.last-good\.json/);
    assert.match(ps, /\[System\.IO\.File\]::Replace\(/);
    assert.match(ps, /\$backup = "\$target\.bak"/);
    assert.doesNotMatch(ps, /File\]::Replace\([^)]*\$null/);
    assert.doesNotMatch(ps, /WriteAllText\(\$outJson/);
    assert.doesNotMatch(ps, /WriteAll(?:Bytes|Text)\(\$save/);
    assert.match(ps, /schema\s+=\s+"harbor-live-v1"/);
    assert.match(ps, /accountdata\.a7s/);
    assert.match(ps, /HarborBuddy\.A7sScan/);
  });
});
