import { useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { askBuddy } from "@/lib/buddy";
import { useHarbor } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BuddyChat({ suggestions }: { suggestions: string[] }) {
  const missionId = useHarbor((s) => s.missionId);
  const spoilers = useHarbor((s) => s.spoilers);
  const chat = useHarbor((s) => s.chat);
  const addChat = useHarbor((s) => s.addChat);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;
    setDraft("");
    setError(null);
    const history = useHarbor.getState().chat;
    const snapshot = useHarbor.getState();
    addChat({ role: "user", content: question });
    setPending(true);
    try {
      const result = await askBuddy({
        data: {
          question,
          missionId,
          spoilers,
          history,
          pulse: snapshot.pulse,
          checked: missionId ? (snapshot.checks[missionId] ?? []) : [],
        },
      });
      if (result.ok) {
        addChat({ role: "assistant", content: result.text });
      } else {
        setError(result.error);
      }
    } catch {
      setError("Estática en la radio. Probá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-card p-4 shadow-border sm:p-5">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Preguntale al compañero
          </p>
          <h2 className="font-display text-xl font-medium tracking-tight">Acá al lado tuyo</h2>
        </div>
      </header>

      {chat.length > 0 ? (
        <ol className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
          {chat.map((turn, index) => (
            <li
              key={`${turn.role}-${index}`}
              className={cn(
                "max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                turn.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-muted text-foreground",
              )}
            >
              {turn.content}
            </li>
          ))}
          {pending ? (
            <li className="flex items-center gap-2 self-start text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Pensando con la marea…
            </li>
          ) : null}
        </ol>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Preguntame como a un amigo en el sillón. Dónde va la taberna. Por qué se pusieron
          rojas las monedas. Si vale pelear con las otras compañías.
        </p>
      )}

      {suggestions.length > 0 && chat.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((ask) => (
            <button
              key={ask}
              type="button"
              onClick={() => send(ask)}
              className="h-11 rounded-md bg-muted px-3 text-left text-sm text-foreground transition-colors duration-150 hover:bg-secondary"
            >
              {ask}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <label className="sr-only" htmlFor="buddy-ask">
          Preguntale a Harbor Buddy
        </label>
        <input
          id="buddy-ask"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="¿Dónde pongo la taberna?"
          className="h-11 min-w-0 flex-1 rounded-md border-0 bg-muted px-3 text-sm text-foreground ring-1 ring-border placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="icon" disabled={pending || !draft.trim()} aria-label="Enviar">
          <Send />
        </Button>
      </form>
    </section>
  );
}
