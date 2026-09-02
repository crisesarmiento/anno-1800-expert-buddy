import { HarborCard } from "@/components/harbor-card";
import { type CoinsPulse, type HousesPulse, type LookingPulse } from "@/lib/play";
import { useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

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

export function IslandPulse() {
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
      <div data-diary-chips="" className="flex flex-col gap-4">
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
