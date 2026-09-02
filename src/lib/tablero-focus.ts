import type { DoNowRow } from "./rank-do-this-now.ts";

export type TableroFocusKind = "alert" | "calm";

export type TableroFocus = {
  kind: TableroFocusKind;
  title: string;
  detail?: string;
};

/**
 * /tablero shows exactly one focus: a ranked alert, else one calm todo.
 * Never a KPI stack. Empty bag → calm done/no-mission copy, not a pad alert.
 */
export function tableroFocus(input: {
  rows: DoNowRow[];
  hasMission: boolean;
  doneTitle: string;
  noMissionTitle: string;
}): TableroFocus {
  const top = input.rows[0];
  if (top && (top.band === "bad" || top.band === "warn")) {
    return { kind: "alert", title: top.title, ...(top.detail ? { detail: top.detail } : {}) };
  }
  if (top) {
    return { kind: "calm", title: top.title, ...(top.detail ? { detail: top.detail } : {}) };
  }
  return {
    kind: "calm",
    title: input.hasMission ? input.doneTitle : input.noMissionTitle,
  };
}
