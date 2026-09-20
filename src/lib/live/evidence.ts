import type { LiveNamedHit, LiveSnapshot } from "./types.ts";

/** Catalog session/region ids. Never a player-renamed colony. */
export const SESSION_REGION_IDS = new Set(["old-world", "new-world", "bright-sands"]);
export const SESSION_REGION_NAMES = new Set(["old world", "new world", "bright sands"]);

export type StorageOwner = "player" | "unknown";

export type LiveDataPath =
  | "windows-watcher"
  | "research-typescript"
  | "empty-mod-xml"
  | "optional-ocr"
  | "manual-json";

export const WINDOWS_READER_PATHS = [
  "public/watch-harbor-live.ps1",
  "src/lib/live/a7s-scan.cs",
] as const;

export const RESEARCH_READER_PATHS = [
  "src/lib/live/a7s-snapshot.ts",
  "src/lib/live/a7s-read.ts",
  "src/lib/live/a7s-trade-routes.ts",
  "scripts/filedb-probe.ts",
] as const;

export const EMPTY_MOD_XML_PATH =
  "mod/harbor-buddy-telemetry/data/config/export/main/asset/assets.xml";

export function isPlayerParticipant(id: number | null | undefined): boolean {
  return id === 0;
}

export function isSessionRegionHit(
  hit: { id?: string; name?: string } | string | null | undefined,
): boolean {
  if (hit == null) return false;
  if (typeof hit === "string") {
    const key = hit.trim().toLowerCase();
    return SESSION_REGION_IDS.has(key) || SESSION_REGION_NAMES.has(key);
  }
  if (hit.id && SESSION_REGION_IDS.has(hit.id)) return true;
  const name = hit.name?.trim().toLowerCase();
  return Boolean(name && SESSION_REGION_NAMES.has(name));
}

/**
 * Etapa 0 cannot resolve CityName. Save `islandName` / `telemetry.islands`
 * are session/region hits — never a player island identity.
 */
export function playerIslandFromSave(_snapshot: LiveSnapshot | null | undefined): null {
  return null;
}

/** OCR Statistics island — observed selected island, not a save CityName. */
export function ocrSelectedIsland(snapshot: LiveSnapshot | null | undefined): string | undefined {
  const name = snapshot?.connection?.native?.islandName?.trim();
  return name || undefined;
}

export function regionHitsFromSnapshot(snapshot: LiveSnapshot | null | undefined): LiveNamedHit[] {
  return (snapshot?.telemetry?.islands ?? []).filter((hit) => isSessionRegionHit(hit));
}

export function emptyModInjectsTelemetry(): false {
  return false;
}

export function unknownAmountIsZero(_value: number | null | undefined): false {
  return false;
}

export function canDiagnoseSaveFinance(storageOwner: StorageOwner | undefined): boolean {
  return storageOwner === "player";
}

export function liveJsonWriterPath(snapshot: LiveSnapshot | null | undefined): LiveDataPath {
  if (!snapshot) return "manual-json";
  const mode = snapshot.connection?.mode;
  if (mode === "documents-save" || mode === "ubisoft-cloud") return "windows-watcher";
  if (mode === "native") return "optional-ocr";
  if (mode === "manual" || snapshot.source === "file") return "manual-json";
  if (snapshot.source === "save") return "windows-watcher";
  return "manual-json";
}

export const PRODUCTION_ADVICE_EVIDENCE = "inferred" as const;
