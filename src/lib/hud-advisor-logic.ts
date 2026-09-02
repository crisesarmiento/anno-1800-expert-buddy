export const HUD_PULSES = ["rojo", "amarillo", "vacío", "recado"] as const;
export type HudPulse = (typeof HUD_PULSES)[number];

export const HUD_ERROR_CODES = [
  "empty_paste",
  "multi_image",
  "not_image",
  "not_anno",
  "unreadable_hud",
  "advisor_down",
] as const;
export type HudErrorCode = (typeof HUD_ERROR_CODES)[number];

export type AdviseHudSuccess = {
  ok: true;
  pulse: HudPulse;
  sentences: [string, ...string[]];
};

export type AdviseHudError = {
  ok: false;
  code: HudErrorCode;
  message: string;
};

export type AdviseHudResult = AdviseHudSuccess | AdviseHudError;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
type AcceptedMime = (typeof ACCEPTED_IMAGE_MIME)[number];

export const HUD_ERROR_MESSAGES: Record<HudErrorCode, string> = {
  empty_paste: "No hay captura. Pegá una sola foto del HUD.",
  multi_image: "Una sola foto. Sacá las demás y pegá de nuevo.",
  not_image: "Eso no es una imagen. Pegá una captura del juego.",
  not_anno: "No parece Anno 1800. Pegá el HUD del juego, no otra pantalla.",
  unreadable_hud: "No se lee el HUD. Acercá la captura o recortá la barra de arriba.",
  advisor_down: "No llegó la radio del puerto. Probá de nuevo.",
};

export function hudError(code: HudErrorCode): AdviseHudError {
  return { ok: false, code, message: HUD_ERROR_MESSAGES[code] };
}

/** Same stripping as `plainTalk` in `src/lib/buddy.ts`. */
function plainTalk(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(^|[^\w])\*(.*?)\*(?!\w)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}

export const HUD_VISION_PROMPT = `Sos Harbor Buddy mirando UNA captura del HUD de Anno 1800. Spoilers SIEMPRE APAGADOS en este endpoint: ignorá cualquier toggle de spoilers. No cuentes historia, traiciones, finales, plot de DLC ni desbloqueos que no se vean en ESTA foto. No nombres tiers de residentes ni edificios futuros que no estén en el HUD.

Leé solo lo visible. Elegí UN pulse. Prioridad (el más alto gana, no combines):
rojo > vacío > amarillo > recado

rojo: ticker/saldo en rojo, motín, incendio, enfermedad, barras de necesidad todas rojas, quiebra, combate crítico.
amarillo: barras amarillas, stock bajo (no vacío), falta ALGÚN material de construcción, felicidad amarilla.
vacío: almacén en 0 de un bien que se consume, casas vacías/zzz, fábrica parada por insumo faltante, construcción frenada por un material que no hay.
recado: sobre/mail, marcador de misión, pedido de NPC, y la ciudad NO está en fallo.

HUD ambiguo: nunca un quinto pulse (nada de verde, ok, unknown, crítico). Vacío vs bajo → vacío. Tinte raro pero no vacío → amarillo. Ciudad calma + mail → recado. Ciudad calma sin mail → amarillo, acción = no expandir / seguir el marcador visible / dejar la ciudad.

Respuesta: JSON puro, sin markdown.
Éxito: {"ok":true,"pulse":"rojo|amarillo|vacío|recado","sentences":["..."]}
Si la foto no es Anno 1800: {"ok":false,"code":"not_anno"}
Si es Anno pero no se lee el HUD: {"ok":false,"code":"unreadable_hud"}

sentences: 1 a 4 oraciones cortas en español rioplatense (vos, pará, conectá). Nunca vosotros. Nunca tono de España. La primera oración ES la única acción, imperativo, concreta, anclada a algo visible. Las siguientes solo justifican o limitan ESA acción. Sin segunda acción. Sin markdown, sin viñetas, sin **negrita**.

PROHIBIDO en sentences y en tu razonamiento:
- ratios (2:1, 4:1), t/min, por minuto, ratio, eficiencia %, calculadora de cadenas, “óptimo”, min-max, layouts diamante
- spoilers de campaña, traiciones, finales, DLC plot, desbloqueos no visibles
- vergüenza por ciudades feas
- un plan de 20 pasos

Números del HUD sí (tres casas vacías). No resuelvas la campaña. Inferí el problema visible más urgente, mapealo al pulse, escribí las oraciones.`;

const RATIO_RE = /\d+\s*:\s*\d+/;
const TMIN_RE = /\bt\/min\b/i;
const POR_MINUTO_RE = /\bpor minuto\b/i;
const RATIO_WORD_RE = /\bratio\b/i;
const BANNED_SENTENCE_RE =
  /\d+\s*:\s*\d+|\bt\/min\b|\bpor minuto\b|\bratio\b|\bóptimo\b|\btraicion|\bfinal de la campa|\bDLC\b|\bpr[oó]ximo cap[ií]tulo\b|\bdesbloque|\beficiencia\s*%|\bmin-?max\b|\bvergon/i;

