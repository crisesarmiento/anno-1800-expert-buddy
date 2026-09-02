import { type Locale } from "./i18n.ts";

/**
 * Campaign / mission titles in campaign.ts are Spanish journal strings.
 * There is no en/it/de title table: do not invent or mix locale names.
 */
export const JOURNAL_TITLE_LOCALE: Locale = "es";

export function titlesMatchJournal(
  locale: Locale | string | null | undefined,
): boolean {
  return locale === JOURNAL_TITLE_LOCALE;
}

/** Always the Spanish journal string. Locale is ignored on purpose. */
export function campaignTitle(
  title: string,
  _locale?: Locale | string | null,
): string {
  return title;
}

export function showJournalTitleGate(
  locale: Locale | string | null | undefined,
): boolean {
  return !titlesMatchJournal(locale);
}
