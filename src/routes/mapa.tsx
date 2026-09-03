import { createFileRoute } from "@tanstack/react-router";
import { GatedMapPage } from "@/components/gated-map-page";

export const Route = createFileRoute("/mapa")({
  component: MapaPage,
});

function MapaPage() {
  return <GatedMapPage />;
}
