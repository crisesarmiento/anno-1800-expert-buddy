import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { TALLER_LINK } from "./session-desk.ts";

const bench = readFileSync(new URL("../components/taller-bench.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../routes/taller.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../components/harbor-app.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");
const ahora = readFileSync(new URL("../components/esto-ahora.tsx", import.meta.url), "utf8");
const city = readFileSync(new URL("../components/taller-city.tsx", import.meta.url), "utf8");

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
    assert.doesNotMatch(welcome, /TallerCity/);
    assert.doesNotMatch(welcome, /data-visual="taller"/);
    assert.doesNotMatch(welcome, /data-taller-stamp/);
    assert.doesNotMatch(welcome, /data-taller-city/);
  });

  it("renders one Spanish alcanza/no or missing-good stamp", () => {
    assert.match(bench, /data-visual="taller"/);
    assert.match(bench, /data-taller-stamp/);
    assert.match(bench, /tallerThreshold/);
    assert.match(bench, /TallerCity/);
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

  it("keeps the city seed panel on Taller, never Home or Esto ahora", () => {
    assert.match(city, /data-taller-city/);
    assert.match(city, /data-taller-next-build/);
    assert.match(city, /La Inapetente/);
    assert.doesNotMatch(city, /Bright Sands/);
    assert.doesNotMatch(city, /t\/min|por minuto|goods-grid|solver/i);
    assert.doesNotMatch(app, /TallerCity|data-taller-city|@\/lib\/sim/);
    assert.doesNotMatch(ahora, /TallerCity|data-taller-city|@\/lib\/sim/);
    assert.doesNotMatch(desk, /TallerCity|data-taller-city|@\/lib\/sim/);
  });

  it("shows a good icon + Spanish name only inside Ciudad, never Home/Esto/diary chips", () => {
    assert.match(city, /data-taller-good/);
    assert.match(city, /goodStamp/);
    assert.match(city, /goodNameEs/);
    assert.doesNotMatch(city, /<img\b/);
    assert.doesNotMatch(app, /goodStamp|goodNameEs|data-taller-good/);
    assert.doesNotMatch(ahora, /goodStamp|goodNameEs|data-taller-good/);
    assert.doesNotMatch(desk, /goodStamp|goodNameEs|data-taller-good/);
  });
});
