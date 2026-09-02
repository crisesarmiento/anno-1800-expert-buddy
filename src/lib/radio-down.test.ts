import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RADIO_DOWN_COPY,
  askForCheck,
  localSuggestedAsks,
  matchCheckIndex,
  radioIsUp,
} from "./radio-down.ts";

const here = dirname(fileURLToPath(import.meta.url));

describe("radio-down copy and local asks", () => {
  it("keeps the banner string exact", () => {
    assert.equal(RADIO_DOWN_COPY, "radio apagada — usá la lista");
  });

  it("builds 3–6 local asks from title, body, and unchecked items", () => {
    const asks = localSuggestedAsks({
      title: "Una chispa que vuelve",
      body: "Construí 1 mercado, 10 casas de granjeros y atraé 50 granjeros.",
      checks: [
        { text: "Leñador en los árboles", done: true },
        { text: "Mercado cerca del puerto", done: false },
        { text: "Plantá 10 casas", done: false },
      ],
    });
    assert.ok(asks.length >= 3 && asks.length <= 6);
    assert.ok(asks.some((ask) => ask.includes("Una chispa que vuelve")));
    assert.ok(asks.includes(askForCheck("Mercado cerca del puerto")));
    assert.ok(asks.includes(askForCheck("Plantá 10 casas")));
    assert.ok(!asks.some((ask) => ask.includes("Leñador en los árboles")));
    assert.ok(asks.some((ask) => ask.includes("mercado")));
  });

  it("still returns three asks with an empty desk", () => {
    const asks = localSuggestedAsks({});
    assert.equal(asks.length, 3);
  });

  it("maps a generated ask back to the matching unchecked row", () => {
    const checks = [
      { text: "Andá al faro", done: true },
      { text: "Tirá a tres cardúmenes", done: false },
    ];
    assert.equal(matchCheckIndex(askForCheck("Tirá a tres cardúmenes"), checks), 1);
    assert.equal(matchCheckIndex(askForCheck("Andá al faro"), checks), null);
  });

  it("treats navigator.onLine as the radio", () => {
    assert.equal(radioIsUp({ onLine: false }), false);
    assert.equal(radioIsUp({ onLine: true }), true);
    assert.equal(radioIsUp(undefined), false);
  });
});

describe("buddy-chat radio-down wiring", () => {
  const chat = readFileSync(join(here, "../components/buddy-chat.tsx"), "utf8");

  it("shows the exact banner and never sends while the radio is down", () => {
    assert.match(chat, /RADIO_DOWN_COPY/);
    assert.match(chat, /radioIsUp/);
    assert.match(chat, /if \(!radio\) return/);
    assert.doesNotMatch(chat, /queue/i);
    assert.doesNotMatch(chat, /login|sign-in|SignIn|\/login/i);
  });

  it("uses local asks instead of the model when offline", () => {
    assert.match(chat, /localSuggestedAsks/);
    assert.match(chat, /takeLocalAsk/);
    assert.match(chat, /onClick=\{\(\) => takeLocalAsk\(ask\)\}/);
    assert.match(chat, /radio \? \(/);
  });
});
