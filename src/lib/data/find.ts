import { chaptersById, missions, missionsById } from "./campaign.ts";
import type { Mission } from "./types.ts";

const EXTRA: Record<string, string> = {
  "pro-blast": "prologue dynamite fish a new world a lo grande faro cardumen",
  "ch1-spark": "a spark rekindled mercado 10 casas 50 granjeros madera leñador aserradero inapetente chimeneas ritmo produccion",
  "ch1-apple": "the apple falls not far from the tree ruinas escombros hannah",
  "ch1-loyalty": "loyalty repaid almacén warehouse bomberos estacion zzz",
  "ch1-ditchwater": "dull as ditchwater ditch water visita isla explorar asentar colonizar",
  "ch1-earth": "take from the earth fertilidad papa planos blueprints tablones aserraderos stampiar",
  "ch1-toast": "toast to the future schnapps taberna pub destilería subir clase ritmo",
  "ch1-family": "family bonds edvard cajas planos stampiar",
  "ch1-blacksheep": "black sheep of the family granja ovejas telares ropa",
  "ch1-polish": "one final polish atractivo",
  "ch1-pleas": "pleas of a poor relation pariente",
  "ch1-hardtimes": "hard times bomberos zzz rojo saldo",
  "ch1-press": "freedom and the free press periodico prensa rojo saldo construir",
  "ch1-debt": "the debt is official deuda esperar rojo saldo caja explorar asentar inapetente",
  "ch1-raise": "time for a raise obreros workers school sausage bread soap",
  "ch1-ashes": "building from the ashes cenizas",
  "ch1-heroes": "working class heroes obreros 150",
  "ch1-lackey": "edvard's lackey lacayo",
  "ch1-scapegoats": "scapegoats chivos explorar asentar colonizar barco inapetente",
  "ch1-business": "none of your business curiosity no es asunto",
  "ch1-photograph": "hot off the press imprenta foto",
  "ch2-bulk": "request in bulk pedido por mayor",
  "ch2-iron": "any old iron hierro yacimiento",
  "ch2-mountains": "moving mountains montañas",
  "ch2-expert": "demolition expert experto prisión eli fianza",
  "ch2-industrial": "industrial evolution acero mina carbonera fundición acería steel",
  "ch2-warfare": "warfare guerra armas",
  "ch2-smuggler": "follow a smuggler contrabandista",
  "ch2-pyrphorians": "the pyrphorians",
  "ch2-newworld": "expedition to the new world nuevo mundo expedición",
  "ch3-hand": "one good turn una mano lava",
  "ch3-rebels": "a home for the rebels rebeldes jornaleros",
  "ch3-rescue": "rescue and refuge rescate",
  "ch3-bastion": "a bastion for all bastión",
  "ch3-heat": "heatwave ola de calor",
  "ch3-lookout": "a lookout post vigilancia",
  "ch3-wolves": "wolves in alpaca clothing lobos alpaca",
  "ch3-release": "release and relief soltar",
  "ch3-defense": "best defense good offense defensa ataque",
  "ch3-refugees": "refugees welcome refugiados",
  "ch3-evac": "emergency evacuation evacuación",
  "ch3-wildfire": "wildfire to order incendio",
  "ch3-ransom": "pay no ransom rescate",
  "ch3-lead": "follow the trail pista",
  "ch4-confrontation": "the confrontation confrontación",
  "ch4-justitia": "justitia",
  "ch4-come": "come what may pase lo que pase",
  "ch4-noblesse": "noblesse oblige",
  "ch4-prosecution": "prosecution acusación",
  "ch4-battle": "final battle batalla final",
  "ch4-flame": "the first flame primera llama",
  "end-dream": "a dream of our own ingenieros engineers",
};

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function findMissions(query: string): { mission: Mission; why: string; score: number }[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];
  const scored = missions
    .map((mission) => {
      const chapter = chaptersById[mission.chapterId];
      const title = fold(mission.title);
      const hay = fold(
        [
          mission.title,
          mission.objective,
          mission.do.join(" "),
          chapter?.title ?? "",
          EXTRA[mission.id] ?? "",
        ].join(" "),
      );
      let score = 0;
      if (title === q) score += 12;
      else if (title.includes(q) || q.includes(title)) score += 8;
      if (hay.includes(q)) score += 3;
      q.split(/\s+/).forEach((word) => {
        if (word.length > 2 && hay.includes(word)) score += 1;
      });
      return { mission, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  return scored.map(({ mission, score }) => ({
    mission,
    why: mission.objective,
    score,
  }));
}

export function missionById(id: string) {
  return missionsById[id];
}
