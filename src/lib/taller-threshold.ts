/**
 * Static production ratios for the Taller umbral.
 *
 * Versioned wiki numbers (CC-BY-SA): farmer residences one 100% chain
 * supplies, plus the chain's workforce and balance cost.
 * Source: https://anno1800.fandom.com/wiki/Production_chains
 *
 * Method inspired by NiHoel/Anno1800Calculator (MIT except params.js).
 * We do **not** copy params.js — that file is Ubisoft game assets, not MIT.
 */

export const TALLER_RATIOS_VERSION = "wiki-v1-2026-09" as const;
export const TALLER_WIKI = "https://anno1800.fandom.com/wiki/Production_chains" as const;
export const TALLER_NIHOEL = "https://github.com/NiHoel/Anno1800Calculator" as const;

export type TallerRatio = {
  id: string;
  good: string;
  buildingId: string;
  residencesServed: number;
  workforceCost: number;
  balanceCost: number;
};

export const TALLER_RATIOS: readonly TallerRatio[] = [
  {
    id: "fish",
    good: "pescado",
    buildingId: "fishery",
    residencesServed: 80,
    workforceCost: 25,
    balanceCost: 40,
  },
  {
    id: "clothes",
    good: "ropa de trabajo",
    buildingId: "knitters",
    residencesServed: 65,
    workforceCost: 60,
    balanceCost: 70,
  },
  {
    id: "schnapps",
    good: "schnapps",
    buildingId: "distillery",
    residencesServed: 60,
    workforceCost: 70,
    balanceCost: 60,
  },
];

export type TallerSnapshot = {
  balance: "unknown" | "up" | "down";
  saturation: "unknown" | "ok" | "yellow" | "empty";
  session: {
    missionId: string | null;
    buildingsKnown: boolean;
    buildingIds: string[];
    /** Live snapshot sessionName if the watcher wrote one. */
    sessionName?: string | null;
    /** Live snapshot workforce.farmers presence (no counts). */
    workforceFarmers?: boolean;
  };
};

export type TallerStamp =
  | { kind: "alcanza"; label: "Alcanza" }
  | { kind: "no-alcanza"; label: "No alcanza" }
  | { kind: "missing-good"; line: string };

export function ratioSupply(ratio: TallerRatio, buildingCount: number): number {
  return ratio.residencesServed * Math.max(0, buildingCount);
}

function missingLine(ratio: TallerRatio): TallerStamp {
  const good = ratio.good.charAt(0).toUpperCase() + ratio.good.slice(1);
  return { kind: "missing-good", line: `Falta ${good.toLowerCase()}.` };
}

function firstRatio(): TallerRatio {
  return TALLER_RATIOS[0]!;
}

function pickRatio(snapshot: TallerSnapshot): TallerRatio {
  if (!snapshot.session.buildingsKnown) return firstRatio();
  const present = new Set(snapshot.session.buildingIds);
  const hit = TALLER_RATIOS.find((row) => present.has(row.buildingId));
  return hit ?? firstRatio();
}

function buildingCount(snapshot: TallerSnapshot, ratio: TallerRatio): number {
  return snapshot.session.buildingIds.filter((id) => id === ratio.buildingId).length;
}

/**
 * One stamp from static ratios × live snapshot fields that already exist:
 * balance (pulse.coins), saturation (pulse.houses / workforce need), session
 * buildings. Never a goods grid, solver, or t/min hero.
 */
export function tallerThreshold(snapshot: TallerSnapshot): TallerStamp {
  const ratio = pickRatio(snapshot);

  if (snapshot.saturation === "empty") return missingLine(ratio);

  if (!snapshot.session.buildingsKnown) {
    if (snapshot.session.workforceFarmers && snapshot.saturation === "unknown" && snapshot.balance !== "down") {
      return { kind: "no-alcanza", label: "No alcanza" };
    }
    if (snapshot.saturation === "yellow" || snapshot.balance === "down") {
      return { kind: "no-alcanza", label: "No alcanza" };
    }
    if (snapshot.saturation === "ok" && snapshot.balance !== "down") {
      return { kind: "alcanza", label: "Alcanza" };
    }
    return missingLine(ratio);
  }

  const count = buildingCount(snapshot, ratio);
  const supply = ratioSupply(ratio, count);
  if (supply <= 0) return missingLine(ratio);

  if (snapshot.balance === "down" || snapshot.saturation === "yellow") {
    return { kind: "no-alcanza", label: "No alcanza" };
  }
  return { kind: "alcanza", label: "Alcanza" };
}
