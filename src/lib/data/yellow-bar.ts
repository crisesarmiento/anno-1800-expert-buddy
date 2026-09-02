export const YELLOW_BAR_ZONES = ["costa", "campo", "10x10"] as const;
export type YellowBarZone = (typeof YELLOW_BAR_ZONES)[number];

export const YELLOW_BAR_NEEDS = [
  "Mercado",
  "Pescado",
  "Ropa",
  "Schnapps",
  "Taberna",
  "calle",
] as const;
export type YellowBarNeed = (typeof YELLOW_BAR_NEEDS)[number];

export type YellowBarRow = {
  need: YellowBarNeed;
  building: string;
  zone: YellowBarZone;
  /** Optional extra income. Never a required chain. */
  luxury: boolean;
};

/**
 * P0 glanceable map: one yellow need chip → one building + one zone.
 * No t/min, no ratios, no multi-building recipes.
 */
export const yellowBarDecoder: YellowBarRow[] = [
  { need: "Mercado", building: "Mercado", zone: "10x10", luxury: false },
  { need: "Pescado", building: "Pescadería", zone: "costa", luxury: false },
  { need: "Ropa", building: "Telares", zone: "10x10", luxury: false },
  {
    need: "Schnapps",
    building: "Destilería de Schnapps",
    zone: "10x10",
    luxury: true,
  },
  { need: "Taberna", building: "Taberna", zone: "10x10", luxury: true },
  { need: "calle", building: "Calle", zone: "10x10", luxury: false },
];

export const yellowBarByNeed: Record<YellowBarNeed, YellowBarRow> =
  Object.fromEntries(
    yellowBarDecoder.map((row) => [row.need, row]),
  ) as Record<YellowBarNeed, YellowBarRow>;

const CHIP_ALIASES: Record<string, YellowBarNeed> = {
  mercado: "Mercado",
  pescado: "Pescado",
  ropa: "Ropa",
  "ropa de trabajo": "Ropa",
  schnapps: "Schnapps",
  taberna: "Taberna",
  calle: "calle",
  calles: "calle",
};

function foldChip(raw: string): string {
  return raw
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Chip name or screenshot label → one row, or null if unknown. */
export function decodeYellowBar(chip: string): YellowBarRow | null {
  const folded = foldChip(chip);
  if (!folded) return null;
  const need = CHIP_ALIASES[folded];
  return need ? yellowBarByNeed[need] : null;
}
