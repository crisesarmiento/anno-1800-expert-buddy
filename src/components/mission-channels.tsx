import { matchLiveSnapshot } from "@/lib/live";
import { fill } from "@/lib/i18n";
import {
  formatFrozenTimer,
  readMissionProgress,
  suggestedReserves,
  type SaveReadQuestView,
} from "@/lib/missions";
import { missionsById } from "@/lib/data";
import { useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

function stateLabel(
  t: ReturnType<typeof useT>["missions"],
  state: SaveReadQuestView["quest"]["state"],
) {
  if (state === "done") return t.done;
  if (state === "failed") return t.failed;
  if (state === "expired") return t.expired;
  if (state === "ready") return t.ready;
  return t.active;
}

export function MissionChannels() {
  const snapshot = useHarbor((s) => s.liveSnapshot);
  const spoilers = useHarbor((s) => s.spoilers);
  const t = useT();
  if (!snapshot) return null;

  const match = matchLiveSnapshot(snapshot);
  const view = readMissionProgress(snapshot, match);
  const reserves = suggestedReserves(snapshot);
  const suggestionTitle = view.suggestion?.missionId
    ? (missionsById[view.suggestion.missionId]?.title ?? view.suggestion.missionId)
    : null;

  const saveRows = spoilers
    ? view.saveRead
    : view.saveRead.filter((row) => row.identity.known || Boolean(row.identity.instanceId));

  return (
    <article
      data-mission-channels=""
      data-spoilers={spoilers ? "on" : "off"}
      className="rounded-xl bg-card p-4 shadow-border sm:p-5"
    >
      <p className="text-xs font-medium tracking-wide text-mist uppercase">{t.missions.kicker}</p>
      <h2 className="mt-1 font-display text-xl font-medium tracking-tight">{t.missions.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.missions.hint}</p>

      {suggestionTitle ? (
        <section data-mission-channel="suggestion" className="mt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t.missions.suggestion}
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            {fill(t.missions.suggestionLine, suggestionTitle)}
          </p>
        </section>
      ) : null}

      <section data-mission-channel="save-read" className="mt-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t.missions.saveRead}
        </p>
        {saveRows.length === 0 ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.missions.saveEmpty}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {saveRows.map((row) => (
              <li
                key={row.identity.key}
                data-quest-identity={row.identity.key}
                data-quest-known={row.identity.known ? "true" : "false"}
                className="text-sm leading-relaxed"
              >
                <span className="font-medium">{row.identity.title}</span>
                <span className="text-muted-foreground"> · {stateLabel(t.missions, row.quest.state)}</span>
                {row.identity.known ? null : (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t.missions.unknown}
                    {row.identity.instanceId
                      ? ` · ${fill(t.missions.instance, row.identity.instanceId)}`
                      : null}
                    {row.identity.guid != null ? ` · ${fill(t.missions.guid, row.identity.guid)}` : null}
                  </span>
                )}
                {row.timerRemainingMs != null ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {fill(t.missions.timerFrozen, formatFrozenTimer(row.timerRemainingMs))}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.missions.absence}</p>
      </section>

      <section data-mission-channel="manual" className="mt-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t.missions.manual}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.missions.manualHint}</p>
        {view.manualFallback ? (
          <p className="mt-1 text-sm leading-relaxed">{t.missions.fallback}</p>
        ) : null}
      </section>

      {reserves.length > 0 ? (
        <section data-mission-reserves="" className="mt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t.missions.reserves}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.missions.reservesHint}</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {reserves.map((row) => (
              <li key={`${row.instanceId ?? row.missionTitle}:${row.goodId}`}>
                {row.goodName} · {row.amount}
                <span className="text-muted-foreground">
                  {" "}
                  ·{" "}
                  {row.stockRead == null
                    ? t.missions.stockUnknown
                    : fill(t.missions.stockRead, row.stockRead)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

export function MissionReservesCard({ className }: { className?: string }) {
  const snapshot = useHarbor((s) => s.liveSnapshot);
  const t = useT();
  const reserves = suggestedReserves(snapshot);
  if (reserves.length === 0) return null;
  return (
    <article
      data-mission-reserves-taller=""
      className={cn("rounded-xl bg-card p-4 shadow-border sm:p-5", className)}
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t.missions.reserves}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.missions.reservesHint}</p>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {reserves.map((row) => (
          <li key={`${row.instanceId ?? row.missionTitle}:${row.goodId}`} className="tabular-nums">
            {row.goodName} · {row.amount}
            <span className="text-muted-foreground">
              {" "}
              ·{" "}
              {row.stockRead == null
                ? t.missions.stockUnknown
                : fill(t.missions.stockRead, row.stockRead)}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
