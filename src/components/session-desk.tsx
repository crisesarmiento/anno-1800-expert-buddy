import { Link } from "@tanstack/react-router";
import { DiaryTitleChips } from "@/components/diary-chips";
import { useHomeSaturatedTip } from "@/components/home-saturated-tip";
import { IslandFocusChips } from "@/components/island-focus";
import { PowerUpSection } from "@/components/live-panel";
import { MissionChannels } from "@/components/mission-channels";
import { InkSeal } from "@/components/stamps";
import { pickCampaignTip } from "@/lib/campaign-tips";
import { constructionTipLine } from "@/lib/construction-tip";
import { ESTO_AHORA_IDLE } from "@/lib/diary-chips";
import { focusOptionsForSnapshot, resolveIslandFocusId, scopeEstoAhoraLine } from "@/lib/island-focus";
import { deskCalmUmbral, sessionEstoAhora } from "@/lib/session-desk";
import { resolveMission } from "@/lib/data";
import { commitDeskMutation } from "@/lib/desk-offline";
import { CHECK_HIGHLIGHT_ID } from "@/lib/radio-down";
import { getDeskHost } from "@/lib/session-boot";
import type { SessionCheckItem } from "@/lib/session-store";
import { useHarbor } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SessionDesk() {
  const missionId = useHarbor((s) => s.missionId);
  const setMissionId = useHarbor((s) => s.setMissionId);
  const pulse = useHarbor((s) => s.pulse);
  const calm = useHarbor((s) => s.calm);
  const checkItems = useHarbor((s) => s.checkItems);
  const snapshot = useHarbor((s) => s.liveSnapshot);
  const stamps = useHarbor((s) => s.stamps);
  const completed = useHarbor((s) => s.completed);
  const activeIslandId = useHarbor((s) => s.activeIslandId);
  const setActiveIslandId = useHarbor((s) => s.setActiveIslandId);
  const islandOptions = focusOptionsForSnapshot(snapshot);
  const islandId = resolveIslandFocusId(activeIslandId, islandOptions);
  const resolved = resolveMission(missionId);
  const campaignTip = pickCampaignTip({ snapshot, stamps, missionId, completed });
  const urgentCampaignTip =
    campaignTip?.kind === "esto-ahora" &&
    (campaignTip.family === "coins" || campaignTip.family === "brake")
      ? campaignTip
      : null;
  // Esto, ahora priority: 1) urgent campaign tip (coins/brake) 2) saturation
  // tip (already-seen overflow/red) 3) construction tip 4) other campaign
  // tip / mission checklist / idle.
  const homeSaturatedTip = useHomeSaturatedTip(snapshot);
  const saturatedTip = urgentCampaignTip ? null : homeSaturatedTip;
  const constructionTip = urgentCampaignTip || saturatedTip ? null : constructionTipLine(islandId);

  if (!resolved) return null;

  const { mission } = resolved;
  const items: SessionCheckItem[] =
    checkItems.length > 0 ? checkItems : [{ text: sessionEstoAhora(mission.do), done: false }];
  const now = items.find((item) => !item.done) ?? items[0];
  const nowIndex = Math.max(0, items.indexOf(now));
  const { saturado, rojo, umbral, alarm, taller } = deskCalmUmbral(pulse, calm);
  const activeLine =
    urgentCampaignTip?.line ??
    saturatedTip ??
    constructionTip ??
    campaignTip?.line ??
    now?.text ??
    ESTO_AHORA_IDLE;
  const scopedLine = scopeEstoAhoraLine(islandId, activeLine, islandOptions);

  function commit(kind: Parameters<typeof commitDeskMutation>[1]) {
    commitDeskMutation(getDeskHost(), kind);
  }

  return (
    <div className="stagger-in mx-auto flex max-w-lg flex-col gap-6">
      <article
        data-session-desk="one-card"
        data-hero="esto-ahora"
        data-umbral={umbral}
        aria-label="Esto, ahora"
        className={cn(
          "hero-orla rounded-xl p-5 sm:p-7",
          alarm
            ? "bg-destructive/10 text-foreground ring-1 ring-inset ring-destructive/35"
            : "bg-card text-card-foreground",
        )}
      >
        <p
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide uppercase"
        >
          <ThresholdStamp
            label="Saturado"
            kind="hourglass"
            tone="saturado"
            on={saturado}
            onClick={() =>
              commit({ kind: "setCalm", value: calm === "overwhelmed" ? "session" : "overwhelmed" })
            }
          />
          <ThresholdStamp
            label="Rojo"
            kind="coin-down"
            tone="rojo"
            on={rojo}
            onClick={() =>
              commit({ kind: "setPulse", patch: { coins: pulse.coins === "down" ? "up" : "down" } })
            }
          />
        </p>
        <div className="mt-4" data-home-primary="island-focus">
          <IslandFocusChips activeId={islandId} onPick={setActiveIslandId} />
        </div>
        <h1 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          Esto, ahora
        </h1>
        {taller ? (
          <Link
            data-taller-link=""
            to="/taller"
            className={cn(
              "mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4",
              alarm ? "text-destructive-foreground" : "text-foreground",
            )}
          >
            Ver taller
          </Link>
        ) : null}
        <p
          data-esto-ahora-item=""
          data-island-focus={islandId}
          data-campaign-tip-family={saturatedTip ? "brake" : (campaignTip?.family ?? "")}
          data-campaign-tip-kind={saturatedTip ? "esto-ahora" : (campaignTip?.kind ?? "idle")}
          data-construction-tip={constructionTip ? "true" : "false"}
          className="mt-6 text-lg leading-relaxed"
        >
          {constructionTip ? (
            <span data-construction-tip-line="">{scopedLine}</span>
          ) : saturatedTip ? (
            <span data-home-saturated-tip="">{scopedLine}</span>
          ) : campaignTip?.kind === "chip" ? (
            <span data-campaign-tip-chip="">{scopedLine}</span>
          ) : (
            <button
              type="button"
              id={CHECK_HIGHLIGHT_ID(nowIndex)}
              onClick={() => commit({ kind: "toggleCheck", index: nowIndex })}
              className="text-left"
            >
              {scopedLine}
            </button>
          )}
        </p>
      </article>
      <div data-home-primary="chips">
        <DiaryTitleChips activeId={missionId} onPick={setMissionId} />
      </div>
      <PowerUpSection />
      <MissionChannels />
    </div>
  );
}

function ThresholdStamp({
  label,
  kind,
  tone,
  on,
  onClick,
}: {
  label: string;
  kind: "hourglass" | "coin-down";
  tone: "saturado" | "rojo";
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-on={on ? "true" : "false"}
      data-threshold-stamp={label.toLowerCase()}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full px-2",
        on ? "opacity-100" : "opacity-40",
      )}
    >
      <InkSeal kind={kind} tone={tone} className="size-9" title={label} />
      <span>{label}</span>
    </button>
  );
}
