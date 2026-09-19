import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const index = readFileSync(new URL("../routes/index.tsx", import.meta.url), "utf8");
const diario = readFileSync(new URL("../routes/diario.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("./editorial-home.tsx", import.meta.url), "utf8");
const nav = readFileSync(new URL("./harbor-navigation.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("./harbor-app.tsx", import.meta.url), "utf8");
const desk = readFileSync(new URL("./session-desk.tsx", import.meta.url), "utf8");
const taller = readFileSync(new URL("./taller-bench.tsx", import.meta.url), "utf8");
const productionCard = readFileSync(new URL("./native-production-card.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

const OCR_PANEL = /NativeProductionCard/;
const DIARIO_OCR = /NativeProductionCard|nativeProbe|connection\.native|native-production/;

describe("editorial isolation: Inicio summarizes; Diario has zero OCR panel", () => {
  it("Inicio renders EditorialHome and can summarize operational priorities", () => {
    assert.match(index, /EditorialHome/);
    assert.match(index, /SessionBoot/);
    assert.doesNotMatch(index, /HarborApp/);
    assert.match(home, /homePriorities/);
    assert.match(home, /data-visual="editorial"/);
    assert.doesNotMatch(home, OCR_PANEL);
  });

  it("HarborNavigation keeps connect/install under More, not the primary glance", () => {
    assert.match(nav, /\["\/", t\.home\]/);
    assert.match(nav, /\["\/taller", t\.production\]/);
    assert.match(nav, /\["\/rutas", t\.routes\]/);
    assert.match(nav, /\["\/diario", t\.diary\]/);
    assert.match(nav, /editorial-menu/);
    assert.match(nav, /\["\/conectar", t\.connect\]/);
    assert.match(nav, /\["\/instalar", t\.install\]/);
  });

  it("Diario keeps the campaign desk and mounts no OCR technical panel", () => {
    assert.match(diario, /HarborApp/);
    assert.match(diario, /SessionBoot/);
    assert.doesNotMatch(diario, /EditorialHome|NativeProductionCard/);
    assert.doesNotMatch(app, DIARIO_OCR);
    assert.doesNotMatch(desk, DIARIO_OCR);
  });

  it("detailed OCR production evidence lives on /taller instead", () => {
    assert.match(taller, /NativeProductionCard/);
    assert.match(productionCard, /id="native-production"/);
  });

  it("Inicio uses clear paper, blue ink and brass without a dark SaaS shell", () => {
    assert.match(styles, /\[data-visual="editorial"\]/);
    assert.match(styles, /\.editorial-home/);
    assert.match(styles, /\.editorial-cta/);
    assert.match(styles, /--color-ink: #1c2833/);
    assert.doesNotMatch(styles, /\[data-visual="editorial"\][^{]*\{[^}]*#14110e/);
  });
});
