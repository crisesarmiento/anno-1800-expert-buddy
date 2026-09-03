import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Anchor,
  Check,
  ChevronRight,
  Coins,
  Compass,
  Handshake,
  Pause,
  RotateCcw,
  Ship,
} from "lucide-react";
import { BlockGrid, HarborRoute } from "@/components/block-grid";
import { BuddyChat } from "@/components/buddy-chat";
import { ChainBoard } from "@/components/chain-board";
import { HarborCard, IconWell } from "@/components/harbor-card";
import { LanguageSelect } from "@/components/language-select";
import { DiaryTitleChips } from "@/components/diary-chips";
import { SandboxModeChip } from "@/components/sandbox-mode";
import { PowerUpSection } from "@/components/live-panel";
import { MissionFinder } from "@/components/mission-finder";
import { OverbuildBrakeNotice } from "@/components/overbuild-brake-notice";
import { SessionDeskSurface } from "@/components/session-desk-surface";
import { Stamp, buildingStamp } from "@/components/stamps";
import { ESTO_AHORA_IDLE } from "@/lib/diary-chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  brokeSteps,
  chapters,
  firstPlayableMissionId,
  getMissionIndex,
  layoutsById,
  missionsById,
  resolveMission,
} from "@/lib/data";
import { nextMove, type CoinsPulse, type HousesPulse, type LookingPulse } from "@/lib/play";
import { isLiveLocked, useHarbor } from "@/lib/store";
import { fill, LOCALE_META } from "@/lib/i18n";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

