import { InkSeal } from "@/components/stamps";
import { cn } from "@/lib/utils";
import { diaryTitleChips } from "@/lib/diary-chips";

export function DiaryTitleChips({
  activeId,
  onPick,
}: {
  activeId?: string | null;
  onPick: (id: string) => void;
}) {
  const chips = diaryTitleChips();

  return (
    <div data-diary-chips="" className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const on = activeId === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            data-diary-chip={chip.id}
            onClick={() => onPick(chip.id)}
            className={cn(
              "inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm leading-snug",
              on
                ? "border-ink bg-ink text-paper"
                : "border-ink/35 bg-card text-ink hover:border-ink",
            )}
          >
            <InkSeal kind="book" tone="ink" className="size-7" />
            <span className="min-w-0 truncate font-display">{chip.title}</span>
          </button>
        );
      })}
    </div>
  );
}
