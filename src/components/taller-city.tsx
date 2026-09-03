import { useMemo, useState } from "react";
import campaignCh1 from "@/lib/sim/fixtures/campaign-ch1.json";
import { compute, parseCitySeed } from "@/lib/sim";
import type { SimMode } from "@/lib/sim/types";

/**
 * Panel mínimo de ciudad. Solo Taller. Sin grilla de bienes.
 * Campaña es el default; perfecto es un toggle de Taller.
 */
export function TallerCity() {
  const [mode, setMode] = useState<SimMode>("campaign");
  const stats = useMemo(() => {
    const seed = parseCitySeed({ ...campaignCh1, mode });
    return compute(seed);
  }, [mode]);
  const island = stats.islands[0];
  const farmers = island?.housesPresent.farmer ?? 0;
  const next = island?.nextBuild;
  const alerts = (island?.alerts ?? []).filter((row) => row.id !== "next");

  return (
    <article className="hero-orla rounded-xl p-5 sm:p-7" data-taller-city="seed">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ciudad</p>
      <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight">Bright Sands</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {farmers} casas de granjero. El seed lo carga el jugador; el watcher no alcanza para conteos.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <ModeChip current={mode} value="campaign" onClick={setMode}>
          Campaña
        </ModeChip>
        <ModeChip current={mode} value="perfect" onClick={setMode}>
          Perfecto
        </ModeChip>
      </div>
      {mode === "perfect" ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Perfecto es el ratio wiki. En campaña, una de cada alcanza.
        </p>
      ) : null}

      {next ? (
        <p data-taller-next-build={next.buildingId} className="mt-5 text-lg leading-relaxed">
          {next.line}
        </p>
      ) : (
        <p className="mt-5 text-lg leading-relaxed">No hay un próximo edificio en este seed.</p>
      )}

      {alerts.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-2 text-sm leading-relaxed">
          {alerts.map((alert) => (
            <li key={alert.id} data-taller-city-alert={alert.id}>
              {alert.line}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ModeChip({
  current,
  value,
  onClick,
  children,
}: {
  current: SimMode;
  value: SimMode;
  onClick: (mode: SimMode) => void;
  children: string;
}) {
  const on = current === value;
  return (
    <button
      type="button"
      data-taller-mode={value}
      aria-pressed={on}
      onClick={() => onClick(value)}
      className={
        on
          ? "inline-flex min-h-11 items-center rounded-full border border-ink bg-card px-4 text-sm font-medium"
          : "inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm text-muted-foreground"
      }
    >
      {children}
    </button>
  );
}
