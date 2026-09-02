import { DeskDisclosurePanels, TAP_LABELS } from "@/components/desk-sheets";
import { SessionDesk } from "@/components/session-desk";
import { HudPasteAdvisor } from "@/components/hud-paste-advisor";
import { resolveMission } from "@/lib/data";
import { useHarbor } from "@/lib/store";

export { TAP_LABELS };

/**
 * Compose the one-card desk with tap-to-reveal sheets.
 * Sheets live on the companion surface — not extra nav tabs.
 */
export function SessionDeskSurface() {
  const missionId = useHarbor((s) => s.missionId);
  const resolved = resolveMission(missionId);

  return (
    <div
      data-session-surface="compose"
      className="mx-auto grid min-h-[calc(100dvh-7rem)] w-full max-w-5xl grid-cols-1 grid-rows-[auto_minmax(12rem,1fr)] gap-4 lg:grid-cols-[minmax(0,32rem)_minmax(18rem,1fr)] lg:grid-rows-1 lg:items-start"
    >
      <section data-surface="primary" className="min-w-0">
        <SessionDesk />
        <HudPasteAdvisor listen="window" />
      </section>
      <aside
        data-surface="companion"
        aria-label="Más del escritorio"
        className="relative min-h-12 has-[[data-desk-sheet]]:min-h-[min(70dvh,36rem)]"
      >
        {resolved ? (
          <DeskDisclosurePanels
            layout={resolved.layout}
            buildings={resolved.buildings}
            people={resolved.people}
          />
        ) : null}
      </aside>
    </div>
  );
}
