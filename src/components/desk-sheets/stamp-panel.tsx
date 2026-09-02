import { useEffect, useState } from "react";
import { BlockGrid, HarborRoute } from "@/components/block-grid";
import { Button } from "@/components/ui/button";
import { layoutsById, type Layout } from "@/lib/data";
import { commitDeskMutation } from "@/lib/desk-offline";
import { getDeskHost } from "@/lib/session-boot";
import { useHarbor } from "@/lib/store";
import { DisclosureSheet } from "./disclosure-sheet";
import { STAMP_TAP_LABEL } from "./labels";

export function StampPanel({ layout }: { layout?: Layout }) {
  const [open, setOpen] = useState(false);
  const shown = layout ?? layoutsById["block-10"];
  const stamps = useHarbor((s) => s.stamps);
  const applied = shown ? stamps.includes(shown.id) : false;

  useEffect(() => {
    setOpen(false);
  }, [layout?.id]);

  if (!shown) return null;

  return (
    <div data-desk-panel="sello">
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {STAMP_TAP_LABEL}
      </Button>
      <DisclosureSheet
        open={open}
        onClose={() => setOpen(false)}
        kicker="Sello de ciudad"
        title={shown.title}
        labelledBy="desk-sheet-sello"
      >
        <p className="text-sm leading-relaxed text-muted-foreground">{shown.hint}</p>
        <p className="mt-1 text-xs text-muted-foreground">Sellos del cuaderno. No son el arte del juego.</p>
        <div className="mt-5">
          <BlockGrid layout={shown} />
        </div>
        {shown.id === "first-city" || shown.id === "block-10" ? <HarborRoute /> : null}
        <ol className="mt-5 flex flex-col gap-2">
          {shown.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed">
              <span className="font-display w-4 shrink-0 text-mist tabular-nums">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          className="mt-5"
          variant={applied ? "secondary" : "default"}
          onClick={() =>
            commitDeskMutation(
              getDeskHost(),
              applied ? { kind: "removeStamp", id: shown.id } : { kind: "applyStamp", id: shown.id },
            )
          }
        >
          {applied ? "Quitar sello" : "Aplicar sello"}
        </Button>
      </DisclosureSheet>
    </div>
  );
}
