import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  HUD_ERROR_CODES,
  HUD_ERROR_MESSAGES,
  HUD_PULSES,
  HUD_VISION_PROMPT,
  MAX_IMAGE_BYTES,
  finalizeVision,
  handleAdviseHud,
  postFilterSentences,
  type AdviseHudResult,
  type VisionHudFn,
} from "./hud-advisor-logic.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

function source(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

/** 1×1 PNG */
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PNG_DATA_URL = `data:image/png;base64,${PNG_B64}`;

const SVG_DATA_URL = "data:image/svg+xml;base64,PHN2Zy8+";
const PDF_DATA_URL = "data:application/pdf;base64,JVBERi0=";

const ROJO_VISION: VisionHudFn = async () => ({
  kind: "ok",
  pulse: "rojo",
  sentences: [
    "Pará de construir y pausá las fábricas que te dejan el saldo en rojo.",
    "El ticker de arriba está en rojo: las chimeneas te comen más de lo que pagan las casas.",
    "No abras islas ni recados hasta que el saldo deje de bajar.",
  ],
});

function assertError(result: AdviseHudResult, code: keyof typeof HUD_ERROR_MESSAGES) {
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, code);
  assert.equal(result.message, HUD_ERROR_MESSAGES[code]);
  assert.equal("pulse" in result, false);
}

