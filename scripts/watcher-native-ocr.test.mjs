import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const watcher = readFileSync(new URL("../public/watch-harbor-live.ps1", import.meta.url), "utf8");
const launcher = readFileSync(new URL("../src/lib/launcher.ts", import.meta.url), "utf8");
const schema = JSON.parse(
  readFileSync(new URL("../docs/harbor-live.schema.json", import.meta.url), "utf8"),
);

describe("optional UXEnhancer OCR bridge", () => {
  it("polls loopback only and degrades to the save reader", () => {
    assert.match(watcher, /http:\/\/127\.0\.0\.1:8000\/AnnoServer\/Population/);
    assert.match(watcher, /Invoke-WebRequest[^\n]+-TimeoutSec 8/);
    assert.match(watcher, /OCR desconectado; sigo leyendo saves/);
    assert.doesNotMatch(watcher, /0\.0\.0\.0:8000|https:\/\/.*AnnoServer/);
  });

  it("keeps production and finance evidence per island before writing advice inputs", () => {
    assert.match(watcher, /nativeProductionByIsland/);
    assert.match(watcher, /nativeCountsByIsland/);
    assert.match(watcher, /requiredTMin/);
    assert.match(watcher, /buildingCount/);
    assert.match(watcher, /provider\s+=\s+"ux-enhancer-ocr"/);
  });

  it("launcher starts Server.exe only when the player placed it next to the launcher", () => {
    assert.match(launcher, /if exist "Server\.exe"/);
    assert.match(launcher, /UXEnhancer\\\\Server\.exe/);
    assert.match(launcher, /if defined HARBOR_OCR/);
    assert.doesNotMatch(launcher, /curl|Invoke-WebRequest|bitsadmin/);
  });

  it("schema exposes typed native evidence without changing the v1 required keys", () => {
    assert.deepEqual(schema.required, ["schema", "source", "updatedAt", "game", "quests"]);
    assert.equal(schema.properties.connection.properties.native.properties.provider.const, "ux-enhancer-ocr");
    assert.ok(schema.properties.telemetry.properties.production);
  });
});

describe("connection.nativeProbe (technical probe facts, separate from connection.native)", () => {
  it("classifies probe failures as timeout or connection_refused, never leaking .NET exception text", () => {
    assert.match(watcher, /function Get-NativeProbeReason/);
    assert.match(watcher, /System\.Net\.WebExceptionStatus\]::Timeout/);
    assert.match(watcher, /"timeout"/);
    assert.match(watcher, /"connection_refused"/);
    assert.match(watcher, /"bad_payload"/);
    assert.match(watcher, /"invalid_response"/);
  });

  it("never writes game-state words into the probe, only technical state", () => {
    assert.doesNotMatch(watcher, /state\s*=\s*"starting"/);
    assert.doesNotMatch(watcher, /state\s*=\s*"missing"/);
    assert.doesNotMatch(watcher, /state\s*=\s*"stale"/);
    assert.doesNotMatch(watcher, /state\s*=\s*"wrong_view"/);
  });

  it("dedupes rewrites on an identical failure and heartbeats otherwise", () => {
    assert.match(watcher, /nativeLastSignature/);
    assert.match(watcher, /nativeHeartbeatSeconds\s*=\s*45/);
    assert.match(watcher, /if \(\$signature -eq \$script:nativeLastSignature -and -not \$heartbeatDue\) \{ return \}/);
  });

  it("carries connection.native + telemetry.production forward on a save-triggered rewrite", () => {
    assert.match(watcher, /if \(\$previousPayload\.connection\.native\) \{ \$payload\.connection\.native = \$previousPayload\.connection\.native \}/);
    assert.match(watcher, /if \(\$previousPayload\.connection\.nativeProbe\) \{ \$payload\.connection\.nativeProbe = \$previousPayload\.connection\.nativeProbe \}/);
  });

  it("tracks buildingCountObservedAt independent of production's observedAt", () => {
    assert.match(watcher, /nativeCountsObservedAtByIsland/);
    assert.match(watcher, /buildingCountObservedAt/);
  });

  it("schema and types expose nativeProbe as optional, backward compatible", () => {
    assert.equal(schema.properties.connection.properties.nativeProbe.properties.provider.const, "ux-enhancer-ocr");
    assert.deepEqual(schema.properties.connection.properties.nativeProbe.required, [
      "provider",
      "state",
      "lastProbeAt",
    ]);
  });
});
