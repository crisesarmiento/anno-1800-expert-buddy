import { createFileRoute } from "@tanstack/react-router";
import { HarborDash } from "@/components/harbor-dash";

export const Route = createFileRoute("/tablero")({
  component: TableroPage,
});

function TableroPage() {
  return <HarborDash />;
}
