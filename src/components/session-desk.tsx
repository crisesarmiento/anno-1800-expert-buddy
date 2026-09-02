import { DiaryTitleChips } from "@/components/diary-chips";
import { InkSeal } from "@/components/stamps";
import { ESTO_AHORA_IDLE } from "@/lib/diary-chips";
import { deskCalmUmbral, sessionEstoAhora } from "@/lib/session-desk";
import { resolveMission } from "@/lib/data";
import { commitDeskMutation } from "@/lib/desk-offline";
import { CHECK_HIGHLIGHT_ID } from "@/lib/radio-down";
import { getDeskHost } from "@/lib/session-boot";
import { useHarbor } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SessionDesk() {
  const missionId = useHarbor((s) => s.missionId);
  const setMissionId = useHarbor((s) => s.setMissionId);
  const pulse = useHarbor((s) => s.pulse);
  const calm = useHarbor((s) => s.calm);
  const checkItems = useHarbor((s) => s.checkItems);
  const resolved = resolveMission(missionId);

  if (!resolved) return null;

  const { mission } = resolved;
  const items =
    checkItems.length > 0
      ? checkItems
      : [{ text: sessionEstoAhora(mission.do), done: false, pad: false }];
  const now = items.find((item) => !item.done) ?? items[0];
  const nowIndex = Math.max(0, items.indexOf(now));
  const { saturado, rojo, umbral, alarm, taller } = deskCalmUmbral(pulse, calm);

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
          alarm ? "bg-destructive text-destructive-foreground" : "bg-card text-card-foreground",
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
        <h1 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          Esto, ahora
        </h1>
        {taller ? (
          <a
            data-taller-link=""
            href={taller.href}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
              "mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4",
              alarm ? "text-destructive-foreground" : "text-foreground",
            )}
          >
            Ver taller
          </a>
        ) : null}
        <p data-esto-ahora-item="" className="mt-6 text-lg leading-relaxed">
          <button
            type="button"
            id={CHECK_HIGHLIGHT_ID(nowIndex)}
            onClick={() => commit({ kind: "toggleCheck", index: nowIndex })}
            className="text-left"
          >
            {now?.text ?? ESTO_AHORA_IDLE}
          </button>
        </p>
      </article>
      <DiaryTitleChips activeId={missionId} onPick={setMissionId} />
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
