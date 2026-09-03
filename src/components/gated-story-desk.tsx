import { InkSeal } from "@/components/stamps";
import { commitDeskMutation } from "@/lib/desk-offline";
import {
  ASK_ISLA,
  ASK_PERIODICO,
  SEEN_ISLA,
  SEEN_PERIODICO,
  gatedStory,
} from "@/lib/gated-story";
import { getDeskHost } from "@/lib/session-boot";
import { useHarbor } from "@/lib/store";

export function GatedStoryDesk() {
  const snapshot = useHarbor((s) => s.liveSnapshot);
  const missionId = useHarbor((s) => s.missionId);
  const pulse = useHarbor((s) => s.pulse);
  const calm = useHarbor((s) => s.calm);
  const stamps = useHarbor((s) => s.stamps);
  const story = gatedStory({ snapshot, missionId, pulse, calm, stamps, spoilers: false });

  function stamp(id: string) {
    commitDeskMutation(getDeskHost(), { kind: "applyStamp", id });
  }

  return (
    <section data-gated-story="" data-layer="second-monitor" className="flex flex-col gap-4">
      <article data-gated-tip="" className="rounded-xl border border-ink/25 bg-card p-4">
        <p className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
          <InkSeal kind="book" tone="ink" className="size-7" title={story.tip.title} />
          {story.tip.title}
        </p>
        <p className="mt-2 font-display text-lg leading-snug">{story.tip.line}</p>
      </article>

      <article data-gated-session="" className="rounded-xl border border-ink/25 bg-card p-4">
        <p className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
          <InkSeal kind="book" tone="ink" className="size-7" title="Esta partida" />
          Esta partida
        </p>
        <p data-session-line="" className="mt-2 font-display text-lg leading-snug">
          {story.sessionLine}
        </p>
      </article>

      <article data-gated-map="" className="rounded-xl border border-ink/25 bg-card p-4">
        <p className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
          <InkSeal kind="anchor" tone="ink" className="size-7" title="Islas ya vistas" />
          Islas ya vistas
        </p>
        <svg
          data-gated-sketch=""
          viewBox="0 0 200 110"
          className="mt-3 w-full text-ink"
          role="img"
          aria-label="Croquis de islas ya vistas"
        >
          <title>Croquis de islas ya vistas</title>
          <rect x="1" y="1" width="198" height="108" fill="none" stroke="currentColor" strokeOpacity="0.2" />
          <path
            d="M8 86c22-6 40 8 62 2 18-5 28-18 48-14 16 3 28 14 46 8 10-3 22-2 28 6"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.28"
            strokeWidth="1.2"
          />
          {story.sketch.map((island) => (
            <g key={island.id} data-gated-island={island.id}>
              <ellipse cx={island.x} cy={island.y} rx="16" ry="10" fill="currentColor" fillOpacity="0.08" />
              <path
                d={`M${island.x - 14} ${island.y} c4-8 10-9 14-8 6 1 10 6 14 8 -3 7-9 9-14 9 -6 0-11-3-14-9z`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <text
                x={island.x}
                y={island.y + 22}
                textAnchor="middle"
                className="fill-current"
                fontSize="7"
              >
                {island.name}
              </text>
            </g>
          ))}
        </svg>
        {story.islands.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed">Nada sellado en esta partida.</p>
        ) : (
          <ul data-island-lines="" className="mt-3 flex flex-col gap-1">
            {story.islandLines.map((line) => (
              <li key={line} data-island-line="" className="text-sm leading-snug">
                {line}
              </li>
            ))}
          </ul>
        )}
        {story.islandAsk ? (
          <ManualChip ask={story.islandAsk} label={story.islandChip ?? ASK_ISLA} onStamp={() => stamp(SEEN_ISLA)} />
        ) : null}
      </article>

      <article data-gated-demo="" className="rounded-xl border border-ink/25 bg-card p-4">
        <p className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
          <InkSeal kind="check" tone="ink" className="size-7" title={story.democracy.title} />
          {story.democracy.title}
        </p>
        <p className="mt-2 text-sm leading-relaxed">{story.democracy.line}</p>
        {story.democracy.ask ? (
          <ManualChip
            ask={story.democracy.ask}
            label={story.democracy.chip ?? ASK_PERIODICO}
            onStamp={() => stamp(SEEN_PERIODICO)}
          />
        ) : null}
      </article>
    </section>
  );
}

function ManualChip({ ask, label, onStamp }: { ask: string; label: string; onStamp: () => void }) {
  return (
    <div className="mt-3 flex flex-col items-start gap-2">
      <p data-gated-ask="" className="text-sm">
        {ask}
      </p>
      <button
        type="button"
        data-gated-chip=""
        onClick={onStamp}
        className="inline-flex min-h-11 items-center rounded-full border border-ink/35 px-3 text-sm"
      >
        {label}
      </button>
    </div>
  );
}
