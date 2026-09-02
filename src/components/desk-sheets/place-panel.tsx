import { useEffect, useMemo, useState } from "react";
import { Stamp, buildingStamp } from "@/components/stamps";
import { Button } from "@/components/ui/button";
import type { Building } from "@/lib/data";
import { cn } from "@/lib/utils";
import { DisclosureSheet } from "./disclosure-sheet";
import { PLACE_TAP_LABEL } from "./labels";

export function PlacePanel({ buildings }: { buildings: Building[] }) {
  const [open, setOpen] = useState(false);
  const [buildingId, setBuildingId] = useState<string | null>(null);

  const buildingKey = buildings.map((item) => item.id).join(",");

  useEffect(() => {
    setOpen(false);
    setBuildingId(null);
  }, [buildingKey]);

  const active = useMemo(() => {
    const id = buildingId ?? buildings[0]?.id;
    return buildings.find((item) => item.id === id) ?? null;
  }, [buildings, buildingId]);

  return (
    <div data-desk-panel="donde">
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {PLACE_TAP_LABEL}
      </Button>
      <DisclosureSheet
        open={open}
        onClose={() => setOpen(false)}
        kicker="Edificios nuevos"
        title="Dónde va de verdad"
        labelledBy="desk-sheet-donde"
      >
        {buildings.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Seguí el marcador y volvé a tus 10×10. Si las barras están verdes, la isla no te necesita un
            rato.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {buildings.map((building) => (
                <button
                  key={building.id}
                  type="button"
                  onClick={() => setBuildingId(building.id)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm",
                    active?.id === building.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-secondary",
                  )}
                >
                  <Stamp name={buildingStamp(building.id)} className="size-4" />
                  {building.name}
                </button>
              ))}
            </div>
            {active ? (
              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
                <div
                  className="grid size-24 shrink-0 place-items-center rounded-xl bg-muted text-primary"
                  aria-hidden
                >
                  <Stamp name={buildingStamp(active.id)} className="size-14" />
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                  <p className="text-xs text-muted-foreground">Se desbloquea {active.unlock.toLowerCase()}</p>
                  <p className="text-sm leading-relaxed">{active.buddy}</p>
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">Ponelo: </span>
                    {active.where}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Ojo: </span>
                    {active.trap}
                  </p>
                </div>
              </div>
            ) : null}
          </>
        )}
      </DisclosureSheet>
    </div>
  );
}
