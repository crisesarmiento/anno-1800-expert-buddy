import { createFileRoute } from "@tanstack/react-router";
import { WikiCatalogPage } from "@/components/wiki-catalog";
import { SessionBoot } from "@/components/session-boot";

export const Route = createFileRoute("/catalogo")({
  component: CatalogoPage,
});

function CatalogoPage() {
  return (
    <SessionBoot>
      <WikiCatalogPage />
    </SessionBoot>
  );
}
