import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { HudPasteAdvisor } from "@/components/hud-paste-advisor";
import { HarborCard } from "@/components/harbor-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askBuddy } from "@/lib/buddy";
import { missionsById } from "@/lib/data";
import {
  RADIO_DOWN_COPY,
  highlightChecklistRow,
  localSuggestedAsks,
  matchCheckIndex,
  radioIsUp,
  type CheckAskItem,
} from "@/lib/radio-down";
import { useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

function useRadioUp() {
  const [up, setUp] = useState(() => radioIsUp());
  useEffect(() => {
    const sync = () => setUp(radioIsUp());
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return up;
}

export function BuddyChat({ suggestions = [] }: { suggestions?: string[] }) {
  const radio = useRadioUp();
  const missionId = useHarbor((s) => s.missionId);
  const spoilers = useHarbor((s) => s.spoilers);
  const chat = useHarbor((s) => s.chat);
  const addChat = useHarbor((s) => s.addChat);
  const locale = useHarbor((s) => s.locale);
  const t = useT();
  const checks = useHarbor((s) => s.checks);
  const storedChecks = useHarbor((s) => s.checkItems);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localNote, setLocalNote] = useState("");

  const mission = missionId ? missionsById[missionId] : undefined;
  const checkItems: CheckAskItem[] = useMemo(() => {
    if (storedChecks.length > 0) return storedChecks;
    const done = missionId ? (checks[missionId] ?? []) : [];
    return (mission?.do ?? []).map((text, index) => ({ text, done: done.includes(index) }));
  }, [storedChecks, mission, missionId, checks]);

  const localAsks = useMemo(
    () =>
      localSuggestedAsks({
        title: mission?.title,
        body: mission?.objective,
        checks: checkItems,
      }),
    [mission?.title, mission?.objective, checkItems],
  );

  const onlineAsks = suggestions.length > 0 ? suggestions : (mission?.suggestedAsks ?? []);

  function takeLocalAsk(ask: string) {
    setLocalNote(ask);
    const index = matchCheckIndex(ask, checkItems);
    if (index != null) highlightChecklistRow(index);
  }

  async function send(text: string) {
    if (!radio) return;
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
          overbuildBrakeActive: snapshot.overbuildBrake.active,
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

  void locale;

  return (
    <HarborCard kicker={t.chat.kicker} title={t.chat.title} stamp="tankard">
      <HudPasteAdvisor />

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
          {radio && pending ? (
            <li className="flex items-center gap-2 self-start text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              {t.chat.thinking}
            </li>
          ) : null}
        </ol>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">{t.chat.empty}</p>
      )}

      {radio && onlineAsks.length > 0 && chat.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {onlineAsks.map((ask) => (
            <button
              key={ask}
              type="button"
              onClick={() => void send(ask)}
              className="h-11 rounded-md bg-muted px-3 text-left text-sm text-foreground transition-colors duration-150 hover:bg-secondary"
            >
              {ask}
            </button>
          ))}
        </div>
      ) : null}

      {radio && error ? <p className="text-sm text-destructive">{error}</p> : null}

      {radio ? (
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
      ) : (
        <div className="flex flex-col gap-3">
          <p role="status" data-radio-down="true" className="text-sm font-medium text-foreground">
            {RADIO_DOWN_COPY}
          </p>
          <div className="flex flex-wrap gap-2">
            {localAsks.map((ask) => (
              <button
                key={ask}
                type="button"
                onClick={() => takeLocalAsk(ask)}
                className="h-11 rounded-md bg-muted px-3 text-left text-sm text-foreground transition-colors duration-150 hover:bg-secondary"
              >
                {ask}
              </button>
            ))}
          </div>
          {localNote ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Nota local
              </span>
              <textarea
                readOnly
                value={localNote}
                className="min-h-16 rounded-md bg-muted px-3 py-2 text-sm text-foreground"
              />
            </label>
          ) : null}
        </div>
      )}
    </HarborCard>
  );
}
