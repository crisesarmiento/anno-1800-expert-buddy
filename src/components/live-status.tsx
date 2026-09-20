import { Link } from "@tanstack/react-router";
import { Cloud, Database, Route, ScanLine, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fill } from "@/lib/i18n";
import { coverageRowFor } from "@/lib/live/coverage";
import { useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";

function relativeTime(iso: string | undefined, locale: string) {
  if (!iso) return null;
  const date = Date.parse(iso);
  if (!Number.isFinite(date)) return null;
  const minutes = Math.round((date - Date.now()) / 60_000);
  if (Math.abs(minutes) < 1) return locale === "es" ? "ahora" : "now";
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(minutes, "minute");
}

const NATIVE_VIEW_LABEL = {
  production: "producción",
  finance: "finanzas",
  population: "población",
  unknown: "pantalla detectada",
} as const;

export function LiveStatus() {
  const snapshot = useHarbor((state) => state.liveSnapshot);
  const liveEnabled = useHarbor((state) => state.liveEnabled);
  const fileName = useHarbor((state) => state.liveFileName);
  const locale = useHarbor((state) => state.locale);
  const t = useT();

  if (!snapshot) {
    return (
      <div className="rounded-xl bg-card p-4 shadow-border sm:p-5" data-live-status="disconnected">
        <div className="flex items-start gap-3">
          <span className="stamp-seal grid size-11 shrink-0 place-items-center text-mist">
            <Database className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-medium">Sin partida conectada</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Conectá el diario para ver qué save se leyó y qué datos son reales.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const connection = snapshot.connection;
  const routeCount = connection?.routeCount ?? snapshot.telemetry?.routes?.length ?? 0;
  const buildingKinds = connection?.buildingKinds ?? snapshot.telemetry?.buildings?.length ?? 0;
  const goodsKinds = connection?.goodsKinds ?? snapshot.telemetry?.goods?.length ?? 0;
  const saved = relativeTime(snapshot.savedAt, locale);
  const isCloud = connection?.mode === "ubisoft-cloud";
  const native = connection?.native;

  return (
    <div
      className="rounded-xl bg-card p-4 shadow-border sm:p-5"
      data-live-status={liveEnabled ? "connected" : "paused"}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="stamp-seal grid size-11 shrink-0 place-items-center text-ink">
            {isCloud ? (
              <Cloud className="size-5" aria-hidden="true" />
            ) : (
              <Database className="size-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-medium">
                {liveEnabled ? "Partida leída" : "Lectura pausada"}
              </p>
              <Badge variant={liveEnabled ? "ok" : "muted"}>
                {isCloud ? "Ubisoft Cloud" : "Último guardado"}
              </Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {snapshot.sessionName ?? connection?.fileName ?? fileName ?? "harbor-live.json"}
              {saved ? ` · guardado ${saved}` : ""}
            </p>
          </div>
        </div>
        {routeCount > 0 ? (
          <Link
            to="/rutas"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium text-primary"
          >
            <Route className="size-4" aria-hidden="true" />
            Revisar {routeCount} rutas
          </Link>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs tabular-nums">
        <Badge variant="outline">{buildingKinds} tipos de edificio</Badge>
        <Badge variant="outline">{goodsKinds} bienes</Badge>
        <Badge variant="outline">{routeCount} rutas</Badge>
        <Badge variant="outline">
          <TimerReset className="size-3.5" aria-hidden="true" />
          lectura {relativeTime(snapshot.updatedAt, locale) ?? "sin hora"}
        </Badge>
        {native ? (
          <Badge variant="outline">
            <ScanLine className="size-3.5" aria-hidden="true" />
            OCR observado · {NATIVE_VIEW_LABEL[native.view]} ·{" "}
            {relativeTime(native.observedAt, locale) ?? "sin hora"}
          </Badge>
        ) : null}
      </div>
      <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed" data-live-coverage="1">
        <p className="font-medium text-foreground">{t.live.coverageKicker}</p>
        <p className="mt-1 text-muted-foreground">
          {fill(t.live.readerLabel, snapshot.reader?.version ?? "—")}
          {(() => {
            const islands = coverageRowFor(snapshot.coverage, "islandSnapshots");
            const stock = coverageRowFor(snapshot.coverage, "islandStock");
            const named = coverageRowFor(snapshot.coverage, "islandNames");
            const bits: string[] = [];
            if (islands?.status === "present" && islands.count)
              bits.push(fill(t.live.coverageIslands, islands.count));
            if (stock?.status === "present" && stock.count)
              bits.push(fill(t.live.coverageStock, stock.count));
            if (named?.status === "present" && named.count)
              bits.push(fill(t.live.coverageNamed, named.count));
            else if (named?.status === "absent") bits.push(t.live.coverageNeutral);
            return bits.length ? ` · ${bits.join(" · ")}` : "";
          })()}
        </p>
        <p className="mt-1 text-muted-foreground">{t.live.coverageMissing}</p>
        <p className="mt-1 text-muted-foreground">{t.live.coverageMod}</p>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {native
          ? "Edificios y rutas salen del save; producción sale de la pantalla Estadísticas por OCR. No lee memoria."
          : "Leído del archivo: edificios y rutas. Producción en tiempo real todavía no está conectada."}
      </p>
    </div>
  );
}
