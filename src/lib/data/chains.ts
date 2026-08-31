export type Chain = {
  id: string;
  title: string;
  when: string;
  steps: { stamp: string; label: string }[];
  buddy: string;
  trap: string;
};

export const chains: Chain[] = [
  {
    id: "wood",
    title: "Madera",
    when: "Desde el arranque",
    steps: [
      { stamp: "cabin", label: "Leñador" },
      { stamp: "mill", label: "Aserradero" },
    ],
    buddy: "Uno y uno. Si faltan tablones, otro leñador. Si el aserradero bosteza, plantá árboles o tirale calle al almacén.",
    trap: "Cinco aserraderos y un bosque pelado.",
  },
  {
    id: "fish",
    title: "Pescado",
    when: "50 granjeros",
    steps: [{ stamp: "fish", label: "Pescadería" }],
    buddy: "Una en la costa cubre el primer pueblo. La fábrica acá es el mar.",
    trap: "Una fila de pescaderías tapando el puerto.",
  },
  {
    id: "clothes",
    title: "Ropa",
    when: "100 granjeros",
    steps: [
      { stamp: "sheep", label: "Ovejas" },
      { stamp: "yarn", label: "Telares" },
    ],
    buddy: "Una granja, unos telares. Si los telares duermen, faltan ovejas o calle. Si hay lana a montones, no pongas más granjas.",
    trap: "Subir a obreros antes de que circule la camisa.",
  },
  {
    id: "schnapps",
    title: "Schnapps",
    when: "100 granjeros · lujo",
    steps: [
      { stamp: "plant", label: "Papas" },
      { stamp: "barrel", label: "Destilería" },
    ],
    buddy: "Una chacra, una destilería. Es un aumento de impuesto, no supervivencia. Si no hay papa en la isla, comprala un rato.",
    trap: "Destilería primero, papas después. El edificio se duerme y cobra igual.",
  },
  {
    id: "workers",
    title: "Comida de obreros",
    when: "Hora de un aumento",
    steps: [
      { stamp: "pig", label: "Cerdos" },
      { stamp: "wheat", label: "Trigo → molino → pan" },
    ],
    buddy: "Salchicha y pan. Cada cadena es granja afuera, fábrica al borde de la ciudad. Si la fábrica zzz, falta el campo o la calle.",
    trap: "Armar las dos fábricas en el 10×10. Huelen y no entra el módulo.",
  },
  {
    id: "steel",
    title: "Acero",
    when: "Capítulo 2",
    steps: [
      { stamp: "pick", label: "Mina" },
      { stamp: "kiln", label: "Carbón" },
      { stamp: "fire", label: "Fundición" },
      { stamp: "anvil", label: "Acería" },
    ],
    buddy: "Una de cada. Mina en la roca, carbonera al bosque, las otras dos en una calle sucia. Si la acería duerme, mirá carbón, mineral y obreros — no pongas una segunda acería.",
    trap: "Una avenida de acerías para 60 personas. Eso es el ticker rojo.",
  },
  {
    id: "sails",
    title: "Velas",
    when: "Barcos",
    steps: [
      { stamp: "sheep", label: "Lana" },
      { stamp: "sail", label: "Velas" },
    ],
    buddy: "Si el velero pide tela, un taller de velas al lado de la lana que ya tenés. No fundes una isla nueva.",
    trap: "Una flota de tres velas y un telar.",
  },
];

export const chainRule =
  "Regla corta: 1 materia prima → 1 fábrica. Si la fábrica tiene zzz, falta campo, calle o gente. Si el almacén explota, sobra fábrica: pausala.";
