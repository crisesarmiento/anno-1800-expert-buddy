import { createFileRoute, Link } from "@tanstack/react-router";
import { Anchor } from "lucide-react";
import { IconWell } from "@/components/harbor-card";
import { LanguageSelect } from "@/components/language-select";
import { PowerUpSection } from "@/components/live-panel";
import { SessionBoot } from "@/components/session-boot";

export const Route = createFileRoute("/conectar")({
  component: ConectarPage,
});

function ConectarPage() {
  return (
    <SessionBoot>
      <div className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <IconWell>
              <Anchor className="size-5" strokeWidth={1.75} />
            </IconWell>
            <div className="min-w-0">
              <p className="font-display text-lg leading-none font-semibold tracking-tight">
                Anno 1800 Buddy
              </p>
              <p className="mt-1 text-xs text-mist">Conectar el último guardado</p>
            </div>
            <LanguageSelect className="ml-auto" />
            <Link to="/" className="inline-flex h-11 items-center text-sm text-primary">
              Inicio
            </Link>
          </div>
        </header>
        <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
          <PowerUpSection />
        </main>
      </div>
    </SessionBoot>
  );
}
