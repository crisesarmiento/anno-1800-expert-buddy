export type HarborPerson = {
  id: string;
  name: string;
  role: string;
  buddy: string;
  do: string;
  dont: string;
};

export type ChapterLife = {
  chapterId: string;
  money: {
    pulse: string;
    keepGreen: string[];
    trap: string;
  };
  diplomacy: {
    pulse: string;
    keepPeace: string[];
    trap: string;
  };
};

export const brokeSteps = [
  "Pará de construir. Nada nuevo hasta que el Balance deje de ser rojo.",
  "Estadísticas → Economía. Si Edificios de producción cuestan casi tanto como Impuestos, tenés demasiadas fábricas para la gente que vive.",
  "Instituciones con zzz están cobrando y no laburan. Bomberos: una estación. Las otras, borralas.",
  "Pausá o tirá fábricas dormidas. Vendé el sobrante a Kahina. El impuesto sube con casas llenas, no con más chimeneas.",
];

export const people: HarborPerson[] = [
  {
    id: "kahina",
    name: "Madame Kahina",
    role: "Comerciante, tu banco de emergencia",
    buddy: "Te compra casi cualquier cosa y vende el bien que te olvidaste de hacer. Cuando bajen las monedas, andá en barco con cajones de más. Eso es diplomacia hecha plata.",
    do: "Vendé el sobrante. Comprá un bien que te falta en vez de fundar toda una cadena nueva.",
    dont: "No le hundás los barcos ni la ignores para siempre. Es el cajero más amable del Viejo Mundo.",
  },
  {
    id: "blake",
    name: "Sir Archibald Blake",
    role: "La Corona",
    buddy: "Te tira laburos de historia y te compra barcos. Quedate educado, entregá lo que pide, y usalo cuando precisás un casco que no te pinta fabricar.",
    do: "Cumplí sus pedidos chicos. Vendele la goleta / las cañoneras que nombra la misión.",
    dont: "No agarres pelea con la Corona. No le ganás a la marina de la campaña.",
  },
  {
    id: "hannah",
    name: "Hannah Goode",
    role: "Tu hermana, la brújula de las misiones",
    buddy: "Si Hannah lo marcó, hacélo. Así te enseña la campaña el próximo edificio. Tratá sus avisos como la lista de la sesión, no como contenido extra opcional.",
    do: "Seguí en orden sus laburos de construir y limpiar ruinas.",
    dont: "No te vayas a optimizar números mientras su misión está en el registro.",
  },
  {
    id: "edvard",
    name: "Edvard Goode",
    role: "Familia, y un pesado",
    buddy: "Te va a pedir cajones chicos — Schnapps, ropa, velas. Entregá las cuatro toneladas. Sale más barato que un rencor, y la historia precisa la entrega.",
    do: "Dejá unos cajones de más en el almacén así sus listas de compras salen de una.",
    dont: "No reconstruyas la industria por cuatro toneladas, y no le declares la guerra.",
  },
  {
    id: "eli",
    name: "Eli Bleakworth",
    role: "Isla prisión",
    buddy: "Vas a ir por fianzas, expertos y cargas raras. Pagá la tarifa, levantá a la persona, andáte. Es un lugar, no un rival para vencer.",
    do: "Llevá la plata que nombra la misión. Hablá, andáte.",
    dont: "No labures su isla ni arranques una guerra de prisión.",
  },
  {
    id: "isabel",
    name: "Isabel Sarmento",
    role: "Aliada del Nuevo Mundo",
    buddy: "El capítulo 3 es su isla y su gente. Alojá a quien manda. Sus pedidos son la misión, no un acertijo para optimizar.",
    do: "Dejá camas libres en La Isla para que los refugiados puedan bajar de verdad.",
    dont: "No mudes la capital a la selva y dejes tirado el Viejo Mundo.",
  },
  {
    id: "competitors",
    name: "Otras compañías",
    role: "Rivales de la máquina en el mapa",
    buddy: "Van a agarrar islas. Dejalas. La campaña ya tiene villanos. Una guerra en la primera partida es cómo se te ponen rojas las monedas y la historia espera.",
    do: "Asentate en otra isla. Quedate neutral. Comerciá si quieren.",
    dont: "No compres acciones, no insultes ni declares guerra en una primera campaña. Eso es ajedrez.",
  },
];

export const peopleById: Record<string, HarborPerson> = Object.fromEntries(
  people.map((person) => [person.id, person]),
);

