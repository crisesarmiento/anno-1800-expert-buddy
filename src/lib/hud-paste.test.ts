import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { HUD_ERROR_MESSAGES, HUD_PULSES, MAX_IMAGE_BYTES } from "./hud-advisor-logic.ts";
import {
  HUD_IDLE_COPY,
  HUD_LOADING_COPY,
  HUD_PULSE_LABEL,
  HUD_RETRY_COPY,
  displaySentences,
  fileToImageDataUrl,
  networkFailureUi,
  pickHudImage,
  resultToUi,
} from "./hud-paste.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

function source(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function pngFile(name = "hud.png"): File {
  const bytes = Uint8Array.from([137, 80, 78, 71]);
  return new File([bytes], name, { type: "image/png" });
}

describe("HUD paste ingest", () => {
  it("accepts one PNG/JPEG/WebP and rejects empty, multi, and non-image", () => {
    const ok = pickHudImage([pngFile()]);
    assert.equal(ok.ok, true);
    const empty = pickHudImage([]);
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.code, "empty_paste");
    const multi = pickHudImage([pngFile("a.png"), pngFile("b.png")]);
    assert.equal(multi.ok, false);
    if (!multi.ok) assert.equal(multi.code, "multi_image");
    const pdf = pickHudImage([new File([new Uint8Array([1])], "x.pdf", { type: "application/pdf" })]);
    assert.equal(pdf.ok, false);
    if (!pdf.ok) assert.equal(pdf.code, "not_image");
    const svg = pickHudImage([new File([new Uint8Array([1])], "x.svg", { type: "image/svg+xml" })]);
    assert.equal(svg.ok, false);
    if (!svg.ok) assert.equal(svg.code, "not_image");
    const huge = pickHudImage([
      new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "big.png", { type: "image/png" }),
    ]);
    assert.equal(huge.ok, false);
    if (!huge.ok) assert.equal(huge.code, "not_image");
  });

  it("builds a data URL then the caller can drop it", async () => {
    const url = await fileToImageDataUrl(pngFile());
    assert.match(url, /^data:image\/png;base64,/);
    const paste = source("src/lib/hud-paste.ts");
    const ui = source("src/components/hud-paste-advisor.tsx");
    assert.doesNotMatch(paste, /createObjectURL|FileReader|localStorage|indexedDB|writeFile/);
    assert.doesNotMatch(ui, /createObjectURL|localStorage|indexedDB|<img|type="file"|multiple/);
  });

  it("maps success to pulse plus at most 4 sentences and errors to message only", () => {
    const success = resultToUi({
      ok: true,
      pulse: "rojo",
      sentences: ["Uno.", "Dos.", "Tres.", "Cuatro.", "Cinco."],
    });
    assert.equal(success.kind, "success");
    if (success.kind === "success") {
      assert.equal(success.pulse, "rojo");
      assert.equal(success.sentences.length, 4);
      assert.equal(success.sentences[0], "Uno.");
    }
    const err = resultToUi({ ok: false, code: "not_anno", message: HUD_ERROR_MESSAGES.not_anno });
    assert.equal(err.kind, "error");
    if (err.kind === "error") assert.equal(err.message, HUD_ERROR_MESSAGES.not_anno);
    const down = networkFailureUi();
    assert.equal(down.kind, "error");
    if (down.kind === "error") assert.equal(down.message, HUD_ERROR_MESSAGES.advisor_down);
    assert.deepEqual(displaySentences(["a", "b", "c", "d", "e"]), ["a", "b", "c", "d"]);
  });

  it("exposes the four pulse labels and Spanish idle/retry copy", () => {
    assert.equal(HUD_PULSE_LABEL.rojo, "rojo");
    assert.equal(HUD_PULSE_LABEL.amarillo, "amarillo");
    assert.equal(HUD_PULSE_LABEL.recado, "recado");
    assert.equal(HUD_PULSES.length, 4);
    assert.match(HUD_IDLE_COPY, /Peg/);
    assert.match(HUD_LOADING_COPY, /Leyendo/);
    assert.match(HUD_RETRY_COPY, /Peg/);
  });
});

describe("HUD paste UI wiring", () => {
  const ui = source("src/components/hud-paste-advisor.tsx");
  const desk = source("src/components/session-desk-surface.tsx");
  const chat = source("src/components/buddy-chat.tsx");

  it("calls adviseHud only, with imageDataUrl, and never stores the shot", () => {
    assert.ok(ui.includes("adviseHud"));
    assert.ok(ui.includes("@/lib/hud-advisor"));
    assert.ok(ui.includes("imageDataUrl"));
    assert.ok(!ui.includes("askBuddy"));
    assert.ok(!ui.includes("@/lib/play"));
    assert.ok(!ui.toLowerCase().includes("calculadora"));
    assert.ok(ui.includes("imageDataUrl = undefined"));
  });

  it("pastes and drops one image; first sentence is the action", () => {
    assert.ok(ui.includes("paste"));
    assert.ok(ui.includes("onDrop"));
    assert.ok(ui.includes("filesFromDataTransfer"));
    assert.ok(ui.includes("data-hud-pulse"));
    assert.ok(ui.includes("data-hud-line"));
    assert.ok(ui.includes("index === 0"));
    assert.ok(ui.includes("HUD_RETRY_COPY"));
    assert.ok(ui.includes("HUD_LOADING_COPY"));
  });

  it("sits on the session desk and in chat without extra advisor chrome", () => {
    assert.ok(desk.includes("HudPasteAdvisor"));
    assert.ok(desk.includes("listen=\"window\""));
    assert.ok(chat.includes("HudPasteAdvisor"));
    assert.ok(!desk.toLowerCase().includes("calculadora"));
    assert.ok(!chat.includes("createObjectURL"));
  });
});
