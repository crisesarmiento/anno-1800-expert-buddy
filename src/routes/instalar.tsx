import { createFileRoute, Link } from "@tanstack/react-router";
import { Anchor } from "lucide-react";
import { IconWell } from "@/components/harbor-card";
import { LanguageSelect } from "@/components/language-select";
import { InstallPanel } from "@/components/install-panel";
import { PowerUpSection } from "@/components/live-panel";

export const Route = createFileRoute("/instalar")({
  component: InstalarPage,
});

function InstalarPage() {
  return (
    <div className="min-h-dvh bg-background" data-visual="diario">
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <IconWell>
            <Anchor className="size-5" strokeWidth={1.75} />
          </IconWell>
          <div className="min-w-0">
            <p className="font-display text-lg leading-none font-semibold tracking-tight">
              Anno 1800 Buddy
            </p>
            <p className="mt-1 text-xs text-mist">Instalar Anno 1800 Buddy en Anno</p>
          </div>
          <LanguageSelect className="ml-auto" />
          <Link to="/" className="inline-flex h-11 items-center text-sm text-primary">
            Escritorio
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <InstallPanel launcher />
        <PowerUpSection />
      </main>
    </div>
  );
}
