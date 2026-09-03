import { useMemo, useState, type ReactNode } from "react";
import { Stamp, goodStamp } from "@/components/stamps";
import campaignCh1 from "@/lib/sim/fixtures/campaign-ch1.json";
import {
  TIER_NAME_ES,
  buildingById,
  compute,
  goodBalance,
  goodNameEs,
  outputTMinAt100,
  parseCitySeed,
} from "@/lib/sim";
import type { BuildingId, GoodId, Island, IslandStats, PopulationTier, SimMode } from "@/lib/sim/types";

const LIVE_ONLY = [
  "Stock del almacén",
  "Felicidad y atractivo",
  "Rumores y periódico",
  "Productividad real (fluctúa)",
  "Ingresos de rutas comerciales",
  "Ítems, barcos y Docklands",
] as const;

const WORLD_NAME_ES: Record<Island["world"], string> = {
  old: "Viejo Mundo",
  new: "Nuevo Mundo",
};

function fmt(value: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
}

const BALANCE_LABEL = {
  falta: "Falta",
  alcanza: "Alcanza",
  saturado: "Saturado",
} as const;

/**
 * Panel de ciudades. Solo Taller. Una tarjeta por isla del seed.
 * Campaña es el default; sandbox (ratio wiki) es un toggle de Taller.
 * Fixture de campaña: La Inapetente es la isla por defecto.
 */
export function TallerCity() {
  const [mode, setMode] = useState<SimMode>("campaign");
  const { stats, seedIslands } = useMemo(() => {
    const seed = parseCitySeed({ ...campaignCh1, mode });
    return { stats: compute(seed), seedIslands: seed.islands };
  }, [mode]);

  return (
    <div className="flex flex-col gap-6" data-taller-city="seed">
      <div className="flex flex-wrap gap-2">
        <ModeChip current={mode} value="campaign" onClick={setMode}>
          Campaña
        </ModeChip>
        <ModeChip current={mode} value="perfect" onClick={setMode}>
          Sandbox (ratio wiki)
        </ModeChip>
      </div>
      {mode === "perfect" ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sandbox es el ratio wiki. En campaña, una de cada alcanza.
        </p>
      ) : null}

      {stats.islands.map((island, index) => (
        <CityCard key={island.id} island={island} seedIsland={seedIslands[index]!} mode={mode} />
      ))}
    </div>
  );
}

