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

export function pulseLine(pulse: Pulse): string {
  const bits: string[] = [];
  if (pulse.coins === "up") bits.push("las monedas suben");
  if (pulse.coins === "down") bits.push("las monedas están en rojo");
  if (pulse.houses === "ok") bits.push("las casas se ven contentas");
  if (pulse.houses === "yellow") bits.push("hay barras amarillas en las casas");
  if (pulse.houses === "empty") bits.push("hay casas vacías");
  if (pulse.looking === "city") bits.push("está en la ciudad");
  if (pulse.looking === "quest") bits.push("está siguiendo un recado");
  if (pulse.looking === "sea") bits.push("está en el mar");
  if (pulse.looking === "other") bits.push("está en otra isla");
  if (pulse.looking === "stats") bits.push("está mirando Estadísticas → Economía");
  if (bits.length === 0) return "Todavía no dijo cómo está la partida.";
  return `En su partida ahora: ${bits.join("; ")}.`;
}

export function nextMove(
  pulse: Pulse,
  doItems: string[],
  checked: number[],
): { title: string; detail: string } {
  if (pulse.coins === "down" || pulse.looking === "stats") {
    return {
      title: "La producción te está comiendo.",
      detail:
        "En Economía, si Edificios de producción cuestan casi tanto como Impuestos, pausá fábricas. Si Instituciones tienen zzz, borralas. Un pueblo chico no mantiene 20 chimeneas ni 3 cuarteles de bomberos.",
    };
  }
  if (pulse.houses === "empty") {
    return {
      title: "Las casas vacías no pagan.",
      detail:
        "Camino al mercado, y que el almacén alcance. Si no hay calle, no se muda nadie.",
    };
  }
  if (pulse.houses === "yellow") {
    return {
      title: "Primero las barras amarillas.",
      detail:
        "Una cadena a la vez. No hace falta una ciudad nueva. Cuando se pongan verdes, volvés a la misión.",
    };
  }
  const next = doItems.findIndex((_, index) => !checked.includes(index));
  if (next >= 0) {
    return {
      title: "Esto, ahora.",
      detail: doItems[next] ?? "Seguí el marcador de la misión.",
    };
  }
  if (pulse.looking === "quest") {
    return {
      title: "La ciudad puede esperar.",
      detail: "Seguí el marcador, entregá, y volvé. Si las barras están verdes, la isla se banca sola.",
    };
  }
  return {
    title: "Esta parte está.",
    detail: "Marcá la misión como lista, o preguntame lo que te traba.",
  };
}
