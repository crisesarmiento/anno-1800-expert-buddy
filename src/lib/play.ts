import { uiFor, type Locale } from "@/lib/i18n";

export type CoinsPulse = "unknown" | "up" | "down";
export type HousesPulse = "unknown" | "ok" | "yellow" | "empty";
export type LookingPulse = "unknown" | "city" | "quest" | "sea" | "other" | "stats";

export type Pulse = {
  coins: CoinsPulse;
  houses: HousesPulse;
  looking: LookingPulse;
};

export const defaultPulse: Pulse = {
  coins: "unknown",
  houses: "unknown",
  looking: "unknown",
};

export function pulseLine(pulse: Pulse, locale?: Locale | string | null): string {
  const t = uiFor(locale).pulse;
  const bits: string[] = [];
  if (pulse.coins === "up") bits.push(t.up);
  if (pulse.coins === "down") bits.push(t.down);
  if (pulse.houses === "ok") bits.push(t.ok);
  if (pulse.houses === "yellow") bits.push(t.yellow);
  if (pulse.houses === "empty") bits.push(t.empty);
  if (pulse.looking === "city") bits.push(t.city);
  if (pulse.looking === "quest") bits.push(t.quest);
  if (pulse.looking === "sea") bits.push(t.sea);
  if (pulse.looking === "other") bits.push(t.other);
  if (pulse.looking === "stats") bits.push(t.stats);
  if (bits.length === 0) return uiFor(locale).welcome.journalNote;
  return bits.join("; ");
}

export function nextMove(
  pulse: Pulse,
  doItems: string[],
  checked: number[],
  locale?: Locale | string | null,
): { title: string; detail: string } {
  const t = uiFor(locale).next;
  if (pulse.coins === "down" || pulse.looking === "stats") {
    return { title: t.coinsTitle, detail: t.coinsDetail };
  }
  if (pulse.houses === "empty") {
    return { title: t.emptyTitle, detail: t.emptyDetail };
  }
  if (pulse.houses === "yellow") {
    return { title: t.yellowTitle, detail: t.yellowDetail };
  }
  const next = doItems.findIndex((_, index) => !checked.includes(index));
  if (next >= 0) {
    return { title: t.nowTitle, detail: doItems[next] ?? t.nowFallback };
  }
  if (pulse.looking === "quest") {
    return { title: t.questTitle, detail: t.questDetail };
  }
  return { title: t.doneTitle, detail: t.doneDetail };
}
