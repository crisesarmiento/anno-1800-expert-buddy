import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Download } from "lucide-react";
import { HarborCard } from "@/components/harbor-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CHECKS = [
  "Anno cerrado o en menú principal",
  "Mods → Harbor Buddy Telemetry ON",
  "Jugar campaña",
  "Volver acá → Partida en vivo → soltar harbor-live.json (Documentos\\Anno 1800\\harbor-live.json)",
];

export function InstallPanel({ embedded = false }: { embedded?: boolean }) {
  const [done, setDone] = useState<number[]>([]);

  function toggle(index: number) {
    setDone((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  }

  return (
    <HarborCard
      kicker="Instalar el mod"
      title="Instalar Harbor Buddy en Anno"
      stamp="crate"
      hint="El sitio no puede meter archivos en Anno. Descargás, ejecutás el instalador, listo. Si Anno se cae, desactivá el mod y borra la carpeta vieja. El zip 0.2.0 no parchea el juego ni corre Lua."
    >
      <ol className="flex flex-col gap-4">
        <li className="rounded-md bg-muted p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            1. Descargar mod (.zip)
          </p>
          <p className="mt-2 text-sm leading-relaxed">Un clic. Sin cuenta. Dejá el zip en Descargas.</p>
          <Button asChild className="mt-3">
            <a href="/harbor-buddy-telemetry.zip" download="harbor-buddy-telemetry.zip">
              <Download className="size-3.5" />
              Descargar mod.zip
            </a>
          </Button>
        </li>

        <li className="rounded-md bg-muted p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            2. Descargar instalador Windows
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Copia el zip a Documentos\Anno 1800\mods. No pide administrador. No toca partidas.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Windows puede avisar. Elegí Más info → Ejecutar de todas formas. Es un copiado de
            carpeta, no un cheat.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild>
              <a href="/install-harbor-buddy.bat" download="install-harbor-buddy.bat">
                <Download className="size-3.5" />
                Instalador (.bat)
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href="/install-harbor-buddy.ps1" download="install-harbor-buddy.ps1">
                PowerShell (.ps1)
              </a>
            </Button>
          </div>
        </li>

        <li className="rounded-md bg-muted p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            3. Ya lo instalé
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {CHECKS.map((item, index) => {
              const on = done.includes(index);
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    className="flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm leading-snug hover:bg-secondary"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-4 shrink-0 place-items-center rounded-xs",
                        on ? "bg-ok text-ok-foreground" : "ring-1 ring-border",
                      )}
                    >
                      {on ? <Check className="size-2.5" /> : null}
                    </span>
                    <span className={on ? "line-through opacity-70" : undefined}>{item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </li>
      </ol>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Si el instalador no encuentra Anno, copiá a mano la carpeta del zip a{" "}
        <code className="text-foreground">Documentos\Anno 1800\mods\harbor-buddy-telemetry</code>.
        Tiene que haber un <code className="text-foreground">modinfo.json</code> justo ahí.
      </p>

      {embedded ? null : (
        <p className="mt-4">
          <Link to="/" className="inline-flex h-11 items-center text-sm text-primary">
            Volver al escritorio
          </Link>
        </p>
      )}
    </HarborCard>
  );
}
