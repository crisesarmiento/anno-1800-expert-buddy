import { useEffect, useState } from "react";
import { HarborCard } from "@/components/harbor-card";
import { Button } from "@/components/ui/button";
import { campaignHistoryStore } from "@/lib/history";
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
      <HarborCard kicker={t.islandsHistory.kicker} title={t.islandsHistory.pickCampaign} hint={t.islandsHistory.pickCampaignHint}>
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
  const locale = useHarbor((state) => state.locale);
  const t = useT();
  const islands = playerIslandsFromSave(snapshot);
  const [sampleCount, setSampleCount] = useState(0);
  const [oldest, setOldest] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setSampleCount(0);
      setOldest(null);
      return;
    }
    let cancelled = false;
    void campaignHistoryStore()
      .list(campaignId)
      .then((rows) => {
        if (cancelled) return;
        setSampleCount(rows.length);
        setOldest(rows[0]?.savedAt ?? rows[0]?.recordedAt ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, snapshot?.savedAt, snapshot?.simTime]);

  const observed = formatWhen(snapshot?.savedAt, locale);

  return (
    <div data-island-history="">
      <HarborCard kicker={t.islandsHistory.kicker} title={t.islandsHistory.title} hint={t.islandsHistory.hint}>
        {!islands.length ? (
          <p className="text-sm text-muted-foreground">{t.islandsHistory.empty}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {islands.map((island) => (
              <li
                key={islandKey(island.regionId, island.areaId)}
                data-island-history-row={islandKey(island.regionId, island.areaId)}
                className="rounded-lg border border-border bg-card/60 p-3"
              >
                <p className="font-display font-semibold">{island.name}</p>
                {observed ? (
                  <p className="text-xs text-muted-foreground">{fill(t.islandsHistory.observed, observed)}</p>
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
                ) : null}
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
