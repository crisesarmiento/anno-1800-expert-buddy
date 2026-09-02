/** Exact banner when chat cannot reach the radio. Do not paraphrase. */
export const RADIO_DOWN_COPY = "radio apagada — usá la lista";

export type CheckAskItem = {
  text: string;
  done: boolean;
};

export type MissionAskSource = {
  title?: string | null;
  body?: string | null;
  checks?: CheckAskItem[];
};

const FALLBACK_ASKS = [
  "¿Cuál es el próximo paso de la lista?",
  "¿Qué tacho primero?",
  "¿Qué dejo para después?",
];

export function clipAskFragment(text: string, max = 72): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function askForCheck(text: string): string {
  return `¿Cómo hago: ${clipAskFragment(text)}?`;
}

export function localSuggestedAsks(source: MissionAskSource, limit = 6): string[] {
  const cap = Math.min(6, Math.max(3, limit));
  const asks: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const text = raw.trim();
    if (!text || seen.has(text) || asks.length >= cap) return;
    seen.add(text);
    asks.push(text);
  };

  const title = source.title?.trim() ?? "";
  const body = source.body?.trim() ?? "";
  const pending = (source.checks ?? []).filter((item) => !item.done && item.text.trim());

  if (title) add(`¿Qué sigue en ${clipAskFragment(title, 48)}?`);
  for (const item of pending) add(askForCheck(item.text));
  if (body) add(`Sobre esto: ${clipAskFragment(body)}`);
  if (title) add(`¿Qué no me puedo olvidar de ${clipAskFragment(title, 40)}?`);
  for (const fallback of FALLBACK_ASKS) add(fallback);

  return asks.slice(0, cap);
}

export function matchCheckIndex(ask: string, checks: CheckAskItem[]): number | null {
  const target = ask.trim();
  if (!target) return null;
  let bestIndex: number | null = null;
  let bestLength = -1;
  for (let index = 0; index < checks.length; index += 1) {
    const item = checks[index];
    if (!item || item.done) continue;
    const generated = askForCheck(item.text);
    const text = item.text.trim();
    const hit = target === generated || target.includes(text);
    if (!hit || text.length <= bestLength) continue;
    bestIndex = index;
    bestLength = text.length;
  }
  return bestIndex;
}

export function radioIsUp(nav: { onLine?: boolean } | null | undefined = globalThis.navigator): boolean {
  return nav?.onLine === true;
}

export const CHECK_HIGHLIGHT_ID = (index: number) => `mission-check-${index}`;

export function highlightChecklistRow(index: number): void {
  if (typeof document === "undefined") return;
  const row = document.getElementById(CHECK_HIGHLIGHT_ID(index));
  if (!row) return;
  row.scrollIntoView({ block: "nearest" });
  if (typeof row.focus === "function") row.focus();
}