function CityCard({
  island,
  seedIsland,
  mode,
}: {
  island: IslandStats;
  seedIsland: Island;
  mode: SimMode;
}) {
  const next = island.nextBuild;
  const nextGood = next ? buildingById(next.buildingId)?.output : undefined;
  const alerts = island.alerts.filter((row) => row.id !== "next");
  const houseTiers = (Object.keys(island.housesPresent) as PopulationTier[]).filter(
    (tier) => (island.housesPresent[tier] ?? 0) > 0,
  );
  const productivity = seedIsland.productivity ?? 100;
  const productionRows = (Object.entries(seedIsland.buildings) as [string, number][])
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([id, count]) => {
      const building = buildingById(id as BuildingId);
      if (!building) return null;
      return {
        id,
        count: count ?? 0,
        nameEs: building.nameEs,
        good: building.output,
        rate: outputTMinAt100(building, count ?? 0, productivity),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  return (
    <article className="hero-orla rounded-xl p-5 sm:p-7" data-taller-city-card={island.id}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Ciudad · {WORLD_NAME_ES[island.world]}
      </p>
      <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight" data-taller-island="">
        {seedIsland.name ?? island.id}
      </h2>
      {island.confidence === "presence" ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          El watcher solo vio nombres. Sin casas ni fábricas anotadas no invento toneladas.
        </p>
      ) : null}

      {next ? (
        <p
          data-taller-next-build={next.buildingId}
          className="mt-5 flex items-start gap-2 text-lg leading-relaxed"
        >
          {nextGood ? <GoodBadge good={nextGood} /> : null}
          <span>{next.line}</span>
        </p>
      ) : (
        <p className="mt-5 text-lg leading-relaxed">No hay un próximo edificio en este seed.</p>
      )}

      {alerts.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-2 text-sm leading-relaxed">
          {alerts.map((alert) => (
            <li key={alert.id} data-taller-city-alert={alert.id} className="flex items-start gap-2">
              {alert.good ? <GoodBadge good={alert.good} /> : null}
              <span>{alert.line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {island.confidence === "presence" ? null : (
        <>
          <Section title="Población" attr="poblacion">
            {houseTiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin casas anotadas todavía.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {houseTiers.map((tier) => (
                  <li key={tier} data-taller-house-tier={tier}>
                    {island.housesPresent[tier]} casas de {TIER_NAME_ES[tier]} · máx{" "}
                    {fmt(island.housesMax[tier] ?? 0)} habitantes
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-sm text-muted-foreground" data-taller-workforce-estimate="">
              Mano de obra estimada:{" "}
              {houseTiers
                .map((tier) => `${fmt(island.workforceEstimate[tier] ?? 0)} ${TIER_NAME_ES[tier]}`)
                .join(", ") || "sin casas"}
              {island.occupancyAssumedFull
                ? ". El seed no trae ocupación: asumo las casas llenas."
                : "."}
            </p>
          </Section>

          <Section title="Producción" attr="produccion">
            {productionRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin fábricas anotadas todavía.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {productionRows.map((row) => (
                  <li key={row.id} data-taller-production-building={row.id} className="flex items-center gap-1.5">
                    <GoodBadge good={row.good} />
                    <span>
                      {row.count}× {row.nameEs} · {fmt(row.rate)} ton/min a {productivity}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {island.flows.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {island.flows.map((flow) => {
                  const balance = goodBalance(flow.gapTMin, flow.demandTMin);
                  return (
                    <li
                      key={flow.good}
                      data-taller-good-flow={flow.good}
                      data-taller-balance={balance ?? "sin-dato"}
                      className="flex items-center gap-1.5"
                    >
                      <GoodBadge good={flow.good} />
                      <span>
                        demanda {fmt(flow.demandTMin ?? 0)} · oferta {fmt(flow.supplyTMin ?? 0)} ton/min
                        {balance ? ` · ${BALANCE_LABEL[balance]}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </Section>

          <Section title="Almacén" attr="almacen">
            <p className="text-sm text-muted-foreground" data-taller-liveonly="almacen">
              El seed no trae stock del almacén. En el juego: Ctrl+W.
            </p>
          </Section>

          <Section title="Finanzas" attr="finanzas">
            {island.maintenance != null ? (
              <p className="text-sm">Mantenimiento de las fábricas contadas: {fmt(-island.maintenance)}/min.</p>
            ) : (
              <p className="text-sm text-muted-foreground" data-taller-liveonly="finanzas">
                El seed no trae mantenimiento de todas las fábricas contadas. En el juego: Ctrl+E.
              </p>
            )}
          </Section>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground" data-taller-liveonly-list="">
            No invento en Taller: {LIVE_ONLY.join(", ")}. En el juego: Ctrl+Q/R/W/E.
          </p>
        </>
      )}

      {mode === "perfect" && island.confidence !== "presence" ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Sandbox: ratio wiki, no el de campaña.
        </p>
      ) : null}
    </article>
  );
}

function Section({ title, attr, children }: { title: string; attr: string; children: ReactNode }) {
  return (
    <div className="mt-5" data-taller-section={attr}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Icon + Spanish good name, original stamp only. Ciudad-only, never Home/Esto. */
function GoodBadge({ good }: { good: GoodId }) {
  const name = goodNameEs(good);
  return (
    <span data-taller-good={good} className="mt-0.5 inline-flex shrink-0 items-center gap-1.5">
      <Stamp name={goodStamp(good)} title={name} className="size-6" />
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{name}</span>
    </span>
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
