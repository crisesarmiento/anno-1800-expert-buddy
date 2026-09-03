import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { TALLER_LINK } from "./session-desk.ts";

const bench = readFileSync(new URL("../components/taller-bench.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../routes/taller.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../components/harbor-app.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");

function sliceFn(src: string, name: string) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const next = src.indexOf("\nfunction ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe("Taller opt-in workbench", () => {
  it("is a /taller route, not Home", () => {
    assert.match(route, /createFileRoute\("\/taller"\)/);
    assert.match(route, /TallerBench/);
    const welcome = sliceFn(app, "Welcome");
    assert.doesNotMatch(welcome, /TallerBench/);
    assert.doesNotMatch(welcome, /data-visual="taller"/);
    assert.doesNotMatch(welcome, /data-taller-stamp/);
  });

  it("renders one Spanish alcanza/no or missing-good stamp", () => {
    assert.match(bench, /data-visual="taller"/);
    assert.match(bench, /data-taller-stamp/);
    assert.match(bench, /tallerThreshold/);
    assert.doesNotMatch(bench, /t\/min|por minuto|goods-grid|solver/i);
    assert.doesNotMatch(bench, /<img\b/);
  });

  it("uses a colder paper/ink workbench than the diary", () => {
    assert.match(styles, /\[data-visual="taller"\]/);
    assert.match(styles, /--color-paper-cool:/);
    assert.match(styles, /--color-ink-cool:/);
  });

  it("points the desk taller chip at /taller", () => {
    assert.equal(TALLER_LINK.href, "/taller");
    assert.match(desk, /data-taller-link/);
    assert.match(desk, /to=\{taller\.href\}|to="\/taller"|TALLER_LINK/);
  });
});
