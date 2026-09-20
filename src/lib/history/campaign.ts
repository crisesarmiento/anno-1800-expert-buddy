import { isPlayerParticipant } from "../live/evidence.ts";
import { islandKey } from "../live/island-key.ts";
import type { LiveSnapshot } from "../live/types.ts";
import type {
  CampaignCandidate,
  CampaignResolveResult,
  HistoryCampaign,
} from "./types.ts";

/**
 * Stable campaign fingerprint from player island identities.
 * Filename, mtime and sessionName are never enough on their own.
 */
export function campaignFingerprint(snapshot: LiveSnapshot): string | null {
  const keys = (snapshot.islandSnapshots ?? [])
    .filter((island) => isPlayerParticipant(island.ownerId))
    .map((island) => islandKey(island.regionId, island.areaId))
    .sort();
  if (!keys.length) return null;
  return `islands:${keys.join(",")}`;
}

export function resolveCampaignId(input: {
  snapshot: LiveSnapshot;
  explicitCampaignId?: string;
  known: HistoryCampaign[];
}): CampaignResolveResult {
  if (input.explicitCampaignId?.trim()) {
    return {
      ok: true,
      campaignId: input.explicitCampaignId.trim(),
      method: "explicit",
    };
  }
  if (input.snapshot.campaignId?.trim()) {
    return { ok: true, campaignId: input.snapshot.campaignId.trim(), method: "snapshot" };
  }
  const fingerprint = campaignFingerprint(input.snapshot);
  if (!fingerprint) {
    return {
      ok: false,
      reason: "ambiguous",
      candidates: asCandidates(input.known),
    };
  }
  const matches = input.known.filter((row) => row.fingerprint === fingerprint);
  if (matches.length === 1) {
    return { ok: true, campaignId: matches[0]!.id, method: "fingerprint" };
  }
  if (matches.length === 0) {
    return { ok: true, campaignId: fingerprint, method: "fingerprint" };
  }
  return { ok: false, reason: "ambiguous", candidates: asCandidates(matches) };
}

function asCandidates(rows: HistoryCampaign[]): CampaignCandidate[] {
  return rows.map((row) => ({
    id: row.id,
    fingerprint: row.fingerprint,
    label: row.label,
  }));
}

export function sampleClock(sample: {
  simTime?: number | null;
  savedAt?: string;
}): number | null {
  if (typeof sample.simTime === "number" && Number.isFinite(sample.simTime)) {
    return sample.simTime;
  }
  if (sample.savedAt) {
    const ms = Date.parse(sample.savedAt);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}