const life: ChapterLife[] = [
  {
    chapterId: "prologue",
    money: {
      pulse: "Todavía no hay economía. No te hagas la cabeza con las monedas.",
      keepGreen: ["Seguí el tutorial del pescado.", "El libro del Viejo Mundo arranca en el capítulo 1."],
      trap: "Armar una estrategia de impuestos en la playa.",
    },
    diplomacy: {
      pulse: "Nadie a quien impresionar. Subite al vapor.",
      keepPeace: ["Terminá los tres tiros.", "El capítulo 1 es donde aparece la gente."],
      trap: "Ninguna. Saludá al agua.",
    },
  },
  {
    chapterId: "ch1",
    money: {
      pulse: "Las casas te pagan. Las casas vacías y los edificios parados te cobran. Necesidades en verde le ganan a una ciudad más grande.",
      keepGreen: [
        "Mercado + pescado + ropa hacen que se muden granjeros. La gente en las casas es el impuesto.",
        "Schnapps y la taberna son lujo — opcionales para sobrevivir, excelentes para las monedas. Ese es tu primer aumento.",
        "Si el saldo se pone rojo: Estadísticas → Economía. Producción más cara que impuestos = demasiadas fábricas. Instituciones con zzz = cobrando al pedo.",
        "No subas a todos los granjeros. Se traban las granjas, baja el ingreso, y igual pagás las casas de ladrillo.",
      ],
      trap: "Diez casas más ‘para después’ mientras pescado y ropa ya están amarillos. Así arranca la primera quiebra.",
    },
    diplomacy: {
      pulse: "Sé la compañía nueva y educada. Los personajes de la historia son vendedores, no jefes para vencer.",
      keepPeace: [
        "Hacé los laburos de Hannah. Entregá las listas de cuatro toneladas de Edvard.",
        "Kahina te compra el sobrante. Usala antes de fundar una segunda isla de producción.",
        "Ignorá a las compañías rivales que reclaman otras islas. Agarrá una libre.",
        "No declares guerra, no compres acciones ni insultes a nadie en una primera partida.",
      ],
      trap: "Hundir a un comerciante porque pasó cerca. Le acabás de pegar a tu banco.",
    },
  },
  {
    chapterId: "ch2",
    money: {
      pulse: "El acero es una cuenta, no un regalo. Armá los cuatro edificios que pide la misión, y cortá las compras industriales.",
      keepGreen: [
        "Mantené corriendo los impuestos de granjeros mientras los obreros laburan la calle de acero.",
        "Blake te va a comprar barcos — esa misión también es una inyección de plata. No desarmes tu último comerciante para completarla.",
        "Una fábrica de armas. Militar de más es mantenimiento sin premio de campaña todavía.",
        "Si bajan las monedas, vendé acero o ropa de más; no fundes un imperio de carbón esta noche.",
      ],
      trap: "Una acería completa más una flota nueva mientras las necesidades de granjeros se ponen amarillas en casa.",
    },
    diplomacy: {
      pulse: "Quedate amigo de la Corona. El viaje por mar es una expedición, no una guerra.",
      keepPeace: [
        "Vendele a Blake lo que listó. Quedate bien con él.",
        "El faro de Kahina es una parada de historia — y también un negocio. Cargá cajones de más si las monedas están flacas.",
        "Equipá la expedición con educación: comida, ron, marineros extra. Las opciones cautas cuidan el barco.",
        "Todavía nada de guerras con otras compañías. Estás por agrandar un segundo mapa.",
      ],
      trap: "Arrancar una toma de acciones porque se te desbloqueó el botón. La campaña no precisa un monopolio.",
    },
  },
  {
    chapterId: "ch3",
    money: {
      pulse: "Dos mundos, dos mantenimientos. El Viejo Mundo tiene que quedarse en verde mientras jugás a lo tropical.",
      keepGreen: [
        "Antes de cruzar, sobrecargá en casa pescado, ropa, Schnapps y comida de obreros.",
        "La Isla solo precisa la gente que nombra la misión — 50, después 300, después 600. No una capital.",
        "Si las monedas del Viejo Mundo se ponen rojas, pausá la selva, arreglá las necesidades amarillas, y volvé.",
        "Comprá un bien tropical que te falte a un comerciante, antes que una tercera plantación que no vas a poder laburar.",
      ],
      trap: "Quedarte una hora mirando La Isla mientras se congelan las granjas de casa y el libro sangra.",
    },
    diplomacy: {
      pulse: "Isabel es el capítulo. Rivales y saboteadores son historia, no una excusa para conquistar el mapa.",
      keepPeace: [
        "Alojá a quien manda. Dejá camas de más para que anden las entregas.",
        "Armá la única comisaría. Cazá a la gente marcada. No ocupes cada isla de la máquina.",
        "Llevá dos fragatas como pide — eso es defensa, no una flota colonial.",
        "Los comerciantes del Viejo Mundo siguen importando. No insultes a Kahina desde otro hemisferio.",
      ],
      trap: "Declarar la guerra en el Nuevo Mundo porque alguien se asentó en una isla linda. Los refugiados no pueden bajar en una zona de guerra que arrancaste vos.",
    },
  },
  {
    chapterId: "ch4",
    money: {
      pulse: "La guerra se come las monedas. Repará barcos en vez de reemplazarlos. La ciudad que tenés alcanza.",
      keepGreen: [
        "Dejá la producción corriendo de fondo. Una pausa en la pelea para arreglar necesidades amarillas está permitida.",
        "Usá la grúa de reparación. Una fragata abollada sale más barata que una nueva.",
        "No arranques palacios de inversores ni juergas de adornos a mitad del final.",
        "Vendé armas o ron que te sobren si el saldo se pone rojo entre batallas.",
      ],
      trap: "Reconstruir el horizonte porque estás nervioso. La misión quiere cañones en Ditch Water, no un código de impuestos nuevo.",
    },
    diplomacy: {
      pulse: "La historia es la guerra. El resto puede esperar.",
      keepPeace: [
        "Entregá el contrato. Tocá el buque insignia. Peleá solo los barcos Pyrphorian marcados.",
        "No abras un segundo frente contra una compañía que te cae mal.",
        "Mantené a Blake y a la Corona de tu lado — ya hiciste la tarea.",
        "Después de la batalla, podés ser un vecino más copado. No durante.",
      ],
      trap: "Perseguir a un comerciante rival por el mapa mientras arde el puerto.",
    },
  },
  {
    chapterId: "end",
    money: {
      pulse: "Los ingenieros son comedores caros. Crecélos como creciste granjeros: solo los de más, una necesidad a la vez.",
      keepGreen: [
        "Dejá obreros y granjeros en su lugar. Siguen bancando y laburando la isla.",
        "Subí unos cuantos, mirá el saldo, y recién ahí subí unos cuantos más.",
        "Si caen las monedas, frená las mejoras y arreglá la necesidad amarilla nueva. No plantes cincuenta casas de ingenieros.",
        "Ya ganaste la trama. Ir lento está permitido.",
      ],
      trap: "Subir a todos a ingenieros y mirar cómo se mueren juntas las granjas, las fábricas y el libro.",
    },
    diplomacy: {
      pulse: "Sé un vecino quieto. El mapa es para disfrutarlo, no para limpiarlo.",
      keepPeace: [
        "Comerciá con quien todavía te banque.",
        "Salteate las tomas de control salvo que de verdad quieras ese modo libre ahora.",
        "Kahina sigue comprando el sobrante. Los viejos hábitos pueden quedarse.",
      ],
      trap: "Una guerra mundial de vuelta olímpica. Tus 10×10 no pidieron esto.",
    },
  },
];