export function HarborApp() {
  const missionId = useHarbor((s) => s.missionId);
  const calm = useHarbor((s) => s.calm);
  const locale = useHarbor((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = LOCALE_META[locale].html;
  }, [locale]);

  return (
    <div className="min-h-dvh bg-background" data-visual="diario">
      <OverbuildBrakeNotice />
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7">
            {!missionId ? (
              <Welcome />
            ) : calm === "overwhelmed" ? (
              <OverwhelmedPanel />
            ) : calm === "broke" ? (
              <BrokePanel />
            ) : (
              <SessionDeskSurface />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  const spoilers = useHarbor((s) => s.spoilers);
  const setSpoilers = useHarbor((s) => s.setSpoilers);
  const calm = useHarbor((s) => s.calm);
  const setCalm = useHarbor((s) => s.setCalm);
  const missionId = useHarbor((s) => s.missionId);
  const t = useT();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <IconWell>
          <Anchor className="size-5" strokeWidth={1.75} />
        </IconWell>
        <div className="min-w-0">
          <p className="font-display text-lg leading-none font-semibold tracking-tight">
            Anno 1800 Buddy
          </p>
          <p className="mt-1 truncate text-xs text-mist">{t.tagline}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <LanguageSelect />
        <Link
          to="/tablero"
          className="inline-flex h-11 items-center rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {t.board}
        </Link>
        <Link
          to="/sandbox"
          className="inline-flex h-11 items-center rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Sandbox
        </Link>
        <Link
          to="/instalar"
          className="inline-flex h-11 items-center rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {t.installMod}
        </Link>
        <button
          type="button"
          onClick={() => setSpoilers(!spoilers)}
          className={cn(
            "inline-flex h-11 items-center rounded-md px-3 text-xs font-medium",
            spoilers ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
          aria-pressed={spoilers}
        >
          {fill(t.spoilers, spoilers ? t.yes : t.no)}
        </button>
        {missionId ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className={cn(calm === "broke" && "bg-primary text-primary-foreground")}
              onClick={() => setCalm(calm === "broke" ? "session" : "broke")}
            >
              <Coins className="size-3.5" />
              <span className="hidden sm:inline">
                {calm === "broke" ? t.backDesk : t.coinsRed}
              </span>
              <span className="sm:hidden">{calm === "broke" ? t.deskShort : t.coinsShort}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(calm === "overwhelmed" && "bg-primary text-primary-foreground")}
              onClick={() => setCalm(calm === "overwhelmed" ? "session" : "overwhelmed")}
            >
              <Pause className="size-3.5" />
              <span className="hidden sm:inline">
                {calm === "overwhelmed" ? t.backDesk : t.overwhelmed}
              </span>
              <span className="sm:hidden">{calm === "overwhelmed" ? t.deskShort : t.pause}</span>
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}

function CampaignRail() {
  const missionId = useHarbor((s) => s.missionId);
  const setMissionId = useHarbor((s) => s.setMissionId);
  const completed = useHarbor((s) => s.completed);
  const locked = useHarbor((s) => isLiveLocked(s));
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);

  const currentChapterId = missionId ? missionsById[missionId]?.chapterId : null;
  const expanded = openId ?? currentChapterId ?? "ch1";

  return (
    <aside className="border-b border-border bg-card lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between px-4 py-3 lg:px-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t.where}
        </p>
        <Ship className="size-4 text-mist" />
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
        {chapters.map((chapter) => (
          <button
            key={chapter.id}
            type="button"
            onClick={() => {
              if (locked) return;
              setOpenId(chapter.id);
              const first = chapter.missionIds[0];
              if (first) setMissionId(first);
            }}
            className={cn(
              "h-11 shrink-0 rounded-md px-3 text-sm",
              currentChapterId === chapter.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground",
            )}
          >
            {chapter.roman === "0" ? t.prologue : chapter.roman}
          </button>
        ))}
      </div>
      <nav className="hidden max-h-[calc(100dvh-3.25rem)] overflow-y-auto px-3 pb-6 lg:block">
        {chapters.map((chapter) => {
          const isOpen = expanded === chapter.id;
          return (
            <div key={chapter.id} className="mb-1">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : chapter.id)}
                className="flex h-11 w-full items-center justify-between rounded-md px-2 text-left hover:bg-muted"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-[11px] tracking-wide text-mist uppercase">
                    {chapter.roman === "0" ? t.prologue : fill(t.chapter, chapter.roman)}
                  </span>
                  <span className="truncate text-sm font-medium">{chapter.title}</span>
                </span>
                <ChevronRight
                  className={cn(
                    "size-4 text-muted-foreground transition-transform duration-150",
                    isOpen && "rotate-90",
                  )}
                />
              </button>
              {isOpen ? (
                <ul className="mt-1 mb-2 flex flex-col gap-0.5 pl-2">
                  {chapter.missionIds.map((id) => {
                    const mission = missionsById[id];
                    if (!mission) return null;
                    const active = missionId === id;
                    const done = completed.includes(id);
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!locked) setMissionId(id);
                          }}
                          disabled={locked}
                          className={cn(
                            "flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm leading-snug",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-muted",
                            locked && !active && "opacity-70",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                              active
                                ? "bg-primary-foreground/20"
                                : done
                                  ? "bg-ok text-ok-foreground"
                                  : "ring-1 ring-border",
                            )}
                          >
                            {done ? <Check className="size-2.5" /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate">{mission.title}</span>
                            <span
                              className={cn(
                                "text-[11px]",
                                active ? "text-primary-foreground/70" : "text-muted-foreground",
                              )}
                            >
                              {t.kind[mission.kind]}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function Welcome() {
  const setMissionId = useHarbor((s) => s.setMissionId);
  const t = useT();

  return (
    <div data-welcome="" className="stagger-in mx-auto flex max-w-2xl flex-col gap-8">
      <article
        data-hero="esto-ahora"
        aria-label="Esto, ahora"
        className="hero-orla rounded-xl p-5 sm:p-7"
      >
        <p className="text-xs font-medium tracking-wide text-mist uppercase">{t.welcome.kicker}</p>
        <h1 className="mt-3 font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Esto, ahora
        </h1>
        <p data-esto-ahora-item="" className="mt-4 max-w-prose text-lg leading-relaxed">
          {ESTO_AHORA_IDLE}
        </p>
      </article>

      <div data-welcome-primary="chips">
        <DiaryTitleChips onPick={setMissionId} />
      </div>
      <SandboxModeChip />

      <MissionFinder />
      <PowerUpSection />
      <HarborFooter />
    </div>
  );
}

function WelcomeCard({
  title,
  copy,
  stamp,
  onClick,
  featured,
}: {
  title: string;
  copy: string;
  stamp: string;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-28 items-start gap-3 rounded-xl p-4 text-left transition-shadow duration-150",
        featured
          ? "bg-card text-foreground shadow-border-hover"
          : "bg-card text-foreground shadow-border hover:shadow-border-hover",
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-muted text-primary">
        <Stamp name={stamp} className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="font-display text-lg font-medium">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{copy}</span>
      </span>
    </button>
  );
}

function OverwhelmedPanel() {
  const missionId = useHarbor((s) => s.missionId);
  const setCalm = useHarbor((s) => s.setCalm);
  const resolved = resolveMission(missionId);
  const t = useT();

  if (!resolved) return null;
  const { mission, chapter } = resolved;

  return (
    <div className="stagger-in mx-auto flex max-w-xl flex-col gap-6 py-6">
      <p className="text-xs font-medium tracking-wide text-mist uppercase">
        {fill(t.calm.oneThing, chapter.title)}
      </p>
      <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
        {mission.overwhelmed}
      </h1>
      <p className="text-base leading-relaxed text-muted-foreground">{mission.why}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setCalm("session")}>{t.calm.backRest}</Button>
        <Button variant="secondary" onClick={() => setCalm("broke")}>
          {t.calm.coinsProblem}
        </Button>
      </div>
    </div>
  );
}

function BrokePanel() {
  const missionId = useHarbor((s) => s.missionId);
  const setCalm = useHarbor((s) => s.setCalm);
  const resolved = resolveMission(missionId);
  const pulse = resolved?.life?.money.pulse;
  const t = useT();

  return (
    <div className="stagger-in mx-auto flex max-w-xl flex-col gap-6 py-6">
      <p className="text-xs font-medium tracking-wide text-mist uppercase">{t.calm.book}</p>
      <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
        {t.calm.stop}
      </h1>
      {pulse ? <p className="text-base leading-relaxed text-muted-foreground">{pulse}</p> : null}
      <ol className="flex flex-col gap-3">
        {brokeSteps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-relaxed sm:text-base">
            <span className="font-display w-4 shrink-0 text-mist tabular-nums">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t.calm.enough}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setCalm("session")}>{t.calm.green}</Button>
        <Button variant="secondary" onClick={() => setCalm("overwhelmed")}>
          {t.calm.still}
        </Button>
      </div>
    </div>
  );
}

function SessionDesk() {
  const missionId = useHarbor((s) => s.missionId);
  const spoilers = useHarbor((s) => s.spoilers);
  const completed = useHarbor((s) => s.completed);
  const markComplete = useHarbor((s) => s.markComplete);
  const setMissionId = useHarbor((s) => s.setMissionId);
  const pulse = useHarbor((s) => s.pulse);
  const checks = useHarbor((s) => s.checks);
  const toggleCheck = useHarbor((s) => s.toggleCheck);
  const locked = useHarbor((s) => isLiveLocked(s));
  const liveFileLoaded = useHarbor((s) => Boolean(s.liveEnabled && s.liveSnapshot));
  const locale = useHarbor((s) => s.locale);
  const t = useT();
  const resolved = resolveMission(missionId);
  const nav = missionId ? getMissionIndex(missionId) : null;
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);

  useEffect(() => {
    setBuildingId(null);
    setPersonId(null);
  }, [missionId]);

  const activeBuilding = useMemo(() => {
    if (!resolved) return null;
    const id = buildingId ?? resolved.buildings[0]?.id;
    return resolved.buildings.find((item) => item.id === id) ?? null;
  }, [resolved, buildingId]);

  if (!resolved || !nav) return null;
  const { mission, chapter, layout, buildings, life, people, lifeAsks } = resolved;
  const shownLayout = layout ?? layoutsById["block-10"];
  const done = completed.includes(mission.id);
  const activePerson = people.find((person) => person.id === (personId ?? people[0]?.id)) ?? null;
  const checked = missionId ? (checks[missionId] ?? []) : [];
  const move = nextMove(pulse, mission.do, checked, locale);
  const chatAsks = [...mission.suggestedAsks, ...lifeAsks.filter((ask) => !mission.suggestedAsks.includes(ask))];

  return (
    <div className="stagger-in mx-auto flex max-w-3xl flex-col gap-6">
      <MobileMissionPicker />
      <IslandPulse />
      {locked ? null : <MissionFinder />}
      <PowerUpSection />

      <section className="rounded-xl bg-card p-4 shadow-border sm:p-6">
        <div className="flex items-start gap-3">
          <IconWell>
            <Compass className="size-5" />
          </IconWell>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-mist uppercase">{t.next.kicker}</p>
            <h2 className="mt-0.5 font-display text-2xl font-medium tracking-tight">{move.title}</h2>
          </div>
        </div>
        <p className="mt-3 border-l-2 border-primary pl-3 text-sm leading-relaxed text-muted-foreground">
          {move.detail}
        </p>
      </section>

      <section className="rounded-xl bg-card p-4 shadow-border sm:p-6">
        <p className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-mist uppercase">
          <Badge variant="outline">
            {chapter.roman === "0" ? t.prologue : fill(t.chapter, chapter.roman)}
          </Badge>
          <Badge>{t.kind[mission.kind]}</Badge>
          <span>
            {nav.index + 1}/{nav.total}
          </span>
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight font-semibold tracking-tight">
          {mission.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed">{mission.objective}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{mission.why}</p>
        {spoilers && mission.spoilers ? (
          <p className="mt-3 border-l-2 border-primary pl-3 text-sm leading-relaxed">{mission.spoilers}</p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:gap-8">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.session.thisSession}
            </p>
            <ol className="mt-2 flex flex-col gap-2">
              {mission.do.map((item, index) => {
                const on = checked.includes(index);
                return (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => missionId && toggleCheck(missionId, index)}
                      disabled={locked}
                      className={cn(
                        "flex min-h-11 w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm leading-relaxed",
                        on ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                        locked && "cursor-default",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                          on ? "bg-ok text-ok-foreground" : "ring-1 ring-border",
                        )}
                      >
                        {on ? <Check className="size-2.5" /> : null}
                      </span>
                      <span className={on ? "line-through opacity-70" : undefined}>{item}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="rounded-lg bg-muted p-4 sm:max-w-56">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.session.betterNot}
            </p>
            <p className="mt-2 text-sm leading-relaxed">{mission.dont}</p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{t.session.trap}</span>
          {mission.trap}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {liveFileLoaded ? (
            <p className="text-sm text-muted-foreground">
              {t.session.liveLeads}
            </p>
          ) : (
            <Button onClick={() => markComplete(mission.id)} disabled={done}>
              {done ? t.session.noted : t.session.thisDone}
            </Button>
          )}
          {locked ? null : nav.nextId ? (
            <Button variant="secondary" onClick={() => setMissionId(nav.nextId!)}>
              {t.session.nextMission}
            </Button>
          ) : nav.prevId ? (
            <Button variant="secondary" onClick={() => setMissionId(nav.prevId!)}>
              {t.session.prevMission}
            </Button>
          ) : null}
        </div>
      </section>

      {shownLayout ? (
        <section className="rounded-xl bg-card p-4 shadow-border sm:p-6">
          <div className="flex items-start gap-3">
            <IconWell>
              <Stamp name="cottage" className="size-5" />
            </IconWell>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t.session.stamp}
              </p>
              <h2 className="mt-0.5 font-display text-2xl font-medium tracking-tight">{shownLayout.title}</h2>
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{shownLayout.hint}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.session.stampsNote}
          </p>
          <div className="mt-5">
            <BlockGrid layout={shownLayout} />
          </div>
          {shownLayout.id === "first-city" || shownLayout.id === "block-10" ? (
            <HarborRoute />
          ) : null}
          <ol className="mt-5 flex flex-col gap-2">
            {shownLayout.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed">
                <span className="font-display w-4 shrink-0 text-mist tabular-nums">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {buildings.length > 0 ? (
        <section className="rounded-xl bg-card p-4 shadow-border sm:p-6">
          <div className="flex items-start gap-3">
            <IconWell>
              <Stamp name="stall" className="size-5" />
            </IconWell>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t.session.buildings}
              </p>
              <h2 className="mt-0.5 font-display text-2xl font-medium tracking-tight">{t.session.whereReal}</h2>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {buildings.map((building) => (
              <button
                key={building.id}
                type="button"
                onClick={() => setBuildingId(building.id)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm",
                  activeBuilding?.id === building.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-secondary",
                )}
              >
                <Stamp name={buildingStamp(building.id)} className="size-4" />
                {building.name}
              </button>
            ))}
          </div>
          {activeBuilding ? (
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div
                className="grid size-24 shrink-0 place-items-center rounded-xl bg-muted text-primary"
                aria-hidden
              >
                <Stamp name={buildingStamp(activeBuilding.id)} className="size-14" />
              </div>
              <div className="flex min-w-0 flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                {fill(t.session.unlocks, activeBuilding.unlock.toLowerCase())}
              </p>
              <p className="text-sm leading-relaxed">{activeBuilding.buddy}</p>
              <p className="text-sm leading-relaxed">
                <span className="font-medium">{t.session.put}</span>
                {activeBuilding.where}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{t.session.watch}</span>
                {activeBuilding.trap}
              </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-xl bg-card p-4 shadow-border sm:p-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t.session.waitCity}
          </p>
          <h2 className="mt-1 font-display text-2xl font-medium tracking-tight">{t.session.notPuzzle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t.session.notPuzzleCopy}
          </p>
        </section>
      )}

      {life ? (
        <section
          className={cn(
            "rounded-xl bg-card p-4 shadow-border sm:p-6",
            pulse.coins === "down" && "ring-2 ring-primary",
          )}
        >
          <div className="flex items-start gap-3">
            <IconWell>
              <Coins className="size-5" />
            </IconWell>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t.session.money}
              </p>
              <h2 className="mt-0.5 font-display text-2xl font-medium tracking-tight">
                {t.session.moneyTitle}
              </h2>
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{life.money.pulse}</p>
          <ol className="mt-4 flex flex-col gap-2">
            {life.money.keepGreen.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed">
                <span className="font-display w-4 shrink-0 text-mist tabular-nums">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Ojo: </span>
            {life.money.trap}
          </p>
          <div className="mt-5 rounded-lg bg-muted p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.session.economy}
            </p>
            <ul className="mt-2 flex flex-col gap-2 text-sm leading-relaxed">
              <li>{t.session.tax}</li>
              <li>{t.session.prod}</li>
              <li>{t.session.zzz}</li>
            </ul>
          </div>
        </section>
      ) : null}

      {life ? (
        <section className="rounded-xl bg-card p-4 shadow-border sm:p-6">
          <div className="flex items-start gap-3">
            <IconWell>
              <Handshake className="size-5" />
            </IconWell>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t.session.manners}
              </p>
              <h2 className="mt-0.5 font-display text-2xl font-medium tracking-tight">
                {t.session.peace}
              </h2>
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{life.diplomacy.pulse}</p>
          <ol className="mt-4 flex flex-col gap-2">
            {life.diplomacy.keepPeace.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed">
                <span className="font-display w-4 shrink-0 text-mist tabular-nums">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          {people.length > 0 ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {people.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setPersonId(person.id)}
                    className={cn(
                      "h-11 rounded-md px-3 text-sm",
                      activePerson?.id === person.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-secondary",
                    )}
                  >
                    {person.name}
                  </button>
                ))}
              </div>
              {activePerson ? (
                <div className="mt-5 flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground">{activePerson.role}</p>
                  <p className="text-sm leading-relaxed">{activePerson.buddy}</p>
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">{t.session.do}</span>
                    {activePerson.do}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">{t.session.dont}</span>
                    {activePerson.dont}
                  </p>
                </div>
              ) : null}
            </>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Ojo: </span>
            {life.diplomacy.trap}
          </p>
        </section>
      ) : null}

      <ChainBoard />

      <BuddyChat suggestions={chatAsks} />

      <HarborFooter reset />
    </div>
  );
}

function ChipRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; text: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "h-11 rounded-md px-3 text-sm",
              value === option.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-secondary",
            )}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function IslandPulse() {
  const pulse = useHarbor((s) => s.pulse);
  const setPulse = useHarbor((s) => s.setPulse);
  const t = useT();

  return (
    <HarborCard
      kicker={t.pulse.kicker}
      title={t.pulse.title}
      stamp="cottage"
      hint={t.pulse.hint}
    >
      <div className="flex flex-col gap-4">
        <ChipRow<CoinsPulse>
          label={t.pulse.coins}
          value={pulse.coins}
          onChange={(coins) => setPulse({ coins })}
          options={[
            { id: "up", text: t.pulse.up },
            { id: "down", text: t.pulse.down },
            { id: "unknown", text: t.pulse.unknown },
          ]}
        />
        <ChipRow<HousesPulse>
          label={t.pulse.houses}
          value={pulse.houses}
          onChange={(houses) => setPulse({ houses })}
          options={[
            { id: "ok", text: t.pulse.ok },
            { id: "yellow", text: t.pulse.yellow },
            { id: "empty", text: t.pulse.empty },
            { id: "unknown", text: t.pulse.unknown },
          ]}
        />
        <ChipRow<LookingPulse>
          label={t.pulse.looking}
          value={pulse.looking}
          onChange={(looking) => setPulse({ looking })}
          options={[
            { id: "city", text: t.pulse.city },
            { id: "stats", text: t.pulse.stats },
            { id: "quest", text: t.pulse.quest },
            { id: "sea", text: t.pulse.sea },
            { id: "other", text: t.pulse.other },
          ]}
        />
      </div>
    </HarborCard>
  );
}

function MobileMissionPicker() {
  const missionId = useHarbor((s) => s.missionId);
  const setMissionId = useHarbor((s) => s.setMissionId);
  const locked = useHarbor((s) => isLiveLocked(s));
  const mission = missionId ? missionsById[missionId] : null;
  if (!mission) return null;
  const chapter = chapters.find((item) => item.id === mission.chapterId);
  if (!chapter) return null;

  return (
    <label className="flex flex-col gap-2 lg:hidden">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Misión de este capítulo
      </span>
      <select
        className="h-11 rounded-md bg-card px-3 text-sm shadow-border"
        value={mission.id}
        disabled={locked}
        onChange={(event) => setMissionId(event.target.value)}
      >
        {chapter.missionIds.map((id) => {
          const item = missionsById[id];
          return item ? (
            <option key={id} value={id}>
              {item.title}
            </option>
          ) : null;
        })}
      </select>
    </label>
  );
}

function HarborFooter({ reset = false }: { reset?: boolean }) {
  const resetProgress = useHarbor((s) => s.resetProgress);
  const t = useT();

  return (
    <footer className="flex flex-col gap-3 pb-8 text-xs text-muted-foreground">
      <p>{t.footer}</p>
      <p className="flex flex-wrap gap-x-3 gap-y-1">
        <a
          href="https://www.reddit.com/r/anno1800/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center"
        >
          {t.reddit}
        </a>
        <a
          href="https://www.reddit.com/r/anno/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center"
        >
          r/anno
        </a>
        <a
          href="https://anno1800.fandom.com/wiki/Campaign"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center"
        >
          {t.wiki}
        </a>
      </p>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <Compass className="size-3.5" />
          El progreso queda en este aparato.
        </span>
        {reset ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("¿Empezamos el cuaderno de nuevo desde la primera ciudad?")) {
                resetProgress();
              }
            }}
            className="inline-flex h-11 items-center gap-1.5 hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reiniciar
          </button>
        ) : null}
      </div>
    </footer>
  );
}

