import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function source(rel: string) {
  return readFileSync(join(here, rel), "utf8");
}

describe("paper-ink stamps — visual A", () => {
  const grid = source("block-grid.tsx");
  const stamps = source("stamps.tsx");
  const styles = source("../styles.css");
  const panel = source("desk-sheets/stamp-panel.tsx");
  const desk = source("session-desk.tsx");
  const live = source("live-panel.tsx");

  it("wraps the city grid in stamp-paper, not a muted game card", () => {
    assert.match(grid, /stamp-paper/);
    assert.doesNotMatch(grid, /rounded-xl bg-muted/);
    assert.doesNotMatch(grid, /bg-muted/);
  });

  it("uses cell classes as ink color, not filled map tiles", () => {
    assert.doesNotMatch(styles, /\.cell-\w+\s*\{[^}]*background:\s*var\(--color-cell-/);
    assert.match(styles, /background:\s*transparent/);
    assert.match(styles, /\.cell-house\s*\{[^}]*color:\s*var\(--color-cell-house\)/s);
  });

  it("keeps notebook copy on the stamp panel", () => {
    assert.match(panel, /Sellos del cuaderno/);
  });

  it("renders Stamp as a rubber seal", () => {
    assert.match(stamps, /stamp-seal/);
    assert.match(stamps, /hourglass/);
    assert.match(stamps, /coins-down/);
  });

  it("gives the desk hero an orla and calm stamps", () => {
    assert.match(desk, /hero-orla/);
    assert.match(desk, /hourglass/);
    assert.match(desk, /coins-down/);
  });

  it("keeps Power up as a paper strip, never the hero", () => {
    assert.match(live, /power-up-strip/);
    assert.match(live, /data-power-up="conectar"/);
  });
});