export const lifeByChapter: Record<string, ChapterLife> = Object.fromEntries(
  life.map((item) => [item.chapterId, item]),
);

export const lifeAsks: Record<string, string[]> = {
  prologue: ["¿Qué importa después del prólogo?"],
  ch1: ["Se me pusieron rojas las monedas", "¿Le vendo a Kahina?", "¿Peleo con las otras compañías?"],
  ch2: ["El acero me está drenando", "¿Ya vale la pena la guerra?", "¿Qué llevo a la expedición?"],
  ch3: ["El Viejo Mundo se está fundiendo", "¿Puedo ignorar a las otras compañías?", "Isabel pide demasiado"],
  ch4: ["Reemplazar barcos me sale carísimo", "¿Contra quién tengo que pelear de verdad?"],
  end: ["Los ingenieros me arruinaron el ingreso", "¿Ahora puedo quedarme en paz?"],
};

export function peopleForChapter(chapterId: string): HarborPerson[] {
  switch (chapterId) {
    case "prologue":
      return [];
    case "ch1":
      return pick(["hannah", "edvard", "kahina", "blake", "competitors"]);
    case "ch2":
      return pick(["blake", "kahina", "eli", "hannah", "competitors"]);
    case "ch3":
      return pick(["isabel", "hannah", "kahina", "competitors"]);
    case "ch4":
      return pick(["blake", "hannah", "edvard", "competitors"]);
    case "end":
      return pick(["kahina", "competitors"]);
    default:
      return pick(["kahina", "competitors"]);
  }
}

function pick(ids: string[]): HarborPerson[] {
  return ids.map((id) => peopleById[id]).filter((person): person is HarborPerson => Boolean(person));
}
