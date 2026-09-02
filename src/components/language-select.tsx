import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n";
import { showJournalTitleGate } from "@/lib/journal-titles";
import { useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

export function LanguageSelect({ className }: { className?: string }) {
  const locale = useHarbor((s) => s.locale);
  const setLocale = useHarbor((s) => s.setLocale);
  const t = useT();
  const gated = showJournalTitleGate(locale);

  return (
    <div className={cn("flex min-w-0 flex-col items-end gap-1", className)}>
      <label>
        <span className="sr-only">{t.language}</span>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          className="h-11 rounded-md bg-muted px-2 text-xs font-medium text-foreground"
        >
          {LOCALES.map((id) => (
            <option key={id} value={id}>
              {LOCALE_META[id].native}
            </option>
          ))}
        </select>
      </label>
      {gated ? (
        <p
          role="status"
          data-testid="journal-title-gate"
          className="max-w-[18rem] text-right text-[11px] leading-snug text-muted-foreground"
        >
          {t.journalTitles.gate}{" "}
          <button
            type="button"
            className="underline decoration-from-font underline-offset-2"
            onClick={() => setLocale("es")}
          >
            {t.journalTitles.useEs}
          </button>
        </p>
      ) : null}
    </div>
  );
}
