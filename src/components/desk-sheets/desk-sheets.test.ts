import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PERSON_TAP_LABEL, PLACE_TAP_LABEL, STAMP_TAP_LABEL, TAP_LABELS } from "./labels.ts";

const here = dirname(fileURLToPath(import.meta.url));

function source(name: string) {
  return readFileSync(join(here, name), "utf8");
}

describe("desk disclosure panels", () => {
  it("keeps the three tap labels exact", () => {
    assert.equal(STAMP_TAP_LABEL, "Ver sello");
    assert.equal(PLACE_TAP_LABEL, "Dónde va");
    assert.equal(PERSON_TAP_LABEL, "Quién es");
    assert.deepEqual(TAP_LABELS, {
      sello: "Ver sello",
      donde: "Dónde va",
      quien: "Quién es",
    });
  });

  it("wires each label onto its own panel only", () => {
    const stamp = source("stamp-panel.tsx");
    const place = source("place-panel.tsx");
    const person = source("person-panel.tsx");

    assert.match(stamp, /STAMP_TAP_LABEL/);
    assert.match(place, /PLACE_TAP_LABEL/);
    assert.match(person, /PERSON_TAP_LABEL/);

    assert.doesNotMatch(stamp, /PLACE_TAP_LABEL|PERSON_TAP_LABEL/);
    assert.doesNotMatch(place, /STAMP_TAP_LABEL|PERSON_TAP_LABEL/);
    assert.doesNotMatch(person, /STAMP_TAP_LABEL|PLACE_TAP_LABEL/);
  });

  it("isolates sello / dónde va / quién es content per panel", () => {
    const stamp = source("stamp-panel.tsx");
    const place = source("place-panel.tsx");
    const person = source("person-panel.tsx");

    assert.match(stamp, /BlockGrid/);
    assert.doesNotMatch(stamp, /buildings|HarborPerson|people/);

    assert.match(place, /Building/);
    assert.doesNotMatch(place, /BlockGrid|HarborPerson|people/);

    assert.match(person, /HarborPerson/);
    assert.doesNotMatch(person, /BlockGrid|Building|layout/);
  });

  it("unmounts sheet content until an explicit tap (not tabs, not columns)", () => {
    const sheet = source("disclosure-sheet.tsx");
    const taps = source("desk-disclosure-panels.tsx");

    assert.match(sheet, /if \(!open\) return null/);
    assert.match(sheet, /role="dialog"/);
    assert.doesNotMatch(sheet, /TabsList|TabsTrigger|<nav/);

    assert.match(taps, /StampPanel/);
    assert.match(taps, /PlacePanel/);
    assert.match(taps, /PersonPanel/);
    assert.doesNotMatch(taps, /<nav|TabsList|TabsTrigger/);
  });
});
