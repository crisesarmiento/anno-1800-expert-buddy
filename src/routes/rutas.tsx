import { createFileRoute } from "@tanstack/react-router";
import { SessionBoot } from "@/components/session-boot";
import { TradeRoutes } from "@/components/trade-routes";

export const Route = createFileRoute("/rutas")({
  component: RoutesPage,
});

function RoutesPage() {
  return (
    <SessionBoot>
      <TradeRoutes />
    </SessionBoot>
  );
}
