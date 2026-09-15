import { createFileRoute } from "@tanstack/react-router";
import { HarborDash } from "@/components/harbor-dash";
import { SessionBoot } from "@/components/session-boot";

export const Route = createFileRoute("/tablero")({
  component: TableroPage,
});

function TableroPage() {
  return (
    <SessionBoot>
      <HarborDash />
    </SessionBoot>
  );
}
