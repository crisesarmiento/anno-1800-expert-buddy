import { Link } from "@tanstack/react-router";
import { GatedStoryDesk } from "@/components/gated-story-desk";
import { InkSeal } from "@/components/stamps";
import { useT } from "@/lib/use-t";

export function GatedMapPage() {
  const t = useT();

  return (
    <div className="min-h-dvh bg-background" data-visual="diario" data-gated-map-page="">
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <InkSeal kind="anchor" tone="ink" className="size-8" title="Anno 1800 Buddy" />
          <div className="min-w-0">
            <p className="font-display text-lg leading-none font-semibold tracking-tight">
              Anno 1800 Buddy
            </p>
            <p className="mt-1 text-xs text-mist">Segundo monitor · solo lo ya visto</p>
          </div>
          <Link to="/" className="ml-auto inline-flex h-11 items-center text-sm text-primary">
            {t.deskShort}
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t.map}</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Croquis de esta partida</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Mapa a mano, periódico si ya está, y un tip de diez segundos. Nada de leyes ni eventos que no
            salieron. Acá no hay recetas de producción.
          </p>
        </div>
        <GatedStoryDesk />
      </main>
    </div>
  );
}
