import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { sessionEstoAhora } from "./session-desk.ts";

const app = readFileSync(new URL("../components/harbor-app.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("../components/session-desk.tsx", import.meta.url), "utf8");
const live = readFileSync(new URL("../components/live-panel.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const instalar = readFileSync(new URL("../routes/instalar.tsx", import.meta.url), "utf8");
const chips = readFileSync(new URL("./diary-chips.ts", import.meta.url), "utf8");
const campaign = readFileSync(new URL("./data/campaign.ts", import.meta.url), "utf8");

function sliceFn(src: string, name: string) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const next = src.indexOf("\nfunction ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe("visual A diario de expedición", () => {
  it("uses cream paper, ink, and brass — not dark SaaS", () => {
    assert.match(styles, /--color-paper: #f3e6d0/i);
    assert.match(styles, /--color-ink: #2a2118/i);
    assert.match(styles, /--color-brass: #b8956a/i);
    assert.match(styles, /--color-background: #f3e6d0/i);
    assert.doesNotMatch(styles, /--color-background: #14110e/);
  });

  it("leads Home with one Esto ahora plus diary-title chips", () => {
    const welcome = sliceFn(app, "Welcome");
    assert.match(welcome, /data-hero="esto-ahora"/);
    assert.match(welcome, /Esto, ahora/);
    assert.match(welcome, /data-esto-ahora-item/);
    assert.match(welcome, /data-welcome-primary="chips"/);
    assert.match(welcome, /DiaryTitleChips/);
    assert.equal((welcome.match(/data-esto-ahora-item/g) ?? []).length, 1);
    assert.doesNotMatch(welcome, /IslandPulse/);
    assert.doesNotMatch(welcome, /WelcomeCard/);
    assert.doesNotMatch(welcome, /data-welcome-primary="example"/);
  });

  it("does not mount a left rail, 3-item checklist, or goods-chip hero", () => {
    const harbor = sliceFn(app, "HarborApp");
    assert.doesNotMatch(harbor, /CampaignRail/);
    assert.doesNotMatch(desk, /<ol\b/);
    assert.doesNotMatch(desk, /sessionChecklist/);
    assert.doesNotMatch(desk, /Agregar a la lista/);
    assert.match(desk, /data-esto-ahora-item/);
    assert.match(desk, /DiaryTitleChips/);
  });

  it("keeps Live as a collapsed paper strip and /instalar in the same language", () => {
    assert.match(live, /power-up-strip/);
    assert.match(live, /useState\(false\)/);
    assert.doesNotMatch(live, /useState\(\(\) => Boolean\(liveSnapshot\)\)/);
    assert.match(instalar, /data-visual="diario"/);
    assert.match(instalar, /PowerUpSection/);
    assert.doesNotMatch(instalar, /<LivePanel/);
  });

  it("treats Rojo/Saturado as threshold stamps and taller as link-out", () => {
    assert.match(desk, /ThresholdStamp/);
    assert.match(desk, /hourglass/);
    assert.match(desk, /coin-down/);
    assert.match(desk, /data-taller-link/);
    assert.doesNotMatch(desk, /lucide-react/);
    assert.doesNotMatch(desk, /<img\b/);
  });

  it("exposes one Spanish next step and journal titles as chips", () => {
    assert.equal(sessionEstoAhora(["A", "B", "C"]), "A");
    assert.equal(sessionEstoAhora([]), "Tocá el título que ves en el diario.");
    assert.match(chips, /chapters\.map/);
    assert.match(chips, /mission\?\.title/);
    assert.match(campaign, /title: "A lo grande"/);
    assert.match(campaign, /title: "Una chispa que vuelve"/);
    assert.match(campaign, /id: "end"/);
  });
});
