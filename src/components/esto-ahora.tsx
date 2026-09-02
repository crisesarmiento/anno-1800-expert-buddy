import { firstPlayableMissionId, missionsById } from "@/lib/data";
import { nextMove } from "@/lib/play";
import { CHECK_HIGHLIGHT_ID } from "@/lib/radio-down";
import { sessionNowItem } from "@/lib/session-desk";
import { useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";

export function EstoAhoraItem() {
  const missionId = useHarbor((s) => s.missionId);
  const pulse = useHarbor((s) => s.pulse);
  const checks = useHarbor((s) => s.checks);
  const locale = useHarbor((s) => s.locale);
  const t = useT();
  const id = missionId ?? firstPlayableMissionId;
  const doItems = missionsById[id]?.do ?? [];
  const checked = checks[id] ?? [];
  const move = nextMove(pulse, doItems, checked, locale);
  const nextIndex = doItems.findIndex((_, index) => !checked.includes(index));
  const itemText = move.title === t.next.nowTitle ? move.detail : move.title;

  return (
    <section data-esto-ahora="" data-esto-ahora-count="1" aria-label={t.next.nowTitle}>
      <h2 className="font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
        {t.next.nowTitle}
      </h2>
      <p
        data-esto-ahora-item=""
        id={nextIndex >= 0 ? CHECK_HIGHLIGHT_ID(nextIndex) : undefined}
        className="mt-4 text-sm leading-relaxed sm:text-base"
      >
        {itemText || sessionNowItem(doItems, checked)}
      </p>
    </section>
  );
}
