import { useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { askBuddy } from "@/lib/buddy";
import { useHarbor } from "@/lib/store";
import { HarborCard } from "@/components/harbor-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

export function BuddyChat({ suggestions }: { suggestions: string[] }) {
  const missionId = useHarbor((s) => s.missionId);
  const spoilers = useHarbor((s) => s.spoilers);
  const chat = useHarbor((s) => s.chat);
  const addChat = useHarbor((s) => s.addChat);
  const locale = useHarbor((s) => s.locale);
  const t = useT();
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
          locale: snapshot.locale,
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
    <HarborCard kicker={t.chat.kicker} title={t.chat.title} stamp="tankard">

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
              {t.chat.thinking}
            </li>
          ) : null}
        </ol>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t.chat.empty}
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
          Preguntale a Anno 1800 Buddy
        </label>
        <Input
          id="buddy-ask"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t.chat.placeholder}
          className="min-w-0 flex-1"
        />
        <Button type="submit" size="icon" disabled={pending || !draft.trim()} aria-label={t.chat.send}>
          <Send />
        </Button>
      </form>
    </HarborCard>
  );
}