describe("HUD advisor contract", () => {
  it("does not reuse play.ts Pulse and keeps the four-value enum", () => {
    assert.deepEqual([...HUD_PULSES], ["rojo", "amarillo", "vacío", "recado"]);
    const logic = source("src/lib/hud-advisor-logic.ts");
    const endpoint = source("src/lib/hud-advisor.ts");
    assert.doesNotMatch(logic, /from ["']@\/lib\/play["']/);
    assert.doesNotMatch(logic, /from ["']\.\/play/);
    assert.match(endpoint, /createServerFn\(\{ method: ["']POST["'] \}\)/);
    assert.match(endpoint, /export const adviseHud/);
  });

  it("prompt refuses spoilers, ratios, and a fifth pulse", () => {
    assert.match(HUD_VISION_PROMPT, /Spoilers SIEMPRE APAGADOS/i);
    assert.match(HUD_VISION_PROMPT, /2:1/);
    assert.match(HUD_VISION_PROMPT, /t\/min/);
    assert.match(HUD_VISION_PROMPT, /por minuto/);
    assert.match(HUD_VISION_PROMPT, /ratio/i);
    assert.match(HUD_VISION_PROMPT, /traicion/);
    assert.match(HUD_VISION_PROMPT, /DLC/);
    assert.match(HUD_VISION_PROMPT, /quinto pulse/);
    assert.doesNotMatch(HUD_VISION_PROMPT, /store\.spoilers/);
  });
});

describe("no persistence of image bytes", () => {
  it("never writes files and wipes the buffer after the handler", async () => {
    const logic = source("src/lib/hud-advisor-logic.ts");
    const endpoint = source("src/lib/hud-advisor.ts");
    assert.doesNotMatch(logic, /writeFile|createWriteStream|putObject|S3Client|\/tmp\/|indexedDB/);
    assert.doesNotMatch(endpoint, /writeFile|createWriteStream|putObject|S3Client|\/tmp\/|indexedDB/);
    let seen: Uint8Array | undefined;
    const vision: VisionHudFn = async (image) => {
      seen = image.bytes;
      assert.ok(image.byteLength > 0);
      assert.ok(image.bytes.length > 0);
      return {
        kind: "ok",
        pulse: "amarillo",
        sentences: ["Arreglá el pescado de esas casas con la barra amarilla."],
      };
    };
    const result = await handleAdviseHud({ imageDataUrl: PNG_DATA_URL }, { vision });
    assert.equal(result.ok, true);
    assert.ok(seen);
    assert.equal(
      seen!.every((b) => b === 0),
      true,
    );
  });
});

describe("input rejection", () => {
  it("empty_paste has no pulse", async () => {
    for (const input of [undefined, null, {}, { imageDataUrl: "   " }, { imageDataUrl: "" }]) {
      assertError(await handleAdviseHud(input), "empty_paste");
    }
  });

  it("multi_image has no pulse", async () => {
    const a = new File([Buffer.from(PNG_B64, "base64")], "a.png", { type: "image/png" });
    const b = new File([Buffer.from(PNG_B64, "base64")], "b.png", { type: "image/png" });
    assertError(await handleAdviseHud({ images: [a, b] }), "multi_image");
    const form = new FormData();
    form.append("image", a);
    form.append("image", b);
    assertError(await handleAdviseHud(form), "multi_image");
  });

  it("not_image for svg, pdf, and oversized payloads", async () => {
    assertError(await handleAdviseHud({ imageDataUrl: SVG_DATA_URL }), "not_image");
    assertError(await handleAdviseHud({ imageDataUrl: PDF_DATA_URL }), "not_image");
    const huge = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "huge.png", { type: "image/png" });
    assertError(await handleAdviseHud({ image: huge }), "not_image");
  });
});

describe("pulse enum only + action-first Spanish", () => {
  it("accepts the four pulses and 1–4 action-first sentences", async () => {
    const fixtures: { pulse: (typeof HUD_PULSES)[number]; first: string }[] = [
      { pulse: "rojo", first: "Pará de construir y pausá las fábricas que te dejan el saldo en rojo." },
      { pulse: "amarillo", first: "Arreglá el pescado de esas casas con la barra amarilla." },
      { pulse: "vacío", first: "Conectá esas casas vacías al mercado con una calle." },
      { pulse: "recado", first: "Abrí el sobre del recado y entregá lo que pide." },
    ];
    for (const fx of fixtures) {
      const result = await handleAdviseHud(
        { imageDataUrl: PNG_DATA_URL },
        {
          vision: async () => ({
            kind: "ok",
            pulse: fx.pulse,
            sentences: [fx.first, "Solo eso."],
          }),
        },
      );
      assert.equal(result.ok, true);
      if (!result.ok) continue;
      assert.equal(result.pulse, fx.pulse);
      assert.ok(HUD_PULSES.includes(result.pulse));
      assert.ok(result.sentences.length >= 1 && result.sentences.length <= 4);
      assert.equal(result.sentences[0], fx.first);
    }
  });

  it("rejects a fifth pulse with unreadable_hud and no pulse field", () => {
    const result = finalizeVision({
      kind: "ok",
      pulse: "verde",
      sentences: ["Pará de construir."],
    });
    assertError(result, "unreadable_hud");
  });

  it("rejects a declarative first line instead of returning advice without an action", () => {
    const result = finalizeVision({
      kind: "ok",
      pulse: "rojo",
      sentences: ["El saldo visible está en rojo."],
    });
    assertError(result, "unreadable_hud");
  });

  it("slices extras past four sentences", () => {
    const filtered = postFilterSentences([
      "Pará de construir.",
      "El ticker está en rojo.",
      "No abras islas.",
      "Las chimeneas te comen.",
      "Quinta oración de más.",
    ]);
    assert.equal("ok" in filtered, false);
    if ("ok" in filtered) return;
    assert.equal(filtered.sentences.length, 4);
  });
});

describe("post-filter refuses ratios and spoilers", () => {
  it("drops a 2:1 model stub so the result has no ratio", async () => {
    const result = await handleAdviseHud(
      { imageDataUrl: PNG_DATA_URL },
      {
        vision: async () => ({
          kind: "ok",
          pulse: "amarillo",
          sentences: [
            "Arreglá el pescado de esas casas con la barra amarilla.",
            "Poné granjas y panaderías 2:1 y otra isla.",
          ],
        }),
      },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const blob = result.sentences.join(" ");
    assert.doesNotMatch(blob, /\d+\s*:\s*\d+/);
    assert.equal(result.sentences[0], "Arreglá el pescado de esas casas con la barra amarilla.");
    assert.equal(result.sentences.length, 1);
  });

  it("refuses when the action sentence itself is a ratio", async () => {
    const result = await handleAdviseHud(
      { imageDataUrl: PNG_DATA_URL },
      {
        vision: async () => ({
          kind: "ok",
          pulse: "amarillo",
          sentences: ["Poné granjas y panaderías 2:1 y otra isla."],
        }),
      },
    );
    assertError(result, "unreadable_hud");
  });

  it("turns a plot-only stub into unreadable_hud", async () => {
    const result = await handleAdviseHud(
      { imageDataUrl: PNG_DATA_URL },
      {
        vision: async () => ({
          kind: "ok",
          pulse: "recado",
          sentences: ["En el próximo capítulo tu hermano te traiciona."],
        }),
      },
    );
    assertError(result, "unreadable_hud");
  });

  it("drops a later second imperative action", () => {
    const filtered = postFilterSentences([
      "Pará de construir.",
      "Hacé otra isla ahora.",
      "El ticker está en rojo.",
    ]);
    assert.equal("ok" in filtered, false);
    if ("ok" in filtered) return;
    assert.deepEqual([...filtered.sentences], ["Pará de construir.", "El ticker está en rojo."]);
  });
});

describe("vision errors have no pulse", () => {
  it("maps not_anno and unreadable stubs", async () => {
    assertError(
      await handleAdviseHud(
        { imageDataUrl: PNG_DATA_URL },
        { vision: async () => ({ kind: "not_anno" }) },
      ),
      "not_anno",
    );
    assertError(
      await handleAdviseHud(
        { imageDataUrl: PNG_DATA_URL },
        { vision: async () => ({ kind: "unreadable" }) },
      ),
      "unreadable_hud",
    );
  });

  it("advisor_down when vision reports down", async () => {
    assertError(
      await handleAdviseHud(
        { imageDataUrl: PNG_DATA_URL },
        { vision: async () => ({ kind: "down" }) },
      ),
      "advisor_down",
    );
  });
});

describe("error codes table", () => {
  it("covers every contract code", () => {
    assert.deepEqual([...HUD_ERROR_CODES], [
      "empty_paste",
      "multi_image",
      "not_image",
      "not_anno",
      "unreadable_hud",
      "advisor_down",
    ]);
  });
});

describe("multipart single image", () => {
  it("accepts one File on FormData", async () => {
    const file = new File([Buffer.from(PNG_B64, "base64")], "hud.png", { type: "image/png" });
    const form = new FormData();
    form.append("image", file);
    const result = await handleAdviseHud(form, { vision: ROJO_VISION });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.pulse, "rojo");
    assert.ok(result.sentences.length >= 1 && result.sentences.length <= 4);
  });
});
