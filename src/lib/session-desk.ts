import type { CalmMode } from "@/lib/store";
import type { Pulse } from "@/lib/play";

const PADS = [
  "Seguí el marcador de la misión.",
  "Una cosa a la vez.",
  "Cuando esté, tachá y seguí.",
] as const;

export const DESK_UMBRALES = ["enough", "not-enough", "saturado", "rojo"] as const;
export type DeskUmbral = (typeof DESK_UMBRALES)[number];

/** Static fandom taller. Text link only — no Ubisoft art. */
export const TALLER_LINK = {
  href: "https://anno1800.fandom.com/wiki/Production_buildings",
  label: "Ver taller",
} as const;

export type DeskCalm = {
  saturado: boolean;
  rojo: boolean;
  umbral: DeskUmbral;
  alarm: boolean;
  taller: { href: string; label: string } | null;
};

export function sessionChecklist(doItems: string[]): string[] {
  const items = doItems.slice(0, 3);
  let pad = 0;
  while (items.length < 3) {
    items.push(PADS[pad] ?? PADS[0]);
    pad += 1;
  }
  return items;
}

/**
 * Desk calm umbral.
 * - enough: no crisis — card stays calm, no taller
 * - not-enough: yellow/empty houses — Saturado chip on, card stays calm, taller link-out
 * - saturado: player said overwhelmed — card alarms, taller link-out
 * - rojo: coins down / broke — card alarms, no taller (stop building)
 * Rojo wins the umbral when both crises are on.
 */
export function deskCalmUmbral(pulse: Pulse, calm: CalmMode): DeskCalm {
  const rojo = pulse.coins === "down" || calm === "broke";
  const saturadoExplicit = calm === "overwhelmed";
  const notEnough = pulse.houses === "yellow" || pulse.houses === "empty";
  const saturado = saturadoExplicit || notEnough;

  const umbral: DeskUmbral = rojo
    ? "rojo"
    : saturadoExplicit
      ? "saturado"
      : notEnough
        ? "not-enough"
        : "enough";

  const alarm = umbral === "rojo" || umbral === "saturado";
  const taller =
    umbral === "not-enough" || umbral === "saturado"
      ? { href: TALLER_LINK.href, label: TALLER_LINK.label }
      : null;

  return { saturado, rojo, umbral, alarm, taller };
}

export function saturadoRojo(
  pulse: Pulse,
  calm: CalmMode,
): { saturado: boolean; rojo: boolean } {
  const { saturado, rojo } = deskCalmUmbral(pulse, calm);
  return { saturado, rojo };
}
