import { isPlayerParticipant } from "./evidence.ts";
import type {
  LiveCoverage,
  LiveCoverageField,
  LiveCoverageReason,
  LiveCoverageRow,
  LiveCoverageStatus,
  LiveReader,
  LiveReaderCapability,
  LiveSnapshot,
} from "./types.ts";

export const LIVE_READER_ID = "harbor-watcher" as const;
export const LIVE_READER_VERSION = "0.6.0" as const;
export const LIVE_READER_ENGINE = "a7s-scan" as const;

/** What this save reader knows how to extract. OCR is optional watcher enrichment, not a scanner capability. */
export const LIVE_READER_CAPABILITIES = [
  "buildings",
  "playerGoods",
  "playerTreasury",
  "routes",
  "routeStations",
  "islandSnapshots",
  "islandNames",
  "islandStock",
  "islandBuildings",
  "fleet",
] as const satisfies readonly LiveReaderCapability[];

export const LIVE_COVERAGE_FIELDS = [
  ...LIVE_READER_CAPABILITIES,
  "quests",
  "income",
  "maintenance",
  "ocrProduction",
] as const satisfies readonly LiveCoverageField[];

export const LIVE_COVERAGE_STATUSES = ["present", "absent", "unavailable"] as const satisfies readonly LiveCoverageStatus[];

export const LIVE_COVERAGE_REASONS = [
  "empty-on-purpose",
  "no-player-owner",
  "no-area-id",
  "no-city-name",
  "not-extracted",
  "no-observation",
] as const satisfies readonly LiveCoverageReason[];

export function harborWatcherReader(): LiveReader {
  return {
    id: LIVE_READER_ID,
    version: LIVE_READER_VERSION,
    engine: LIVE_READER_ENGINE,
    capabilities: [...LIVE_READER_CAPABILITIES],
  };
}

function row(
  field: LiveCoverageField,
  status: LiveCoverageStatus,
  extra?: { count?: number; reason?: LiveCoverageReason },
): LiveCoverageRow {
  const out: LiveCoverageRow = { field, status };
  if (status === "present" && extra?.count != null && extra.count > 0) out.count = extra.count;
  if (extra?.reason) out.reason = extra.reason;
  return out;
}

function presentOrAbsent(
  field: LiveCoverageField,
  count: number,
  absentReason: LiveCoverageReason = "not-extracted",
): LiveCoverageRow {
  if (count > 0) return row(field, "present", { count });
  return row(field, "absent", { reason: absentReason });
}

/**
 * Snapshot-level coverage. Present means this JSON has the field.
 * Absent means the reader can extract it but this save did not yield it.
 * Unavailable means the reader does not publish it — never treat that as 0.
 */
export function buildCoverage(snapshot: LiveSnapshot): LiveCoverage {
  const islands = (snapshot.islandSnapshots ?? []).filter((island) =>
    isPlayerParticipant(island.ownerId),
  );
  const named = islands.filter(
    (island) => island.nameSource === "city-name" || island.nameSource === "city-name-guid",
  );
  const stocked = islands.filter((island) => (island.stock?.length ?? 0) > 0);
  const built = islands.filter((island) => (island.buildings?.length ?? 0) > 0);
  const routes = snapshot.telemetry?.routes ?? [];
  const stationed = routes.filter((route) =>
    (route.delivery?.stations ?? []).some((station) => station.areaId != null),
  );
  const buildings = snapshot.telemetry?.buildings?.length ?? 0;
  const goods = snapshot.telemetry?.goods?.length ?? 0;
  const fleet = snapshot.telemetry?.fleet?.length ?? 0;
  const production = snapshot.telemetry?.production?.length ?? 0;
  const questsWithState = snapshot.quests.filter((quest) => quest.state).length;
  const treasuryPresent = snapshot.economy != null && Number.isFinite(snapshot.economy.treasury);

  const fields: LiveCoverageRow[] = [
    presentOrAbsent("buildings", buildings),
    presentOrAbsent("playerGoods", goods),
    treasuryPresent
      ? row("playerTreasury", "present")
      : row("playerTreasury", "absent", { reason: "no-player-owner" }),
    presentOrAbsent("routes", routes.length),
    stationed.length
      ? row("routeStations", "present", { count: stationed.length })
      : row("routeStations", "absent", { reason: "no-area-id" }),
    presentOrAbsent("islandSnapshots", islands.length),
    named.length
      ? row("islandNames", "present", { count: named.length })
      : row("islandNames", "absent", { reason: "no-city-name" }),
    presentOrAbsent("islandStock", stocked.length),
    presentOrAbsent("islandBuildings", built.length),
    presentOrAbsent("fleet", fleet),
    questsWithState
      ? row("quests", "present", { count: questsWithState })
      : snapshot.quests.length
        ? row("quests", "absent", { reason: "not-extracted" })
        : row("quests", "unavailable", { reason: "empty-on-purpose" }),
    row("income", "unavailable", { reason: "no-player-owner" }),
    row("maintenance", "unavailable", { reason: "no-player-owner" }),
    production
      ? row("ocrProduction", "present", { count: production })
      : snapshot.connection?.nativeProbe
        ? row("ocrProduction", "absent", { reason: "no-observation" })
        : row("ocrProduction", "unavailable", { reason: "not-extracted" }),
  ];

  const coverage: LiveCoverage = { fields };
  if (snapshot.savedAt) coverage.observedAt = snapshot.savedAt;
  return coverage;
}

export function coverageRowFor(
  coverage: LiveCoverage | undefined,
  field: LiveCoverageField,
): LiveCoverageRow | undefined {
  return coverage?.fields.find((item) => item.field === field);
}

export function coverageIsUnavailable(
  coverage: LiveCoverage | undefined,
  field: LiveCoverageField,
): boolean {
  return coverageRowFor(coverage, field)?.status === "unavailable";
}
