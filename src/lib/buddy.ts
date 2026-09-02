import { createServerFn } from "@tanstack/react-start";
import {
  brokeSteps,
  buildingsById,
  chaptersById,
  lifeByChapter,
  missionsById,
  peopleForChapter,
} from "@/lib/data";
import { uiFor, type Locale } from "@/lib/i18n";
import { defaultPulse, pulseLine, type Pulse } from "@/lib/play";

export type BuddyInput = {
  question: string;
  missionId: string | null;
  spoilers: boolean;
  history: { role: "user" | "assistant"; content: string }[];
  pulse?: Pulse;
  checked?: number[];
  locale?: Locale | string | null;
  overbuildBrakeActive?: boolean;
};

function plainTalk(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(^|[^\w])\*(.*?)\*(?!\w)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}

function missionContext(
  missionId: string | null,
  spoilers: boolean,
  pulse: Pulse,
  checked: number[],
  locale?: Locale | string | null,
): string {
  if (!missionId) {
    return "Todavía no eligió misión. Ayudalo a ubicar dónde está. Si recién funda, Capítulo 1, Una chispa reavivada.";
  }
  const mission = missionsById[missionId];
  if (!mission) return "Misión desconocida. Preguntale dónde está.";
  const chapter = chaptersById[mission.chapterId];
  const buildingLines = mission.buildingIds
    .map((id) => buildingsById[id])
    .filter(Boolean)
    .map((building) => `- ${building.name}: ${building.buddy}`)
    .join("\n");
  const life = lifeByChapter[mission.chapterId];
  const folks = peopleForChapter(mission.chapterId)
    .map((person) => `- ${person.name} (${person.role}): ${person.buddy} HACÉ: ${person.do} NO: ${person.dont}`)
    .join("\n");
  const doneItems = mission.do.filter((_, index) => checked.includes(index));
  const pendingItems = mission.do.filter((_, index) => !checked.includes(index));
  const spoilerLine =
    spoilers && mission.spoilers
      ? `Spoilers permitidos: ${mission.spoilers}`
      : "Spoilers APAGADOS. No cuentes giros, traiciones ni el final.";
  return [
    pulseLine(pulse, locale),
    `Capítulo: ${chapter?.title ?? mission.chapterId} — ${chapter?.subtitle ?? ""}`,
    `Misión: ${mission.title} (${mission.kind})`,
    `Objetivo: ${mission.objective}`,
    `Por qué está calmo: ${mission.why}`,
    `Pendiente: ${pendingItems.join(" | ") || "nada, ya tachó la lista"}`,
    `Ya hizo: ${doneItems.join(" | ") || "nada todavía"}`,
    `Mejor no: ${mission.dont}`,
    `Trampa: ${mission.trap}`,
    `Si está saturado, una sola acción: ${mission.overwhelmed}`,
    buildingLines ? `Edificios:\n${buildingLines}` : "En este paso no hay edificios nuevos.",
    life
      ? `Plata de este capítulo: ${life.money.pulse}\nPara que suban las monedas: ${life.money.keepGreen.join(" | ")}\nTrampa de plata: ${life.money.trap}`
      : "",
    `Si las monedas están en rojo: ${brokeSteps.join(" | ")}`,
    life
      ? `Diplomacia: ${life.diplomacy.pulse}\nPaz: ${life.diplomacy.keepPeace.join(" | ")}\nTrampa diplomática: ${life.diplomacy.trap}`
      : "",
    folks ? `Gente:\n${folks}` : "",
    spoilerLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export const askBuddy = createServerFn({ method: "POST" })
  .validator((input: BuddyInput) => {
    const question = (input?.question ?? "").trim().slice(0, 800);
    if (!question) throw new Error("Decí algo primero.");
    return {
      question,
      missionId: input.missionId ?? null,
      spoilers: Boolean(input.spoilers),
      history: (input.history ?? []).slice(-8).map((turn) => ({
        role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(turn.content ?? "").slice(0, 1200),
      })),
      pulse: input.pulse ?? defaultPulse,
      checked: Array.isArray(input.checked) ? input.checked.slice(0, 12) : [],
      locale: input.locale ?? "es",
      overbuildBrakeActive: Boolean(input.overbuildBrakeActive),
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "El compañero está callado en este entorno. Probá más tarde.",
      };
    }

    const system = `${uiFor(data.locale).buddyLang}

Sos Harbor Buddy, sentado al lado de un amigo que juega la campaña de Anno 1800 en Windows, segundo monitor.

Voz: oraciones cortas. Cálido. Como el video de Taka del 10×10: modular, lindo, bastante bien. Sos un compañero de sillón, no una calculadora.

Ciudad:
- Manzanas 10×10: casas 3×3, un tile de jardín, calle alrededor, repetir.
- Granjas, minas y bosques afuera de las manzanas lindas.
- Un mercado cubre el primer pueblo. Un edificio público reemplaza una casa.
- Nunca subas de nivel a todos los granjeros. Ellos siguen laburando el campo.
- Si está saturado, UNA sola acción.

Plata (sin planilla):
- Casas con necesidades verdes pagan. Barras amarillas achican la casa y el impuesto.
- Lujo (schnapps, taberna) es un aumento, no una obligación.
- Ticker rojo: parar de construir, arreglar amarillo, vender de más a Kahina, borrar fábricas dormidas.
- No hace falta 100% de eficiencia. Un ticker verde alcanza para terminar la historia.

Diplomacia:
- Los personajes de campaña son vendedores y familia, no jefes para conquistar.
- Neutral con las otras compañías. Sin guerras, sin acciones, sin insultos en la primera partida.
- Kahina es el cajero. Blake es la Corona. Hacé los mandados chicos.
- La historia ya tiene villanos. No abras un segundo frente.

Nunca:
- Ratios, toneladas por minuto, diamantes perfectos, ni “óptimo”
- Vergüenza por ciudades feas
- Un plan de 20 pasos
- Spoilers si están apagados
- Markdown ni **negrita**

Siempre:
- Contestá primero la pregunta
- Atá el consejo a la misión Y a lo que él marcó que ve en su partida
- Preferí “alcanza para seguir la historia”
- Prosa simple. Oraciones cortas. Sin markdown.
${data.overbuildBrakeActive ? `
Freno de overbuild ACTIVO. No sugieras arrancar otra cadena de construcción, ni ahora ni “después” / “más tarde”. Las casas vacías no pagan. Esperá que se muden.
` : ""}
${missionContext(data.missionId, data.spoilers, data.pulse ?? defaultPulse, data.checked ?? [], data.locale)}`;

    const messages = [
      { role: "system" as const, content: system },
      ...data.history,
      { role: "user" as const, content: data.question },
    ];

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });
      if (!res.ok) {
        return { ok: false as const, error: "No llegó la radio del puerto." };
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = plainTalk(body.choices?.[0]?.message?.content?.trim() ?? "");
      if (!text) {
        return { ok: false as const, error: "Se quedó mirando el agua. Probá otra vez." };
      }
      return { ok: true as const, text };
    } catch {
      return { ok: false as const, error: "Estática. Preguntá de nuevo en un rato." };
    }
  });
