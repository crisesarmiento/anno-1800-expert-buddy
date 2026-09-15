import { InkSeal, Stamp, goodStamp } from "@/components/stamps";
import { GOOD_NAME_ES, seenChapterId } from "@/lib/sim";
import type { CitySeed, CityStats, GoodId, SimMode } from "@/lib/sim/types";
import { TALLER_SATURADO_DETAIL } from "@/lib/taller-threshold";
import { useHarbor } from "@/lib/store";
import {
  classifyWorkshopGoods,
  workshopGoodPaint,
  type WorkshopGoodPaint,
  type WorkshopGoodStatus,
} from "@/lib/workshop-balance";

const STATUS_LABEL: Record<WorkshopGoodStatus, string> = {
  falta: "Falta",
  alcanza: "Alcanza",
  saturado: "Saturado",
};

/**
 * Live cadena+stock status for goods the player has seen.
 * Mount on /taller only. No inventar rutas ni grilla de mercado.
 * Campaign gates the list by chapter-seen chains; sandbox lifts that gate.
 */
export function TallerGoodsBalance({
  mode,
  seed,
  stats,
}: {
  mode: SimMode;
  seed: CitySeed;
  stats: CityStats;
}) {
  const live = useHarbor((s) => s.liveSnapshot);
  const rows = classifyWorkshopGoods({
    snapshot: live,
    stats,
    mode,
    chapterId: seenChapterId(seed),
  });
  const pulseHint = live?.pulseHint;
  if (rows.length === 0) return null;
  const anySaturado = rows.some(
    (row) => workshopGoodPaint(row.status, pulseHint) === "saturado",
  );

  return (
    <article className="stamp-paper p-5 sm:p-7" data-taller-seen-goods="">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Cadena y almacén
      </p>
      <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight">Bienes vistos</h2>
      <ul className="mt-5 flex flex-col gap-3">
        {rows.map((row) => {
          const paint = workshopGoodPaint(row.status, pulseHint);
          const telName = live?.telemetry?.goods?.find((item) => item.id === row.goodId)?.name;
          const name = GOOD_NAME_ES[row.goodId as GoodId] ?? telName ?? row.goodId;
          const red = paint === "saturado";
          return (
            <li
              key={row.goodId}
              data-taller-seen-good={row.goodId}
              data-taller-seen-status={row.status}
              data-taller-seen-paint={paint}
              className="flex min-h-11 items-center gap-3 text-lg"
            >
              <Stamp name={goodStamp(row.goodId as GoodId)} title={name} className="size-6" />
              <span className="min-w-0 flex-1">{name}</span>
              <StatusSeal status={row.status} paint={paint} />
              <span className={red ? "text-destructive" : undefined}>{STATUS_LABEL[row.status]}</span>
            </li>
          );
        })}
      </ul>
      {anySaturado ? (
        <p data-taller-saturado-detail="" className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {TALLER_SATURADO_DETAIL}
        </p>
      ) : null}
    </article>
  );
}

function StatusSeal({ status, paint }: { status: WorkshopGoodStatus; paint: WorkshopGoodPaint }) {
  const alcanza = status === "alcanza";
  const tone = paint === "saturado" ? "saturado" : "ink";
  return (
    <InkSeal
      kind={alcanza ? "check" : "hourglass"}
      tone={tone}
      className="size-9"
      title={STATUS_LABEL[status]}
    />
  );
}
