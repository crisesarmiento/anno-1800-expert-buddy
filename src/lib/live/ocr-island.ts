import { isSessionRegionHit } from "./evidence.ts";
import type { LiveIslandRef, LiveIslandSnapshot, LiveSnapshot } from "./types.ts";

export type OcrIslandMatch =
  | { status: "unique"; island: LiveIslandSnapshot }
  | { status: "none" }
  | { status: "ambiguous"; matches: LiveIslandSnapshot[] };

function normalizeName(value: string) {
  return value.trim();
}

/**
 * OCR display names never identify an island on their own when two colonies
 * share the same label. Region/session catalog names are also rejected.
 */
export function matchOcrIslandName(
  ocrName: string | null | undefined,
  islands: LiveIslandSnapshot[] | undefined,
): OcrIslandMatch {
  const name = ocrName ? normalizeName(ocrName) : "";
  if (!name || !islands?.length) return { status: "none" };
  if (isSessionRegionHit(name)) return { status: "none" };
  const matches = islands.filter((island) => normalizeName(island.name) === name);
  if (matches.length === 1) return { status: "unique", island: matches[0]! };
  if (matches.length > 1) return { status: "ambiguous", matches };
  return { status: "none" };
}

export function ocrIslandRef(
  ocrName: string | null | undefined,
  islands: LiveIslandSnapshot[] | undefined,
): LiveIslandRef | undefined {
  const match = matchOcrIslandName(ocrName, islands);
  if (match.status !== "unique") return undefined;
  return { regionId: match.island.regionId, areaId: match.island.areaId };
}

/** Attach save island identity to OCR fields only when the mapping is unique. */
export function attachOcrIslandIdentity(snapshot: LiveSnapshot): LiveSnapshot {
  const islands = snapshot.islandSnapshots;
  const native = snapshot.connection?.native;
  if (!islands?.length || !native) return snapshot;

  const nativeRef = ocrIslandRef(native.islandName, islands);
  let nextNative = native;
  if (nativeRef) nextNative = { ...native, islandRef: nativeRef };
  else if (native.islandRef) {
    const { islandRef: _drop, ...rest } = native;
    nextNative = rest;
  }

  const production = snapshot.telemetry?.production;
  let nextProduction = production;
  if (production?.length) {
    nextProduction = production.map((row) => {
      const ref = ocrIslandRef(row.islandName, islands);
      if (ref) return { ...row, islandRef: ref };
      if (!row.islandRef) return row;
      const { islandRef: _drop, ...rest } = row;
      return rest;
    });
  }

  const next: LiveSnapshot = { ...snapshot };
  if (snapshot.connection) {
    next.connection = { ...snapshot.connection, native: nextNative };
  }
  if (snapshot.telemetry && nextProduction) {
    next.telemetry = { ...snapshot.telemetry, production: nextProduction };
  }
  return next;
}
