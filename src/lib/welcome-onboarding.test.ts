import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { LOCALES, UI } from "./i18n.ts";

const app = readFileSync(new URL("../components/harbor-app.tsx", import.meta.url), "utf8");
const store = readFileSync(new URL("./store.ts", import.meta.url), "utf8");

function sliceFn(src: string, name: string) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const next = src.indexOf("\nfunction ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe("welcome/desk zero-setup onboarding", () => {
  it("leads Welcome with one Esto ahora + diary chips, live behind Power up", () => {
    const welcome = sliceFn(app, "Welcome");
    const chips = welcome.indexOf('data-welcome-primary="chips"');
    const power = welcome.indexOf("<PowerUpSection");
    const live = welcome.indexOf("<LivePanel");
    const hero = welcome.indexOf('data-hero="esto-ahora"');
    assert.ok(hero >= 0);
    assert.ok(chips >= 0);
    assert.ok(power >= 0);
    assert.equal(live, -1);
    assert.ok(hero < chips);
    assert.ok(chips < power);
    assert.equal(welcome.indexOf("<IslandPulse"), -1);
  });

  it("keeps live JSON / watcher / mod behind Power up on the desk", () => {
    const desk = sliceFn(app, "SessionDesk");
    const pulse = desk.indexOf("<IslandPulse");
    const power = desk.indexOf("<PowerUpSection");
    const live = desk.indexOf("<LivePanel");
    assert.ok(pulse >= 0);
    assert.ok(power >= 0);
    assert.equal(live, -1);
    assert.ok(pulse < power);
  });

  it("does not lead live copy with mod-cannot-write-journal", () => {
    const banned =
      /no escribe el diario|cannot write the journal|non scrive il diario|schreibt kein Tagebuch/i;
    for (const locale of LOCALES) {
      const dict = UI[locale];
      assert.equal(banned.test(dict.live.whyEmpty), false, locale);
      assert.equal(banned.test(dict.live.hint), false, locale);
      assert.equal(banned.test(dict.power.hint), false, locale);
      assert.match(dict.power.title, /Power up/i);
      assert.ok(dict.pulse.title.length > 0);
      assert.ok(dict.live.example.length > 0);
    }
  });

  it("keeps spoilers off by default", () => {
    assert.match(store, /spoilers:\s*false/);
  });
});
