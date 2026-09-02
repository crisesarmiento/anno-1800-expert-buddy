import {
  ACCEPTED_IMAGE_MIME,
  HUD_ERROR_MESSAGES,
  MAX_IMAGE_BYTES,
  hudError,
  type AdviseHudError,
  type AdviseHudResult,
  type HudPulse,
} from "./hud-advisor-logic.ts";

export const HUD_IDLE_COPY = "Pegá o arrastrá una captura del HUD.";
export const HUD_LOADING_COPY = "Leyendo el HUD…";
export const HUD_RETRY_COPY = "Pegá de nuevo una sola foto.";

export const HUD_PULSE_LABEL: Record<HudPulse, string> = {
  rojo: "rojo",
  amarillo: "amarillo",
  vacío: "vacío",
  recado: "recado",
};

export type HudUiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; pulse: HudPulse; sentences: string[] }
  | { kind: "error"; message: string };

export type HudImagePick = AdviseHudError | { ok: true; file: File };

function isAcceptedMime(mime: string): mime is (typeof ACCEPTED_IMAGE_MIME)[number] {
  return (ACCEPTED_IMAGE_MIME as readonly string[]).includes(mime);
}

export function filesFromDataTransfer(dt: DataTransfer | null | undefined): File[] {
  if (!dt) return [];
  const seen = new Set<string>();
  const out: File[] = [];
  const push = (file: File | null | undefined) => {
    if (!file) return;
    const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(file);
  };
  for (const file of Array.from(dt.files ?? [])) push(file);
  const items = dt.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item?.kind === "file") push(item.getAsFile());
    }
  }
  return out;
}

export function pickHudImage(files: File[]): HudImagePick {
  if (files.length === 0) return hudError("empty_paste");
  if (files.length > 1) return hudError("multi_image");
  const file = files[0]!;
  const mime = (file.type || "").toLowerCase();
  if (!isAcceptedMime(mime)) return hudError("not_image");
  if (file.size === 0) return hudError("empty_paste");
  if (file.size > MAX_IMAGE_BYTES) return hudError("not_image");
  return { ok: true, file };
}

export async function fileToImageDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = (file.type || "image/png").toLowerCase();
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 = btoa(binary);
  return `data:${mime};base64,${b64}`;
}

export function displaySentences(sentences: readonly string[]): string[] {
  return sentences.slice(0, 4);
}

export function resultToUi(result: AdviseHudResult): HudUiState {
  if (result.ok) {
    const sentences = displaySentences(result.sentences);
    if (sentences.length === 0) {
      return { kind: "error", message: HUD_ERROR_MESSAGES.unreadable_hud };
    }
    return { kind: "success", pulse: result.pulse, sentences };
  }
  return { kind: "error", message: result.message };
}

export function networkFailureUi(): HudUiState {
  return { kind: "error", message: HUD_ERROR_MESSAGES.advisor_down };
}
