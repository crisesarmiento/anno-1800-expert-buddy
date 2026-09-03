import { Link } from "@tanstack/react-router";
import { InkSeal } from "@/components/stamps";
import { TallerCity } from "@/components/taller-city";
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

  return (
    <div className="min-h-dvh bg-background" data-visual="taller">
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <p className="font-display text-lg leading-none font-semibold tracking-tight">
            Anno 1800 Buddy
          </p>
          <Link to="/" className="ml-auto inline-flex h-11 items-center text-sm text-primary">
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
        <TallerCity />
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
