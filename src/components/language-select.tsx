import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n";
import { useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";

export function LanguageSelect({ className }: { className?: string }) {
  const locale = useHarbor((s) => s.locale);
  const setLocale = useHarbor((s) => s.setLocale);
  const t = useT();

  return (
    <label className={className}>
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
  );
}
