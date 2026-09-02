import { createServerFn } from "@tanstack/react-start";
import { handleAdviseHud } from "@/lib/hud-advisor-logic";

export {
  ACCEPTED_IMAGE_MIME,
  HUD_ERROR_CODES,
  HUD_ERROR_MESSAGES,
  HUD_PULSES,
  HUD_VISION_PROMPT,
  MAX_IMAGE_BYTES,
  defaultVisionHud,
  finalizeVision,
  handleAdviseHud,
  hudError,
  parseAdviseHudRequest,
  postFilterSentences,
  type AdviseHudError,
  type AdviseHudResult,
  type AdviseHudSuccess,
  type HudErrorCode,
  type HudPulse,
  type VisionHudFn,
} from "@/lib/hud-advisor-logic";

export const adviseHud = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }) => handleAdviseHud(data));
