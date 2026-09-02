import { EstoAhoraItem } from "@/components/esto-ahora";
import { IslandPulse } from "@/components/island-pulse";
import { PowerUpSection } from "@/components/live-panel";
import { saturadoRojo } from "@/lib/session-desk";
import { resolveMission } from "@/lib/data";
import { commitDeskMutation } from "@/lib/desk-offline";
import { getDeskHost } from "@/lib/session-boot";
import { useHarbor } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SessionDesk() {
  const missionId = useHarbor((s) => s.missionId);
  const pulse = useHarbor((s) => s.pulse);
  const calm = useHarbor((s) => s.calm);
  const resolved = resolveMission(missionId);

  if (!resolved) return null;

  const { saturado, rojo } = saturadoRojo(pulse, calm);
  const alarm = saturado || rojo;

  function commit(kind: Parameters<typeof commitDeskMutation>[1]) {
    commitDeskMutation(getDeskHost(), kind);
  }

  return (
    <div className="stagger-in mx-auto flex max-w-lg flex-col gap-4">
      <div data-home-primary="chips" className="flex flex-col gap-4">
        <IslandPulse />
        <article
          data-session-desk="one-card"
          aria-label="Esto, ahora"
          className={cn(
            "rounded-xl p-5 sm:p-7",
            alarm
              ? "bg-destructive text-destructive-foreground shadow-border"
              : "bg-card text-card-foreground shadow-border",
          )}
        >
          <p
            role="status"
            aria-live="polite"
            className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide uppercase"
          >
            <StatusChip
              label="Saturado"
              on={saturado}
              alarm={alarm}
              onClick={() =>
                commit({ kind: "setCalm", value: calm === "overwhelmed" ? "session" : "overwhelmed" })
              }
            />
            <StatusChip
              label="Rojo"
              on={rojo}
              alarm={alarm}
              onClick={() =>
                commit({ kind: "setPulse", patch: { coins: pulse.coins === "down" ? "up" : "down" } })
              }
            />
          </p>
          <EstoAhoraItem />
        </article>
      </div>
      <PowerUpSection />
    </div>
  );
}

function StatusChip({
  label,
  on,
  alarm,
  onClick,
}: {
  label: string;
  on: boolean;
  alarm: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-on={on ? "true" : "false"}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md px-3",
        on
          ? alarm
            ? "bg-destructive-foreground text-destructive"
            : "bg-destructive text-destructive-foreground"
          : alarm
            ? "text-destructive-foreground/55"
            : "text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}
