import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { HarborCard } from "@/components/harbor-card";
import { Input } from "@/components/ui/input";
import { chaptersById, findMissions } from "@/lib/data";
import { useHarbor } from "@/lib/store";
import { cn } from "@/lib/utils";

export function MissionFinder() {
  const setMissionId = useHarbor((s) => s.setMissionId);
  const [query, setQuery] = useState("");
  const hits = useMemo(() => findMissions(query), [query]);

  return (
    <HarborCard
      kicker="¿En qué misión estoy?"
      title="Escribí lo que ves en el diario"
      stamp="bell"
      hint="En Anno, a la derecha o abajo: el pergamino de misiones. El título de la campaña es el que buscás. También sirve un pedazo: acero, schnapps, Ditch Water, Isabel."
    >
      <div className="rounded-md bg-muted p-4">
        <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <BookOpen className="size-3.5" />
          Dónde mirar en el juego
        </p>
        <ol className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed">
          <li>1. Icono de diario / misiones (pergamino).</li>
          <li>2. La entrada con el sello de historia, no un recado de Kahina.</li>
          <li>3. Copiá dos palabras del título y pegá acá.</li>
        </ol>
      </div>

      <label className="mt-4 flex flex-col gap-2">
        <span className="sr-only">Buscar misión</span>
        <span className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej: Evolución industrial, 50 granjeros, mina…"
            className="pl-10"
          />
        </span>
      </label>

      {query.trim().length >= 2 ? (
        hits.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1">
            {hits.map(({ mission }) => {
              const chapter = chaptersById[mission.chapterId];
              return (
                <li key={mission.id}>
                  <button
                    type="button"
                    onClick={() => setMissionId(mission.id)}
                    className={cn(
                      "flex min-h-11 w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-muted",
                    )}
                  >
                    <span className="text-sm font-medium">{mission.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {chapter?.title} · {mission.objective}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No la encuentro. Probá una palabra sola: acero, mercado, refugiados.
          </p>
        )
      ) : null}
    </HarborCard>
  );
}
