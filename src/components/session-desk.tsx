import { Check } from "lucide-react";
import { useState } from "react";
import { saturadoRojo, sessionChecklist } from "@/lib/session-desk";
import { resolveMission } from "@/lib/data";
import { commitDeskMutation } from "@/lib/desk-offline";
import { CHECK_HIGHLIGHT_ID } from "@/lib/radio-down";
import { getDeskHost } from "@/lib/session-boot";
import { useHarbor } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SessionDesk() {
  const missionId = useHarbor((s) => s.missionId);
  const pulse = useHarbor((s) => s.pulse);
  const calm = useHarbor((s) => s.calm);
  const checkItems = useHarbor((s) => s.checkItems);
  const resolved = resolveMission(missionId);
  const [draft, setDraft] = useState("");

  if (!resolved) return null;

  const { mission } = resolved;
  const items =
    checkItems.length > 0
      ? checkItems
      : sessionChecklist(mission.do).map((text, index) => ({
          text,
          done: false,
          pad: index >= mission.do.length,
        }));
  const { saturado, rojo } = saturadoRojo(pulse, calm);
  const alarm = saturado || rojo;

  function commit(kind: Parameters<typeof commitDeskMutation>[1]) {
    commitDeskMutation(getDeskHost(), kind);
  }

  return (
    <div className="stagger-in mx-auto flex max-w-lg flex-col">
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
          className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide uppercase"
        >
          <StatusChip
            label="Saturado"
            on={saturado}
            alarm={alarm}
            onClick={() => commit({ kind: "setCalm", value: calm === "overwhelmed" ? "session" : "overwhelmed" })}
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
        <h1 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          Esto, ahora
        </h1>
        <ol className="mt-6 flex flex-col gap-2">
          {items.map((item, index) => {
            const pad = "pad" in item && item.pad;
            const on = !pad && item.done;
            return (
              <li key={`${index}-${item.text}`} className="flex items-start gap-1">
                <button
                  type="button"
                  id={CHECK_HIGHLIGHT_ID(index)}
                  onClick={() => {
                    if (!pad) commit({ kind: "toggleCheck", index });
                  }}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-md px-2 py-2 text-left text-sm leading-relaxed",
                    on ? "bg-accent text-accent-foreground" : "hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                      on
                        ? "bg-ok text-ok-foreground"
                        : alarm
                          ? "ring-1 ring-destructive-foreground/50"
                          : "ring-1 ring-border",
                    )}
                  >
                    {on ? <Check className="size-2.5" /> : null}
                  </span>
                  <span className={on ? "line-through opacity-70" : undefined}>{item.text}</span>
                </button>
                {pad ? null : (
                  <span className="flex shrink-0 flex-col pt-1">
                    <button
                      type="button"
                      aria-label="Subir"
                      className="min-h-11 min-w-11 text-xs text-muted-foreground"
                      onClick={() => commit({ kind: "reorderChecks", from: index, to: index - 1 })}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Bajar"
                      className="min-h-11 min-w-11 text-xs text-muted-foreground"
                      onClick={() => commit({ kind: "reorderChecks", from: index, to: index + 1 })}
                    >
                      ↓
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            commit({ kind: "addCheck", text: draft });
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Agregar a la lista"
            placeholder="Agregar a la lista"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm"
          />
          <button type="submit" className="min-h-11 rounded-md px-3 text-sm">
            Agregar
          </button>
        </form>
      </article>
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
