export const LIVE_MSG = {
  notJson: "Eso no es un JSON. Buscá harbor-live.json.",
  saveFile: "Eso es un guardado de Anno, no el JSON. Exportá o usá el dump harbor-live.json.",
  tooBig: "El archivo es demasiado grande.",
  broken: "El archivo está roto. No es JSON válido.",
  schema: "Este JSON no es de Harbor Buddy (schema harbor-live-v1).",
  game: "Este archivo no es de Anno 1800.",
  quests: "Falta la lista de misiones (quests).",
  tooMany: "Demasiadas misiones en el archivo.",
  emptyTitle: "Hay una misión sin título.",
  longTitle: "Hay una misión con un título demasiado largo.",
  badState: "Hay una misión con un estado que no reconozco.",
  code: "El archivo trae código o enlaces. No lo abro.",
} as const;

export function liveOkLine(questCount: number, title: string) {
  return `Diario leído · ${questCount} misiones · ${title}`;
}

export function liveMissLine(titles: string[]) {
  const list = titles.filter(Boolean).slice(0, 6).join(" · ");
  return list ? `no matcheó · ${list}` : "no matcheó";
}