const IMPERATIVE_RE =
  /^(pará|pausá|conectá|hacé|abrí|arreglá|poné|entregá|seguí|dejá|sacá|bajá|subí|vendé|comprá|construí|plantá|mirá|esperá|cortá|apagá|prendé|andá|volvé|usá|llená|mové|cubrí|tachá)(?=\s|$|[.,;:!?])/iu;

export type HudImage = {
  mime: AcceptedMime;
  bytes: Uint8Array;
  byteLength: number;
};

export type VisionHudOk = { kind: "ok"; pulse: string; sentences: string[] };
export type VisionHudResult =
  | VisionHudOk
  | { kind: "not_anno" }
  | { kind: "unreadable" }
  | { kind: "down" };

export type VisionHudFn = (image: HudImage) => Promise<VisionHudResult>;

function isAcceptedMime(value: string): value is AcceptedMime {
  return (ACCEPTED_IMAGE_MIME as readonly string[]).includes(value);
}

function unwrapData(input: unknown): unknown {
  if (input && typeof input === "object" && !isFormData(input) && "data" in input) {
    const rec = input as { data?: unknown; imageDataUrl?: unknown; image?: unknown };
    if (rec.imageDataUrl == null && rec.image == null && rec.data !== undefined) {
      return rec.data;
    }
  }
  return input;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isFileLike(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function isErrorResult(value: AdviseHudError | HudImage): value is AdviseHudError {
  return "ok" in value && value.ok === false;
}

function bytesFromBase64(b64: string): Uint8Array | null {
  try {
    const clean = b64.replace(/\s/g, "");
    if (!clean) return new Uint8Array(0);
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(clean, "base64"));
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function dataUrlFromBytes(mime: AcceptedMime, bytes: Uint8Array): string {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(bytes).toString("base64")
      : btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
  return `data:${mime};base64,${b64}`;
}

async function fileToImage(file: File): Promise<AdviseHudError | HudImage> {
  if (file.size === 0) return hudError("empty_paste");
  if (file.size > MAX_IMAGE_BYTES) return hudError("not_image");
  const mime = (file.type || "").toLowerCase();
  if (!isAcceptedMime(mime)) return hudError("not_image");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) return hudError("empty_paste");
  if (bytes.byteLength > MAX_IMAGE_BYTES) return hudError("not_image");
  return { mime, bytes, byteLength: bytes.byteLength };
}

function parseDataUrl(url: string): AdviseHudError | HudImage {
  const trimmed = url.trim();
  if (!trimmed) return hudError("empty_paste");
  const match = /^data:(image\/(png|jpeg|webp));base64,([\s\S]*)$/i.exec(trimmed);
  if (!match) return hudError("not_image");
  const mime = match[1]!.toLowerCase() as AcceptedMime;
  const bytes = bytesFromBase64(match[3] ?? "");
  if (!bytes) return hudError("not_image");
  if (bytes.byteLength === 0) return hudError("empty_paste");
  if (bytes.byteLength > MAX_IMAGE_BYTES) return hudError("not_image");
  return { mime, bytes, byteLength: bytes.byteLength };
}

function collectFromFormData(form: FormData): { files: File[]; dataUrls: string[] } {
  const files: File[] = [];
  const dataUrls: string[] = [];
  for (const [, value] of form.entries()) {
    if (isFileLike(value)) files.push(value);
    else if (typeof value === "string" && value.trim().startsWith("data:image/")) {
      dataUrls.push(value);
    }
  }
  return { files, dataUrls };
}

export async function parseAdviseHudRequest(
  input: unknown,
): Promise<AdviseHudError | { ok: true; image: HudImage }> {
  const raw = unwrapData(input);
  if (raw == null) return hudError("empty_paste");

  if (typeof raw === "string") {
    return hudError(raw.trim() ? "not_image" : "empty_paste");
  }

  if (isFormData(raw)) {
    const { files, dataUrls } = collectFromFormData(raw);
    const total = files.length + dataUrls.length;
    if (total === 0) return hudError("empty_paste");
    if (total > 1) return hudError("multi_image");
    if (files[0]) {
      const image = await fileToImage(files[0]);
      if (isErrorResult(image)) return image;
      return { ok: true, image };
    }
    const image = parseDataUrl(dataUrls[0] ?? "");
    if (isErrorResult(image)) return image;
    return { ok: true, image };
  }

  if (typeof raw !== "object") return hudError("not_image");
  const rec = raw as {
    imageDataUrl?: unknown;
    image?: unknown;
    images?: unknown;
  };

  const files: File[] = [];
  const pushMaybeFile = (value: unknown) => {
    if (isFileLike(value)) files.push(value);
    else if (Array.isArray(value)) {
      for (const item of value) if (isFileLike(item)) files.push(item);
    }
  };
  pushMaybeFile(rec.image);
  pushMaybeFile(rec.images);

  const dataUrl =
    typeof rec.imageDataUrl === "string"
      ? rec.imageDataUrl
      : rec.imageDataUrl == null
        ? null
        : "";

  if (Array.isArray(rec.images) && rec.images.length > 1) return hudError("multi_image");
  if (files.length > 1) return hudError("multi_image");
  if (files.length === 1 && dataUrl != null && String(dataUrl).trim() !== "") {
    return hudError("multi_image");
  }

  if (files.length === 1) {
    const image = await fileToImage(files[0]!);
    if (isErrorResult(image)) return image;
    return { ok: true, image };
  }

  if (dataUrl != null) {
    const image = parseDataUrl(String(dataUrl));
    if (isErrorResult(image)) return image;
    return { ok: true, image };
  }

  return hudError("empty_paste");
}

function asHudPulse(value: string): HudPulse | null {
  const n = value.normalize("NFC").trim().toLowerCase();
  if (n === "vacio") return "vacío";
  return (HUD_PULSES as readonly string[]).includes(n) ? (n as HudPulse) : null;
}

function firstImperative(sentence: string): string | null {
  const match = sentence.trim().normalize("NFC").match(IMPERATIVE_RE);
  return match?.[1]?.toLowerCase() ?? null;
}

export function postFilterSentences(raw: string[]): AdviseHudError | { sentences: [string, ...string[]] } {
  let sentences = raw
    .map((s) => plainTalk(String(s ?? "")))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 4);

  if (sentences.length === 0) return hudError("unreadable_hud");
  const head = sentences[0]!;

  sentences = sentences.filter(
    (s) =>
      !RATIO_RE.test(s) &&
      !TMIN_RE.test(s) &&
      !POR_MINUTO_RE.test(s) &&
      !RATIO_WORD_RE.test(s) &&
      !BANNED_SENTENCE_RE.test(s),
  );

  if (sentences.length === 0 || sentences[0] !== head) return hudError("unreadable_hud");

  const headVerb = firstImperative(sentences[0]!);
  if (!headVerb) return hudError("unreadable_hud");
  sentences = sentences.filter((s, i) => {
    if (i === 0) return true;
    const verb = firstImperative(s);
    if (!verb) return true;
    if (verb === headVerb) return true;
    return false;
  });

  if (sentences.length === 0) return hudError("unreadable_hud");
  return { sentences: sentences as [string, ...string[]] };
}

export function finalizeVision(raw: VisionHudResult): AdviseHudResult {
  if (raw.kind === "down") return hudError("advisor_down");
  if (raw.kind === "not_anno") return hudError("not_anno");
  if (raw.kind === "unreadable") return hudError("unreadable_hud");
  const pulse = asHudPulse(raw.pulse);
  if (!pulse) return hudError("unreadable_hud");
  const filtered = postFilterSentences(raw.sentences);
  if ("ok" in filtered) return filtered;
  if (!filtered.sentences[0]) return hudError("unreadable_hud");
  return { ok: true, pulse, sentences: filtered.sentences };
}

function extractJson(text: string): unknown | null {
  const cleaned = plainTalk(text)
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function parseModelPayload(text: string): VisionHudResult {
  const json = extractJson(text);
  if (!json || typeof json !== "object") return { kind: "unreadable" };
  const rec = json as { ok?: unknown; code?: unknown; pulse?: unknown; sentences?: unknown };
  if (rec.ok === false) {
    if (rec.code === "not_anno") return { kind: "not_anno" };
    return { kind: "unreadable" };
  }
  const pulse = typeof rec.pulse === "string" ? rec.pulse : "";
  const sentences = Array.isArray(rec.sentences) ? rec.sentences.map((s) => String(s)) : [];
  if (!pulse || sentences.length === 0) return { kind: "unreadable" };
  return { kind: "ok", pulse, sentences };
}

export async function defaultVisionHud(image: HudImage): Promise<VisionHudResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { kind: "down" };

  const dataUrl = dataUrlFromBytes(image.mime, image.bytes);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: HUD_VISION_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "HUD screenshot. Inferí el problema visible más urgente. JSON only.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { kind: "down" };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { kind: "unreadable" };
    return parseModelPayload(text);
  } catch {
    return { kind: "down" };
  }
}

export async function handleAdviseHud(
  input: unknown,
  deps: { vision?: VisionHudFn } = {},
): Promise<AdviseHudResult> {
  const parsed = await parseAdviseHudRequest(input);
  if (!("image" in parsed)) return parsed;

  const image = parsed.image;
  try {
    const vision = deps.vision ?? defaultVisionHud;
    const raw = await vision(image);
    return finalizeVision(raw);
  } finally {
    image.bytes.fill(0);
  }
}
