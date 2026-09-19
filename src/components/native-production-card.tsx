import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Factory,
  History,
  PauseCircle,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHarbor } from "@/lib/store";
import { analyzeNativeProduction, nativeProductionEvidence } from "@/lib/native-production";
import { nativeCardState } from "@/lib/native-probe-copy";
import { isOcrSampleStale } from "@/lib/native-freshness";
import { useT } from "@/lib/use-t";
import type { UiDict } from "@/lib/i18n";

function timeLabel(iso: string, locale: string) {
  const date = Date.parse(iso);
  if (!Number.isFinite(date)) return "sin hora";
  const seconds = Math.round((date - Date.now()) / 1000);
  if (Math.abs(seconds) < 10) return "ahora";
  if (Math.abs(seconds) < 60) return `${Math.abs(seconds)} s`;
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    Math.round(seconds / 60),
    "minute",
  );
}

function reasonLabel(t: UiDict, reason: string | undefined) {
  if (reason === "timeout") return t.nativeProbe.reasonTimeout;
  if (reason === "connection_refused") return t.nativeProbe.reasonConnectionRefused;
  if (reason === "bad_payload") return t.nativeProbe.reasonBadPayload;
  return undefined;
}

export function NativeProductionCard() {
  const snapshot = useHarbor((state) => state.liveSnapshot);
  const locale = useHarbor((state) => state.locale);
  const t = useT();
  const connection = snapshot?.connection;
  const native = connection?.native;
  const nativeProbe = connection?.nativeProbe;
  const evidence = nativeProductionEvidence(snapshot);
  const rows = analyzeNativeProduction(snapshot);
  const cardState = nativeCardState(connection);
  const now = Date.now();

  if (cardState === "never-tried") {
    return (
      <article id="native-production" className="stamp-paper p-5 sm:p-7" data-native-production="off">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Telemetría opcional
        </p>
        <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight">
          Producción real, todavía no
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          El save confirma edificios y rutas, pero no toneladas por minuto. El extractor OCR puede
          leer Producción y Finanzas sin inyectar código en Anno.
        </p>
        <Link
          to="/instalar"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary"
        >
          Activar lectura OCR
        </Link>
      </article>
    );
  }

  if (cardState === "unreachable") {
    return (
      <article
        id="native-production"
        className="stamp-paper p-5 sm:p-7"
        data-native-production="unreachable"
      >
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Telemetría opcional
        </p>
        <h2 className="font-display mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <WifiOff className="size-5 text-muted-foreground" aria-hidden="true" />
          {t.nativeProbe.unreachable}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Sigo leyendo tus guardados igual. Si abriste el extractor recién ahora, puede tardar unos
          segundos.
          {reasonLabel(t, nativeProbe?.reason) ? ` (${reasonLabel(t, nativeProbe?.reason)})` : ""}
        </p>
        <Link
          to="/instalar"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary"
        >
          Ver cómo instalarlo
        </Link>
      </article>
    );
  }

  const islandName = native?.islandName ?? rows[0]?.islandName ?? "isla seleccionada";
  const needsProduction = evidence.productionRows === 0;
  const needsFinance = evidence.productionRows > 0 && evidence.withFactoryCount === 0;
  const historical = cardState === "historical";

  return (
    <article
      id="native-production"
      className="stamp-paper p-5 sm:p-7"
      data-native-production={historical ? "historical" : "observed"}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Estadísticas de Anno · OCR
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight">
            Qué producir menos o más
          </h2>
        </div>
        {native ? (
          <Badge variant={historical ? "outline" : "outline"}>
            {historical ? (
              <History className="size-3.5" aria-hidden="true" />
            ) : (
              <Activity className="size-3.5" aria-hidden="true" />
            )}
            {islandName} · {timeLabel(native.observedAt, locale)}
          </Badge>
        ) : null}
      </div>

      {historical ? (
        <EvidencePrompt icon={<History className="size-5" />}>
          {t.nativeProbe.historical}
          {reasonLabel(t, nativeProbe?.reason) ? ` (${reasonLabel(t, nativeProbe?.reason)})` : ""}
        </EvidencePrompt>
      ) : cardState === "guidance-population" ? (
        <EvidencePrompt icon={<Factory className="size-5" />}>
          {t.nativeProbe.populationGuidance}
        </EvidencePrompt>
      ) : cardState === "guidance-unknown" ? (
        <EvidencePrompt icon={<AlertTriangle className="size-5" />}>
          {t.nativeProbe.unknownGuidance}
        </EvidencePrompt>
      ) : needsProduction ? (
        <EvidencePrompt icon={<Factory className="size-5" />}>
          En Anno abrí Estadísticas → Producción y dejala visible unos segundos.
        </EvidencePrompt>
      ) : needsFinance ? (
        <EvidencePrompt icon={<AlertTriangle className="size-5" />}>
          Producción ya está leída. Abrí Estadísticas → Finanzas una vez para contar las fábricas de
          esta isla.
        </EvidencePrompt>
      ) : rows.length === 0 ? (
        <EvidencePrompt icon={<AlertTriangle className="size-5" />}>
          La lectura llegó, pero estas fábricas todavía no están en el catálogo seguro del Taller.
          No voy a adivinar sus ritmos.
        </EvidencePrompt>
      ) : (
        <ul className="mt-5 flex flex-col gap-3" aria-label="Balance de producción leído">
          {rows.slice(0, 8).map((row) => {
            const productivityStale = isOcrSampleStale({
              observedAt: row.observedAt,
              savedAt: snapshot?.savedAt,
              now,
            });
            const countObservedAt = row.buildingCountObservedAt ?? row.observedAt;
            const countStale = isOcrSampleStale({
              observedAt: countObservedAt,
              savedAt: snapshot?.savedAt,
              now,
            });
            return (
              <li
                key={row.guid}
                id={`production-${row.guid}`}
                data-native-production-row={row.status}
                className="rounded-lg bg-muted/60 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {row.status === "falta" ? (
                    <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
                  ) : row.status === "sobra" ? (
                    <PauseCircle className="size-4 text-ochre" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="size-4 text-ok" aria-hidden="true" />
                  )}
                  <span className="font-medium">{row.name}</span>
                  <Badge variant={row.status === "justo" ? "ok" : "outline"}>
                    {row.buildingCount} activas · {Math.round(row.productivity)}%
                  </Badge>
                  <Badge variant="outline" data-evidence="confirmed">
                    {t.nativeProbe.confirmed}
                  </Badge>
                  {countStale || productivityStale ? (
                    <Badge variant="outline" data-evidence="stale">
                      {t.nativeProbe.stale}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  <span className="mr-1 text-xs font-medium text-muted-foreground uppercase">
                    {t.nativeProbe.inferred}:
                  </span>
                  {row.status === "falta"
                    ? `Falta capacidad: apuntá a ${row.recommendedCount} edificios.`
                    : row.status === "sobra"
                      ? `Podés pausar ${row.pauseCount} y revisar si el almacén sigue estable.`
                      : "Está ajustada a la demanda leída; no construyas otra."}
                </p>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  Capacidad {row.capacityTMin.toFixed(1)} t/min · demanda{" "}
                  {row.requiredTMin.toFixed(1)} t/min
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Evidencia: captura de la pantalla Estadísticas, no lectura de memoria. Cambiá de isla y abrí
        Producción + Finanzas para refrescar esa isla.
      </p>
    </article>
  );
}

function EvidencePrompt({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="mt-5 flex items-start gap-3 rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">
      <span className="mt-0.5 shrink-0 text-ochre" aria-hidden="true">
        {icon}
      </span>
      <p>{children}</p>
    </div>
  );
}
