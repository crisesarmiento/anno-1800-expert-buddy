import { useEffect, useState } from "react";
import { HarborCard } from "@/components/harbor-card";
import { Button } from "@/components/ui/button";
import { campaignHistoryStore, islandStockDelta, type HistorySample } from "@/lib/history";
import { fill } from "@/lib/i18n";
import { playerIslandsFromSave } from "@/lib/live/evidence.ts";
import { islandKey } from "@/lib/live/island-key.ts";
import { useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";

function formatWhen(iso: string | undefined, locale: string) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(ms);
}

export function CampaignPicker() {
  const pending = useHarbor((state) => state.pendingCampaign);
  const chooseCampaign = useHarbor((state) => state.chooseCampaign);
  const t = useT();
  if (!pending) return null;
  return (
    <div data-campaign-picker="">
      <HarborCard
        kicker={t.islandsHistory.kicker}
        title={t.islandsHistory.pickCampaign}
        hint={t.islandsHistory.pickCampaignHint}
      >
        <div className="flex flex-col gap-2">
          {pending.candidates.map((row) => (
            <Button
              key={row.id}
              type="button"
              variant="outline"
              className="min-h-11 justify-start"
              onClick={() => chooseCampaign(row.id)}
            >
              {row.label ?? row.id}
            </Button>
          ))}
          <Button
            type="button"
            className="min-h-11"
            onClick={() => chooseCampaign(`campaign-${Date.now().toString(16)}`)}
          >
            {t.islandsHistory.newCampaign}
          </Button>
        </div>
      </HarborCard>
    </div>
  );
}

export function IslandHistoryCard() {
  const snapshot = useHarbor((state) => state.liveSnapshot);
  const campaignId = useHarbor((state) => state.historyCampaignId);
  const historyError = useHarbor((state) => state.historyError);
  const locale = useHarbor((state) => state.locale);
  const t = useT();
  const islands = playerIslandsFromSave(snapshot);
  const [sampleCount, setSampleCount] = useState(0);
  const [oldest, setOldest] = useState<string | null>(null);
  const [samples, setSamples] = useState<HistorySample[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [readError, setReadError] = useState(false);

  useEffect(() => {
    if (!campaignId) {
      setSampleCount(0);
      setOldest(null);
      setSamples([]);
      return;
    }
    let cancelled = false;
    void campaignHistoryStore()
      .list(campaignId)
      .then((rows) => {
        if (cancelled) return;
        setSampleCount(rows.length);
        setSamples(rows);
        setReadError(false);
        setOldest(rows[0]?.savedAt ?? rows[0]?.recordedAt ?? null);
      })
      .catch(() => {
        if (!cancelled) setReadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, snapshot]);

  const selected = samples.find((row) => row.id === selectedId) ?? samples.at(-1);
  const previous = selected
    ? samples
        .filter((row) => row.branchId === selected.branchId && row.recordedAt < selected.recordedAt)
        .at(-1)
    : undefined;
  const shownIslands = selected?.summary.islands ?? islands;
  const observed = formatWhen(selected?.savedAt ?? snapshot?.savedAt, locale);

  return (
    <div data-island-history="">
      <HarborCard
        kicker={t.islandsHistory.kicker}
        title={t.islandsHistory.title}
        hint={t.islandsHistory.hint}
      >
        {historyError || readError ? (
          <p role="alert" className="text-sm text-destructive">
            {historyError ??
              "No se pudo leer el historial guardado. Reintentá al actualizar la partida."}
          </p>
        ) : null}
        {campaignId ? (
          <Button
            variant="outline"
            className="min-h-11"
            onClick={async () => {
              if (!snapshot) return;
              try {
                const candidates = await campaignHistoryStore().campaigns();
                useHarbor.setState({
                  manualHistoryCampaignId: null,
                  historyCampaignId: null,
                  pendingCampaign: { snapshot, candidates },
                });
              } catch {
                setReadError(true);
              }
            }}
          >
            Cambiar campaña del historial
          </Button>
        ) : null}
        {samples.length > 0 ? (
          <label className="flex flex-col gap-2 text-sm">
            Guardado a consultar
            <select
              className="min-h-11 w-full rounded-md border border-input bg-background p-2 text-foreground"
              value={selected?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {[...samples].reverse().map((row) => (
                <option key={row.id} value={row.id}>
                  {formatWhen(row.savedAt ?? row.recordedAt, locale)} ·{" "}
                  {row.branchId === "main" ? "Inicio" : "Otra secuencia"}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {selected && selected.simTime == null ? (
          <p className="text-xs text-muted-foreground">
            Sin reloj de juego verificado: conservamos cada lectura, sin calcular tasas ni
            continuidad entre guardados.
          </p>
        ) : null}
        {!shownIslands.length ? (
          <p className="text-sm text-muted-foreground">{t.islandsHistory.empty}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {shownIslands.map((island) => (
              <li
                key={islandKey(island.regionId, island.areaId)}
                data-island-history-row={islandKey(island.regionId, island.areaId)}
                className="rounded-lg border border-border bg-card/60 p-3"
              >
                <p className="font-display font-semibold">{island.name}</p>
                {observed ? (
                  <p className="text-xs text-muted-foreground">
                    {fill(t.islandsHistory.observed, observed)}
                  </p>
                ) : null}
                {island.stock?.length ? (
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {island.stock.map((good) => (
                      <li key={good.id} className="flex justify-between gap-3">
                        <span>{good.name}</span>
                        <span className="tabular-nums">{good.amount}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Stock no disponible para esta isla en esta lectura.
                  </p>
                )}
                {previous && selected
                  ? (() => {
                      const delta = islandStockDelta(
                        previous,
                        selected,
                        island.regionId,
                        island.areaId,
                      );
                      return delta.ok && delta.changes.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Cambio observado:{" "}
                          {delta.changes
                            .map((good) => `${good.name} ${good.delta > 0 ? "+" : ""}${good.delta}`)
                            .join(" · ")}
                        </p>
                      ) : null;
                    })()
                  : null}
              </li>
            ))}
          </ul>
        )}
        {sampleCount > 0 && oldest ? (
          <p className="text-xs text-muted-foreground" data-island-history-stale="">
            {t.islandsHistory.samples}: {sampleCount} ·{" "}
            {fill(t.islandsHistory.stale, formatWhen(oldest, locale) ?? oldest)}
          </p>
        ) : null}
      </HarborCard>
    </div>
  );
}
