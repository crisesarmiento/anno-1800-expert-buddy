import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TAP_LABELS } from "./desk-sheets/labels.ts";

const here = dirname(fileURLToPath(import.meta.url));

function source(rel: string) {
  return readFileSync(join(here, rel), "utf8");
}

describe("session desk compose — taps, no extra tabs, second-screen", () => {
  const surface = source("session-desk-surface.tsx");
  const desk = source("session-desk.tsx");
  const app = source("harbor-app.tsx");
  const sheet = source("desk-sheets/disclosure-sheet.tsx");
  const panels = source("desk-sheets/desk-disclosure-panels.tsx");

  it("keeps TAP_LABELS exact and mounts DeskDisclosurePanels next to the chief card", () => {
    assert.deepEqual(TAP_LABELS, {
      sello: "Ver sello",
      donde: "Dónde va",
      quien: "Quién es",
    });
    assert.match(surface, /DeskDisclosurePanels/);
    assert.match(surface, /TAP_LABELS/);
    assert.match(surface, /from "@\/components\/desk-sheets"/);
    assert.match(surface, /data-session-surface="compose"/);
    assert.match(surface, /data-surface="primary"/);
    assert.match(surface, /data-surface="companion"/);
    assert.match(surface, /<SessionDesk/);
  });

  it("does not dump stamps, buildings, or people onto the first-screen card", () => {
    assert.doesNotMatch(desk, /desk-sheets|DeskDisclosurePanels|TAP_LABELS|StampPanel|PlacePanel|PersonPanel/);
    assert.doesNotMatch(desk, /Ver sello|Dónde va|Quién es/);
    assert.match(desk, /data-session-desk="one-card"/);
    assert.match(desk, /Esto, ahora/);
    assert.doesNotMatch(desk, /min-h-\[calc\(100dvh/);
  });

  it("adds zero nav tabs — harbor-app swaps in the composer only", () => {
    assert.match(app, /SessionDeskSurface/);
    assert.doesNotMatch(app, /TabsList|TabsTrigger/);
    assert.doesNotMatch(surface, /TabsList|TabsTrigger|<nav/);
    assert.doesNotMatch(panels, /TabsList|TabsTrigger|<nav/);
  });

  it("docks the tapped layer on the companion surface so the chief card stays visible", () => {
    assert.match(sheet, /data-keep-primary/);
    assert.match(sheet, /\[\[data-session-surface\]_&\]:absolute/);
    assert.match(sheet, /\[\[data-session-surface\]_&\]:hidden/);
    assert.match(sheet, /if \(!open\) return null/);
  });
});
