import type { CalmMode } from "@/lib/store";
import type { Pulse } from "@/lib/play";

const NOW_FALLBACK = "Seguí el marcador de la misión.";

/** Exactly one next action. Never pads to a three-item checklist. */
export function sessionNowItem(doItems: string[], checked: number[] = []): string {
  const next = doItems.findIndex((_, index) => !checked.includes(index));
  if (next >= 0) return doItems[next] ?? NOW_FALLBACK;
  return doItems[0] ?? NOW_FALLBACK;
}

export function saturadoRojo(
  pulse: Pulse,
  calm: CalmMode,
): { saturado: boolean; rojo: boolean } {
  const rojo = pulse.coins === "down" || calm === "broke";
  const saturado =
    calm === "overwhelmed" || pulse.houses === "yellow" || pulse.houses === "empty";
  return { saturado, rojo };
}
