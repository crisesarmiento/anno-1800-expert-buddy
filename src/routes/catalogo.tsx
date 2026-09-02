import { createFileRoute } from "@tanstack/react-router";
import { WikiCatalogPage } from "@/components/wiki-catalog";

export const Route = createFileRoute("/catalogo")({
  component: CatalogoPage,
});

function CatalogoPage() {
  return <WikiCatalogPage />;
}
