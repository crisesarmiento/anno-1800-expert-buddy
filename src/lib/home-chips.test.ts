import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const welcome = readFileSync(new URL("../components/harbor-app.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");
const pulse = readFileSync(new URL("../components/island-pulse.tsx", import.meta.url), "utf8");
const ahora = readFileSync(new URL("../components/esto-ahora.tsx", import.meta.url), "utf8");
const live = readFileSync(new URL("../components/live-panel.tsx", import.meta.url), "utf8");
const sessionLib = readFileSync(new URL("./session-desk.ts", import.meta.url), "utf8");

function sliceFn(src: string, name: string) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const next = src.indexOf("\nfunction ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe("Home chips-first with one Esto ahora", () => {
  it("puts diary chips and exactly one Esto ahora together on Welcome", () => {
    const home = sliceFn(welcome, "Welcome");
    const chips = home.indexOf('data-welcome-primary="chips"');
    const pulseAt = home.indexOf("<IslandPulse");
    const ahoraAt = home.indexOf("<EstoAhoraItem");
    const example = home.indexOf('data-welcome-primary="example"');
    assert.ok(chips >= 0);
    assert.ok(pulseAt >= 0);
    assert.ok(ahoraAt >= 0);
    assert.ok(chips < pulseAt);
    assert.ok(pulseAt < ahoraAt);
    assert.ok(ahoraAt < example || example === -1);
    assert.equal((home.match(/<EstoAhoraItem/g) ?? []).length, 1);
  });

  it("puts diary chips and exactly one Esto ahora together on the session desk", () => {
    assert.match(desk, /data-home-primary="chips"/);
    assert.match(desk, /<IslandPulse/);
    assert.match(desk, /<EstoAhoraItem/);
    assert.equal((desk.match(/<EstoAhoraItem/g) ?? []).length, 1);
    assert.ok(desk.indexOf("<IslandPulse") < desk.indexOf("<EstoAhoraItem"));
  });

  it("marks diary chips and a single Esto ahora item in the UI", () => {
    assert.match(pulse, /data-diary-chips=/);
    assert.match(ahora, /data-esto-ahora=/);
    assert.match(ahora, /data-esto-ahora-count="1"/);
    assert.match(ahora, /data-esto-ahora-item=/);
    assert.doesNotMatch(ahora, /<ol[\s>]|<li[\s>]/);
  });

  it("removes the three-item checklist pattern from the desk", () => {
    assert.doesNotMatch(desk, /sessionChecklist/);
    assert.doesNotMatch(desk, /<ol[\s>]/);
    assert.doesNotMatch(desk, /Agregar a la lista|addCheck|reorderChecks/);
    assert.doesNotMatch(sessionLib, /sessionChecklist|Una cosa a la vez|Cuando esté, tachá/);
    assert.match(sessionLib, /sessionNowItem/);
  });

  it("keeps Live collapsed by default and expandable", () => {
    const power = sliceFn(live, "PowerUpSection");
    assert.match(power, /data-live-section=/);
    assert.match(power, /useState\(false\)/);
    assert.doesNotMatch(power, /useState\(\(\) => Boolean\(liveSnapshot\)\)/);
    assert.match(power, /<details/);
    assert.match(power, /<summary/);
    assert.match(power, /setOpen\(event\.currentTarget\.open\)/);
    assert.ok(desk.includes("<PowerUpSection"));
    const home = sliceFn(welcome, "Welcome");
    assert.ok(home.includes("<PowerUpSection"));
  });
});
