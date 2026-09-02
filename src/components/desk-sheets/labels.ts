/** Exact tap labels. Wiring (t_ab926ddd) must reuse these, not paraphrase. */
export const STAMP_TAP_LABEL = "Ver sello";
export const PLACE_TAP_LABEL = "Dónde va";
export const PERSON_TAP_LABEL = "Quién es";

export const TAP_LABELS = {
  sello: STAMP_TAP_LABEL,
  donde: PLACE_TAP_LABEL,
  quien: PERSON_TAP_LABEL,
} as const;

export type DeskLayer = keyof typeof TAP_LABELS;
