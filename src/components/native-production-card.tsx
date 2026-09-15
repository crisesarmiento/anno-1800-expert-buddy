import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, CheckCircle2, Factory, PauseCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHarbor } from "@/lib/store";
import { analyzeNativeProduction, nativeProductionEvidence } from "@/lib/native-production";

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

export function NativeProductionCard() {
  const snapshot = useHarbor((state) => state.liveSnapshot);
  const locale = useHarbor((state) => state.locale);
  const native = snapshot?.connection?.native;
  const evidence = nativeProductionEvidence(snapshot);
  const rows = analyzeNativeProduction(snapshot);

  if (!native) {
    return (
      <article className="stamp-paper p-5 sm:p-7" data-native-production="off">
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

  const islandName = native.islandName ?? rows[0]?.islandName ?? "isla seleccionada";
  const needsProduction = evidence.productionRows === 0;
  const needsFinance = evidence.productionRows > 0 && evidence.withFactoryCount === 0;

  return (
    <article className="stamp-paper p-5 sm:p-7" data-native-production="observed">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Estadísticas de Anno · OCR
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight">
            Qué producir menos o más
          </h2>
        </div>
        <Badge variant="outline">
          <Activity className="size-3.5" aria-hidden="true" />
          {islandName} · {timeLabel(native.observedAt, locale)}
        </Badge>
      </div>

      {needsProduction ? (
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
          {rows.slice(0, 8).map((row) => (
            <li
              key={row.guid}
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
              </div>
              <p className="mt-2 text-sm leading-relaxed">
                {row.status === "falta"
                  ? `Falta capacidad: apuntá a ${row.recommendedCount} edificios.`
                  : row.status === "sobra"
                    ? `Podés pausar ${row.pauseCount} y revisar si el almacén sigue estable.`
                    : "Está ajustada a la demanda leída; no construyas otra."}
              </p>
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                Capacidad {row.capacityTMin.toFixed(1)} t/min · demanda {row.requiredTMin.toFixed(1)}
                t/min
              </p>
            </li>
          ))}
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
