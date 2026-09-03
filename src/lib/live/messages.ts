import { fill, uiFor } from "../i18n.ts";

export const LIVE_MSG = uiFor("es").liveMsg;

export function liveOkLine(questCount: number, title: string, locale?: string | null) {
  return fill(uiFor(locale).liveMsg.ok, questCount, title);
}

export function liveOkSaveLine(title: string, locale?: string | null) {
  return fill(uiFor(locale).liveMsg.okSave, title);
}

export function liveMissLine(titles: string[], locale?: string | null) {
  const list = titles.filter(Boolean).slice(0, 6).join(" · ");
  return list ? fill(uiFor(locale).liveMsg.miss, list) : uiFor(locale).liveMsg.missEmpty;
}
