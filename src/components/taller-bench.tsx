import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CampaignPicker, IslandHistoryCard } from "@/components/island-history";
import { TallerEconomyCard } from "@/components/taller-economy";
import { NativeProductionCard } from "@/components/native-production-card";
import { InkSeal } from "@/components/stamps";
import { TallerCity } from "@/components/taller-city";
import { TallerGoodsBalance } from "@/components/taller-goods-balance";
import campaignCh1 from "@/lib/sim/fixtures/campaign-ch1.json";
import { applySaveCountsChip, compute, fillFromSimMode, parseCitySeed } from "@/lib/sim";
import type { CitySeed, SimMode } from "@/lib/sim/types";
import {
  TALLER_NIHOEL,
  TALLER_RATIOS_VERSION,
  TALLER_WIKI,
  tallerThreshold,
} from "@/lib/taller-threshold";
import { useHarbor } from "@/lib/store";

export function TallerBench() {
  const pulse = useHarbor((s) => s.pulse);
  const live = useHarbor((s) => s.liveSnapshot);
  const missionId = useHarbor((s) => s.missionId);
  // Taller is the only consumer of telemetry.buildings count/grid UI.
  const buildings = live?.telemetry?.buildings;
  const stamp = tallerThreshold({
    balance: pulse.coins !== "unknown" ? pulse.coins : (live?.pulseHint?.coins ?? "unknown"),
    saturation:
      pulse.houses !== "unknown" ? pulse.houses : (live?.pulseHint?.houses ?? "unknown"),
    session: {
      missionId,
      buildingsKnown: Boolean(buildings),
      buildingIds: (buildings ?? []).map((hit) => hit.id),
      sessionName: live?.sessionName ?? null,
      workforceFarmers: Boolean(live?.workforce?.farmers),
    },
  });

  // Shared city seed/sim between Ciudad and Bienes vistos — one source of
  // truth so Usar conteos (save-count chip) also feeds the comercio grid.
  const [mode, setMode] = useState<SimMode>("campaign");
  const [appliedSeed, setAppliedSeed] = useState<CitySeed | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { stats, seed } = useMemo(() => {
    const base = parseCitySeed({ ...campaignCh1, mode });
    const working = appliedSeed ? parseCitySeed({ ...appliedSeed, mode }) : base;
    return { stats: compute(working), seed: working };
  }, [mode, appliedSeed]);

  function onUseSaveCounts() {
    const result = applySaveCountsChip({ seed, live, fill: fillFromSimMode(mode) });
    setNotice(result.message);
    if (result.applied) setAppliedSeed(result.seed);
  }

  return (
    <div className="min-h-dvh bg-background" data-visual="taller">
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <p className="font-display text-lg leading-none font-semibold tracking-tight">
            Anno 1800 Buddy
          </p>
          <Link to="/" className="ml-auto inline-flex h-11 items-center text-sm text-primary">
            Inicio
          </Link>
          <Link to="/diario" className="inline-flex h-11 items-center text-sm text-primary">
            Diario
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-8 sm:px-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Taller
        </p>
        <article className="hero-orla rounded-xl p-5 sm:p-7">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Umbral</h1>
          <TallerStamp stamp={stamp} />
        </article>
        <TallerGoodsBalance mode={mode} seed={seed} stats={stats} />
        <TallerEconomyCard />
        <CampaignPicker />
        <IslandHistoryCard />
        <NativeProductionCard />
        <TallerCity
          mode={mode}
          onModeChange={setMode}
          stats={stats}
          seedIslands={seed.islands}
          notice={notice}
          onUseSaveCounts={onUseSaveCounts}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Ratios estáticos {TALLER_RATIOS_VERSION} (wiki CC-BY-SA, no params.js de NiHoel).{" "}
          <a href={TALLER_WIKI} target="_blank" rel="noreferrer" className="underline">
            Cadenas
          </a>
          {" · "}
          <a href={TALLER_NIHOEL} target="_blank" rel="noreferrer" className="underline">
            Calculadora NiHoel
          </a>
          . Anno 1800 es Ubisoft.
        </p>
      </main>
    </div>
  );
}

function TallerStamp({
  stamp,
}: {
  stamp: ReturnType<typeof tallerThreshold>;
}) {
  if (stamp.kind === "missing-good") {
    return (
      <p data-taller-stamp="missing-good" className="mt-6 text-lg leading-relaxed">
        {stamp.line}
      </p>
    );
  }
  const alcanza = stamp.kind === "alcanza";
  return (
    <p
      data-taller-stamp={stamp.kind}
      role="status"
      className="mt-6 inline-flex min-h-11 items-center gap-3 text-lg"
    >
      <InkSeal kind={alcanza ? "check" : "hourglass"} tone={alcanza ? "ink" : "saturado"} className="size-10" />
      <span>{stamp.label}</span>
    </p>
  );
}
