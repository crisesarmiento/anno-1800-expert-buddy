/** Sandbox is a play mode, never a second campaign home. */

export const SANDBOX_PATH = "/sandbox" as const;

export type PlayMode = "campaign" | "sandbox";

export type ModeTip = {
  id: string;
  text: string;
  mode: PlayMode;
  family: "strategy" | "production";
};

/** Production tips that live only in sandbox. Campaign notebook must not inherit them. */
export const SANDBOX_TIPS: ModeTip[] = [
  {
    id: "sb-grid",
    mode: "sandbox",
    family: "production",
    text: "El 10×10 sigue valiendo. Agrandá solo con monedas en verde.",
  },
  {
    id: "sb-taller",
    mode: "sandbox",
    family: "production",
    text: "El taller acá está suelto: abrilo cuando quieras, no hace falta Saturado.",
  },
];

export const SANDBOX_COPY = {
  chip: "Sandbox",
  kicker: "Modo sandbox",
  title: "Jugá suelto, no es la campaña",
  hint: "Tips de producción para partida libre. El cuaderno de la campaña no los hereda.",
  back: "Volver a la campaña",
  taller: "Ver taller",
  now: "Abrí el taller si te trabás en una cadena. No hay diario de misiones acá.",
} as const;

/** Fandom production buildings — always on in sandbox (taller is looser than campaign desk). */
export const SANDBOX_TALLER = {
  href: "https://anno1800.fandom.com/wiki/Production_buildings",
  label: SANDBOX_COPY.taller,
} as const;

export function isSandboxPath(pathname: string | undefined | null): boolean {
  if (!pathname) return false;
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  return path === SANDBOX_PATH;
}

export function playModeForPath(pathname: string | undefined | null): PlayMode {
  return isSandboxPath(pathname) ? "sandbox" : "campaign";
}

/** Campaign notebook (diary chips, stamps, mission do-list) rejects sandbox tips. */
export function campaignNotebookMayInherit(tip: { mode?: PlayMode }): boolean {
  return tip.mode !== "sandbox";
}

export function tipsForMode(tips: ModeTip[], mode: PlayMode): ModeTip[] {
  return tips.filter((tip) => (mode === "sandbox" ? tip.mode === "sandbox" : campaignNotebookMayInherit(tip)));
}

/** Sandbox always offers taller; campaign umbral stays strict elsewhere. */
export function sandboxTallerLink(): { href: string; label: string } {
  return { href: SANDBOX_TALLER.href, label: SANDBOX_TALLER.label };
}
