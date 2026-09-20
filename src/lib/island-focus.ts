import campaignSeed from "./sim/fixtures/campaign-ch1.json" with { type: "json" };
import { playerIslandsFromSave } from "./live/evidence.ts";
import { islandKey } from "./live/island-key.ts";
import type { LiveSnapshot } from "./live/types.ts";

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
 * fixtures) first; the manual short list only when the seed has none.
 * Live colonies come from islandSnapshots (region+area), never from islandName.
 */
export function islandFocusOptions(): IslandFocusOption[] {
  const seeded = seedIslandFocusOptions();
  return seeded.length > 0 ? seeded : MANUAL_ISLAND_FOCUS_OPTIONS;
}

export function liveIslandFocusOptions(snapshot: LiveSnapshot | null | undefined): IslandFocusOption[] {
  return playerIslandsFromSave(snapshot).map((island) => ({
    id: islandKey(island.regionId, island.areaId),
    name: island.name,
  }));
}

export function focusOptionsForSnapshot(snapshot: LiveSnapshot | null | undefined): IslandFocusOption[] {
  const live = liveIslandFocusOptions(snapshot);
  return live.length ? live : islandFocusOptions();
}

export function defaultIslandFocusId(): string {
  return islandFocusOptions()[0]?.id ?? MANUAL_ISLAND_FOCUS_OPTIONS[0]!.id;
}

/** A stored id can be unset or stale (renamed/removed island) — always resolve to a real option. */
export function resolveIslandFocusId(
  activeId: string | null | undefined,
  options: IslandFocusOption[] = islandFocusOptions(),
): string {
  if (activeId && options.some((island) => island.id === activeId)) return activeId;
  return options[0]?.id ?? defaultIslandFocusId();
}

export function islandFocusName(id: string, options: IslandFocusOption[] = islandFocusOptions()): string {
  return options.find((island) => island.id === id)?.name ?? id;
}

/** "Esto, ahora" and the 10s chip must name the focused colony — never float free of an island. */
export function scopeEstoAhoraLine(
  islandId: string,
  line: string,
  options: IslandFocusOption[] = islandFocusOptions(),
): string {
  return `${islandFocusName(islandId, options)}: ${line}`;
}
