/**
 * Spanish good names for the Taller Ciudad panel.
 * Source: https://anno1800.fandom.com/wiki/Needs, https://anno1800.fandom.com/wiki/Production_chains
 */

import type { GoodId } from "./types.ts";

export const GOOD_NAME_ES: Record<GoodId, string> = {
  wood: "Madera",
  timber: "Tablones",
  fish: "Pescado",
  wool: "Lana",
  "work-clothes": "Ropa de trabajo",
  potato: "Papa",
  schnapps: "Schnapps",
  pigs: "Cerdos",
  sausages: "Salchichas",
  grain: "Trigo",
  flour: "Harina",
  bread: "Pan",
  clay: "Arcilla",
  bricks: "Ladrillos",
  iron: "Hierro",
  coal: "Carbón",
  steel: "Acero",
  "steel-beams": "Vigas de acero",
  tallow: "Sebo",
  soap: "Jabón",
  sails: "Velas",
  weapons: "Armas",
  plantains: "Plátanos",
  "fish-oil": "Aceite de pescado",
  "fried-plantains": "Plátanos fritos",
  "alpaca-wool": "Lana de alpaca",
  ponchos: "Ponchos",
  "sugar-cane": "Caña de azúcar",
  rum: "Ron",
  "canned-food": "Comida enlatada",
  "sewing-machines": "Máquinas de coser",
  "fur-coats": "Abrigos de piel",
  glasses: "Anteojos",
  coffee: "Café",
  beer: "Cerveza",
  tortillas: "Tortillas",
  "bowler-hats": "Bombines",
};

export function goodNameEs(id: GoodId): string {
  return GOOD_NAME_ES[id] ?? id;
}
