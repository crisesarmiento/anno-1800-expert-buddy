import { InkSeal } from "@/components/stamps";
import { islandFocusOptions } from "@/lib/island-focus";
import { cn } from "@/lib/utils";

/** Notebook chip/selector texture — never the brass CTA expedition wreath. */
export function IslandFocusChips({
  activeId,
  onPick,
}: {
  activeId: string;
  onPick: (id: string) => void;
}) {
  const islands = islandFocusOptions();

  return (
    <div data-island-focus-chips="" className="flex flex-wrap gap-2">
      {islands.map((island) => {
        const on = activeId === island.id;
        return (
          <button
            key={island.id}
            type="button"
            data-island-focus-chip={island.id}
            aria-pressed={on}
            onClick={() => onPick(island.id)}
            className={cn(
              "inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm leading-snug",
              on
                ? "border-ink bg-ink text-paper"
                : "border-ink/35 bg-card text-ink hover:border-ink",
            )}
          >
            <InkSeal kind="anchor" tone="ink" className="size-5" />
            <span className="min-w-0 truncate font-display">{island.name}</span>
          </button>
        );
      })}
    </div>
  );
}
