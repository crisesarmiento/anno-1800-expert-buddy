import type { CalmMode } from "@/lib/store";
import type { Pulse } from "@/lib/play";

const PADS = [
  "Seguí el marcador de la misión.",
  "Una cosa a la vez.",
  "Cuando esté, tachá y seguí.",
] as const;

export function sessionChecklist(doItems: string[]): string[] {
  const items = doItems.slice(0, 3);
  let pad = 0;
  while (items.length < 3) {
    items.push(PADS[pad] ?? PADS[0]);
    pad += 1;
  }
  return items;
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
