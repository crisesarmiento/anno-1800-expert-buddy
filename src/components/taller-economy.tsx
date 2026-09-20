import { useEffect, useState } from "react";
import { HarborCard } from "@/components/harbor-card";
import { Button } from "@/components/ui/button";
import {
  appliedChangeStore,
  campaignHistoryStore,
  type AppliedChange,
  type HistorySample,
} from "@/lib/history";
import { useHarbor } from "@/lib/store";
import {
  observedAfterChange,
  samplesOnBranch,
  treasuryHealth,
} from "@/lib/treasury-health";
import { useT } from "@/lib/use-t";

function formatCash(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

export function TallerEconomyCard() {
  const snapshot = useHarbor((state) => state.liveSnapshot);
  const campaignId = useHarbor((state) => state.historyCampaignId);
  const locale = useHarbor((state) => state.locale);
  const t = useT();
  const [samples, setSamples] = useState<HistorySample[]>([]);
  const [marks, setMarks] = useState<AppliedChange[]>([]);

  useEffect(() => {
    if (!campaignId) {
      setSamples([]);
      setMarks([]);
      return;
    }
    let cancelled = false;
    void Promise.all([campaignHistoryStore().list(campaignId), appliedChangeStore().list(campaignId)])
      .then(([rows, changes]) => {
        if (cancelled) return;
        setSamples(rows);
        setMarks(changes);
      })
      .catch(() => {
        if (!cancelled) {
          setSamples([]);
          setMarks([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, snapshot]);

  const branch = samplesOnBranch(samples);
  const verdict = treasuryHealth(branch);
  const liveCash = snapshot?.economy?.treasury;
  const latest = branch.at(-1);
  const mark = marks.filter((row) => row.branchId === (latest?.branchId ?? "main")).at(-1);
  const after = mark ? observedAfterChange(branch, mark.sampleId) : null;

  return (
    <div id="economy" data-taller-economy="">
      <HarborCard kicker={t.economy.kicker} title={t.economy.title} hint={t.economy.hint}>
        {typeof liveCash === "number" ? (
          <p className="font-display text-2xl tabular-nums">{formatCash(liveCash, locale)}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t.economy.empty}</p>
        )}
        <p className="text-sm text-muted-foreground">{t.economy.incomplete}</p>
        {verdict.kind === "isolated" ? (
          <p className="text-sm">{t.economy.isolated}</p>
        ) : null}
        {verdict.kind === "recurrent" ? (
          <p className="text-sm">{t.economy.recurrent}</p>
        ) : null}
        {branch.filter((row) => typeof row.summary.treasury === "number").length > 1 ? (
          <ol className="flex flex-col gap-1 text-sm tabular-nums">
            {branch
              .filter((row) => typeof row.summary.treasury === "number")
              .slice(-6)
              .map((row) => (
                <li key={row.id}>
                  {formatCash(row.summary.treasury as number, locale)}
                </li>
              ))}
          </ol>
        ) : null}
        {campaignId && latest ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => {
              void appliedChangeStore()
                .record({
                  campaignId,
                  branchId: latest.branchId,
                  sampleId: latest.id,
                })
                .then((change) => setMarks((rows) => [...rows, change]));
            }}
          >
            {t.economy.markChange}
          </Button>
        ) : null}
        {after?.kind === "up" ? <p className="text-sm">{t.economy.afterUp}</p> : null}
        {after?.kind === "down" ? <p className="text-sm">{t.economy.afterDown}</p> : null}
        {mark && after?.kind === "unknown" ? (
          <p className="text-sm text-muted-foreground">{t.economy.afterUnknown}</p>
        ) : null}
      </HarborCard>
    </div>
  );
}
