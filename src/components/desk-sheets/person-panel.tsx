import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { HarborPerson } from "@/lib/data";
import { cn } from "@/lib/utils";
import { DisclosureSheet } from "./disclosure-sheet";
import { PERSON_TAP_LABEL } from "./labels";

export function PersonPanel({ people }: { people: HarborPerson[] }) {
  const [open, setOpen] = useState(false);
  const [personId, setPersonId] = useState<string | null>(null);

  const peopleKey = people.map((person) => person.id).join(",");

  useEffect(() => {
    setOpen(false);
    setPersonId(null);
  }, [peopleKey]);

  const active = people.find((person) => person.id === (personId ?? people[0]?.id)) ?? null;

  return (
    <div data-desk-panel="quien">
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {PERSON_TAP_LABEL}
      </Button>
      <DisclosureSheet
        open={open}
        onClose={() => setOpen(false)}
        kicker="Gente de esta sesión"
        title="Quién es"
        labelledBy="desk-sheet-quien"
      >
        {people.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            En esta misión no hay alguien nuevo para señalar. Seguí el marcador.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setPersonId(person.id)}
                  className={cn(
                    "h-11 rounded-md px-3 text-sm",
                    active?.id === person.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-secondary",
                  )}
                >
                  {person.name}
                </button>
              ))}
            </div>
            {active ? (
              <div className="mt-5 flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">{active.role}</p>
                <p className="text-sm leading-relaxed">{active.buddy}</p>
                <p className="text-sm leading-relaxed">
                  <span className="font-medium">Hacé: </span>
                  {active.do}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">No hagas: </span>
                  {active.dont}
                </p>
              </div>
            ) : null}
          </>
        )}
      </DisclosureSheet>
    </div>
  );
}
