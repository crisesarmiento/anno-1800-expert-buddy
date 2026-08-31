import { cn } from "@/lib/utils";
import type { Layout } from "@/lib/data";
import { Stamp, TileMark, CELL_TILE } from "@/components/stamps";

const CELL_CLASS: Record<string, string> = {
  R: "cell-road",
  H: "cell-house",
  G: "cell-gap",
  P: "cell-public",
  W: "cell-water",
  F: "cell-farm",
  I: "cell-industry",
  T: "cell-tree",
  M: "cell-public",
  ".": "cell-empty",
};

const LEGEND: { key: string; label: string; className: string; stamp: string; ink: string }[] = [
  { key: "R", label: "Calle", className: "cell-road", stamp: "road", ink: "text-background/80" },
  { key: "H", label: "Casa", className: "cell-house", stamp: "cottage", ink: "text-background/80" },
  { key: "G", label: "Jardín", className: "cell-gap", stamp: "garden", ink: "text-ok" },
  { key: "P", label: "Público", className: "cell-public", stamp: "chapel", ink: "text-primary-foreground" },
  { key: "W", label: "Agua", className: "cell-water", stamp: "water", ink: "text-foreground" },
  { key: "F", label: "Granja", className: "cell-farm", stamp: "farm", ink: "text-background/80" },
  { key: "I", label: "Industria", className: "cell-industry", stamp: "industry", ink: "text-foreground" },
  { key: "T", label: "Árboles", className: "cell-tree", stamp: "tree", ink: "text-foreground" },
];

const CELL_INK: Record<string, string> = {
  H: "text-background/75",
  G: "text-ok",
  P: "text-primary-foreground",
  M: "text-primary-foreground",
  W: "text-foreground/85",
  F: "text-background/80",
  I: "text-foreground/85",
  T: "text-foreground/85",
};

export function BlockGrid({ layout }: { layout: Layout }) {
  const cols = Math.max(...layout.grid.map((row) => row.length), 1);
  const used = new Set(layout.grid.join("").split(""));
  const legend = LEGEND.filter((item) => used.has(item.key) || (item.key === "P" && used.has("M")));

  return (
    <div className="flex flex-col gap-4">
      <div
        className="mx-auto w-full max-w-md rounded-xl bg-muted p-3"
        style={{ maxWidth: "min(100%, 28rem)" }}
      >
        <div
          className="grid aspect-square w-full gap-[2px] overflow-hidden rounded-md"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          role="img"
          aria-label={layout.title}
        >
          {layout.grid.flatMap((row, y) =>
            row.split("").map((cell, x) => {
              const tile = CELL_TILE[cell];
              return (
                <span
                  key={`${y}-${x}`}
                  className={cn(
                    "relative grid aspect-square place-items-center",
                    CELL_CLASS[cell] ?? "cell-empty",
                  )}
                >
                  {tile ? (
                    <TileMark name={tile} className={cn("size-[70%]", CELL_INK[cell])} />
                  ) : null}
                </span>
              );
            }),
          )}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground">
        {legend.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span className={cn("grid size-6 place-items-center rounded-xs", item.className)}>
              <Stamp name={item.stamp} className={cn("size-4", item.ink)} />
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

const ROUTE = [
  { stamp: "water", label: "Puerto" },
  { stamp: "crate", label: "Almacén" },
  { stamp: "road", label: "Calle" },
  { stamp: "stall", label: "Mercado" },
  { stamp: "cottage", label: "10×10" },
];

export function HarborRoute() {
  return (
    <ol className="mt-5 flex flex-wrap items-center gap-2">
      {ROUTE.map((stop, index) => (
        <li key={stop.label} className="flex items-center gap-2">
          {index > 0 ? (
            <span className="text-mist" aria-hidden>
              →
            </span>
          ) : null}
          <span className="inline-flex h-11 items-center gap-2 rounded-md bg-muted px-3 text-sm">
            <Stamp name={stop.stamp} className="size-4 text-primary" />
            {stop.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
