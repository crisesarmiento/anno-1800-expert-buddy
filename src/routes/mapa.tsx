import { createFileRoute } from "@tanstack/react-router";
import { GatedMapPage } from "@/components/gated-map-page";
import { SessionBoot } from "@/components/session-boot";

export const Route = createFileRoute("/mapa")({
  component: MapaPage,
});

function MapaPage() {
  return (
    <SessionBoot>
      <GatedMapPage />
    </SessionBoot>
  );
}
