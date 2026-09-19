import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const app = readFileSync(new URL("./harbor-app.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("./session-desk.tsx", import.meta.url), "utf8");
const taller = readFileSync(new URL("./taller-bench.tsx", import.meta.url), "utf8");

describe("Home stays free of OCR diagnostics (zero OCR diag on Home/Diario)", () => {
  it("Home (Welcome) never imports or mounts NativeProductionCard or probe/native evidence", () => {
    assert.doesNotMatch(app, /NativeProductionCard|nativeProbe|connection\.native|native-production/);
  });

  it("the session desk (also reachable from Home) never mounts it either", () => {
    assert.doesNotMatch(desk, /NativeProductionCard|nativeProbe|connection\.native|native-production/);
  });

  it("detailed OCR production evidence lives on /taller instead", () => {
    assert.match(taller, /NativeProductionCard/);
  });
});
