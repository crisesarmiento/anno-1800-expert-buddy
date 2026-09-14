import campaignSeed from "./sim/fixtures/campaign-ch1.json" with { type: "json" };

export type IslandFocusOption = {
  id: string;
  name: string;
};

type SeedIslandRow = { id?: unknown; name?: unknown };

/**
 * Manual fallback only when the seed has no islands[] yet. Known campaign
 * name, not an invented one — La Inapetente is the first city every run.
 */
const MANUAL_ISLAND_FOCUS_OPTIONS: IslandFocusOption[] = [
  { id: "la-inapetente", name: "La Inapetente" },
];

function seedIslandFocusOptions(): IslandFocusOption[] {
  const rows = (campaignSeed as { islands?: SeedIslandRow[] }).islands ?? [];
  const out: IslandFocusOption[] = [];
  for (const row of rows) {
    if (typeof row.id !== "string" || !row.id) continue;
    const name = typeof row.name === "string" && row.name ? row.name : row.id;
    out.push({ id: row.id, name });
  }
  return out;
}

/**
 * Island list for the Home focus selector. City-seed islands[] (Taller seed /
 * fixtures) first; the manual short list only when the seed has none. Never a
 * live CityName — that honestly waits on the nested FileDB work (other PR).
 */
export function islandFocusOptions(): IslandFocusOption[] {
  const seeded = seedIslandFocusOptions();
  return seeded.length > 0 ? seeded : MANUAL_ISLAND_FOCUS_OPTIONS;
}

export function defaultIslandFocusId(): string {
  return islandFocusOptions()[0]?.id ?? MANUAL_ISLAND_FOCUS_OPTIONS[0]!.id;
}

/** A stored id can be unset or stale (renamed/removed island) — always resolve to a real option. */
export function resolveIslandFocusId(activeId: string | null | undefined): string {
  if (activeId && islandFocusOptions().some((island) => island.id === activeId)) return activeId;
  return defaultIslandFocusId();
}

export function islandFocusName(id: string): string {
  return islandFocusOptions().find((island) => island.id === id)?.name ?? id;
}

/** "Esto, ahora" and the 10s chip must name the focused colony — never float free of an island. */
export function scopeEstoAhoraLine(islandId: string, line: string): string {
  return `${islandFocusName(islandId)}: ${line}`;
}
