import { Link } from "@tanstack/react-router";
import { HarborCard } from "@/components/harbor-card";

export function ConnectGuide({ embedded = false }: { embedded?: boolean }) {
  return (
    <HarborCard
      kicker="Cómo conectar Anno"
      title="Descargá. Instalador. Diario."
      stamp="sail"
      hint="El sitio no puede meter archivos en Anno. Descargás, ejecutás el instalador, listo."
    >
      <ol className="flex flex-col gap-3 text-sm leading-relaxed">
        <li>
          <span className="font-medium text-foreground">1. </span>
          Instalar el mod → Descargar mod.zip (queda en Descargas).
        </li>
        <li>
          <span className="font-medium text-foreground">2. </span>
          Descargá el instalador (.bat o .ps1). Windows puede avisar: Más info → Ejecutar de todas
          formas. Es un copiado de carpeta, no un cheat.
        </li>
        <li>
          <span className="font-medium text-foreground">3. </span>
          El script pone el mod en{" "}
          <code className="text-primary">Documentos\Anno 1800\mods\harbor-buddy-telemetry</code>
        </li>
        <li>
          <span className="font-medium text-foreground">4. </span>
          Abrí Anno → Mods → activá Harbor Buddy Telemetry. Entrá a la campaña.
        </li>
        <li>
          <span className="font-medium text-foreground">5. </span>
          El mod escribe <code className="text-primary">Documentos\Anno 1800\harbor-live.json</code>.
          Acá: Partida en vivo → soltá ese archivo. Harbor Buddy salta solo.
        </li>
        <li>
          <span className="font-medium text-foreground">6. </span>
          Si el JSON viene vacío, usá “Escribí lo que ves en el diario” una vez. Si el instalador no
          encuentra Anno, copiá la carpeta a mano.
        </li>
      </ol>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Un watcher de Windows, más adelante, puede escribir el mismo{" "}
        <code className="text-primary">harbor-live.json</code> desde un .a7s. Harbor Buddy no abre el
        guardado acá.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Exportar dónde estoy: </span>
        baja el JSON de esta sesión para llevarlo a otra PC.
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
