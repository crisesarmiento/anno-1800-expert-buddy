import type { Building, HarborPerson, Layout } from "@/lib/data";
import { PlacePanel } from "./place-panel";
import { PersonPanel } from "./person-panel";
import { StampPanel } from "./stamp-panel";

/**
 * Three tap targets only — not a nav row, not default-desk content.
 * Composed next to the chief card on the companion surface. Do not promote to tabs.
 */
export function DeskDisclosurePanels({
  layout,
  buildings,
  people,
}: {
  layout?: Layout;
  buildings: Building[];
  people: HarborPerson[];
}) {
  return (
    <div className="flex flex-wrap gap-2" data-desk-disclosure="">
      <StampPanel layout={layout} />
      <PlacePanel buildings={buildings} />
      <PersonPanel people={people} />
    </div>
  );
}
