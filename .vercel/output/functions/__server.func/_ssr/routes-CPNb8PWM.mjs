import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as defaultPulse, c as lifeByChapter, d as nextMove, f as peopleForChapter, i as chaptersById, l as missions, n as buildingsById, o as getMissionIndex, r as chapters, s as lifeAsks, t as brokeSteps, u as missionsById } from "./play-CGDHSrxw.mjs";
import { a as RotateCcw, c as Handshake, d as ChevronRight, f as Check, i as Search, l as Compass, m as Anchor, n as Ship, o as Pause, p as BookOpen, r as Send, s as LoaderCircle, u as Coins } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CPNb8PWM.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var layoutsById = Object.fromEntries([
	{
		id: "block-10",
		title: "El sello 10×10",
		hint: "Casas de tres por tres, jardines de un casillero, calle alrededor. Repetí. Esa es toda la ciudad.",
		steps: [
			"Agarrá una calle y dibujá un cuadrado de 10 casilleros. Eso es un bloque.",
			"Tirá casas de granjeros 3×3 adentro, dejando un casillero de hueco entre ellas.",
			"Plantá un árbol en los huecos si te pinta. Se ve vivo. No es obligatorio.",
			"Copiá el bloque al lado. Las calles ya se tocan, así que conectan.",
			"Cuando aparezca un edificio público, reemplazá una casa de un bloque. No inventes un barrio nuevo."
		],
		grid: [
			"RRRRRRRRRR",
			"RHHHGHHHGR",
			"RHHHGHHHGR",
			"RHHHGHHHGR",
			"RGGGGGGGGR",
			"RHHHGHHHGR",
			"RHHHGHHHGR",
			"RHHHGHHHGR",
			"RGGGGGGGGR",
			"RRRRRRRRRR"
		]
	},
	{
		id: "first-city",
		title: "Primera ciudad, desde el puerto",
		hint: "El puesto comercial ya está. Crecé tierra adentro en 10×10. El mercado se sienta cerca de los primeros bloques — el alcance es enorme.",
		steps: [
			"Primero madera: leñador en los árboles, aserradero al lado, los dos con calle al almacén.",
			"Poné el mercado cerca del puerto, no en un ‘centro perfecto’ del futuro.",
			"Plantá dos o tres bloques 10×10 de casas tierra adentro desde el mercado.",
			"Dejá la costa casi libre. La van a querer las pescaderías y, más adelante, la arena.",
			"Las granjas van en fertilidad abierta, lejos de los bloques lindos."
		],
		grid: [
			"WWWWWWWWWWWW",
			"WWWWWWWWWWWW",
			"RRRRRRRRRR..",
			"RMMMMMMHHHGR",
			"RMMMMMMHHHGR",
			"RMMMMMMHHHGR",
			"RMMMMMMHHHGR",
			"RMMMMMMHHHGR",
			"RHHHHGGGGGRR",
			"RHHHGTHHHGR.",
			"RHHHGTHHHGR.",
			"RGGGGTHHHGR.",
			"RRRRRRRRRRR.",
			"TTTT.FFFFFF."
		]
	},
	{
		id: "pub-block",
		title: "Taberna en un bloque",
		hint: "La taberna reemplaza una casa. El mismo 10×10. Sin plaza especial. La cobertura es generosa — no vas a precisar muchas.",
		steps: [
			"Elegí un 10×10 que ya tenga casas alrededor.",
			"Borrá una casa (o usá un hueco) y tirás la taberna.",
			"La calle ya envuelve el bloque, así que queda conectada.",
			"Una taberna cubre el primer pueblo. Armá una segunda recién cuando las casas del borde se vean tristes."
		],
		grid: [
			"RRRRRRRRRR",
			"RHHHGHHHGR",
			"RHHHGHHHGR",
			"RHHHGHHHGR",
			"RGGPPPPGGR",
			"RHHPPPPHHR",
			"RHHPPPPHHR",
			"RHHHGHHHGR",
			"RGGGGGGGGR",
			"RRRRRRRRRR"
		]
	},
	{
		id: "fishery-coast",
		title: "Pescadería en el agua",
		hint: "Costera. Calle a un almacén. Una alcanza al principio.",
		steps: [
			"Buscá un tramo derecho de costa que no tape la entrada del puerto.",
			"Tirá la pescadería para que toque el agua.",
			"Calle al puesto comercial / almacén.",
			"Ignorá el resto de la orilla. Podés sumar otra después si las casas se quejan."
		],
		grid: [
			"WWWWWWWWWW",
			"WWWWWWWWWW",
			"..IIII....",
			"..IIII....",
			"RRRRRRRRRR",
			"RHHHGHHHGR",
			"RHHHGHHHGR",
			"RHHHGHHHGR",
			"RGGGGGGGGR",
			"RRRRRRRRRR"
		]
	},
	{
		id: "farms-outside",
		title: "Las granjas se quedan afuera",
		hint: "Papa, oveja, trigo, cerdos — nunca adentro del 10×10. Módulos alrededor del edificio de la granja. Calle de vuelta a un almacén.",
		steps: [
			"Buscá el ícono de fertilidad en la isla (papa, trigo, lúpulo más adelante).",
			"Poné el edificio de la granja, y pintá módulos alrededor hasta que esté contento.",
			"Dejá una calle columna hacia el almacén. No armes una grilla de campos como si fuera ciudad.",
			"El edificio de proceso (destilería, telares) puede ir al borde de la ciudad, no en los campos."
		],
		grid: [
			"T..FFFFFFFF",
			"T..FFFFFFFF",
			"T..FFFFFFFF",
			"RRRRRRRRRRR",
			"...IIIRHHHR",
			"...IIIRHHHR",
			"...IIIRHHHR",
			"RRRRRRRRRRR",
			"RHHHGHHHGR.",
			"RGGGGGGGGR."
		]
	},
	{
		id: "steel-row",
		title: "Acero como una callecita industrial",
		hint: "Mina en la montaña. Carbonera cerca de los árboles. Fundición y acería en fila, en una calle. El humo, lejos de las casas.",
		steps: [
			"La mina de hierro se sienta en el yacimiento. La montaña no se mueve, así que la cadena va hasta ella.",
			"Carbonera cerca de un bosque que estés dispuesto a cosechar.",
			"Fundición y después acería a lo largo de una calle, almacén a mano.",
			"No entrelaces esto con casas 10×10. Al atractivo le cae mal el humo, y después reacomodás menos."
		],
		grid: [
			"TTT.........",
			"TIIII.IIII..",
			"TIIII.IIII..",
			"RRRRRRRRRRRR",
			".IIII.IIII..",
			".IIII.IIII..",
			"RRRRRRRRRRRR",
			"HHHH.GG.HHHH",
			"HHHH.GG.HHHH",
			"HHHH.GG.HHHH"
		]
	}
].map((layout) => [layout.id, layout]));
var EXTRA = {
	"pro-blast": "prologue dynamite fish a new world a lo grande faro cardumen",
	"ch1-spark": "a spark rekindled mercado 10 casas 50 granjeros madera leñador aserradero",
	"ch1-apple": "the apple falls not far from the tree ruinas escombros hannah",
	"ch1-loyalty": "loyalty repaid almacén warehouse",
	"ch1-ditchwater": "dull as ditchwater ditch water visita isla",
	"ch1-earth": "take from the earth fertilidad papa",
	"ch1-toast": "toast to the future schnapps taberna pub destilería",
	"ch1-family": "family bonds edvard cajas",
	"ch1-blacksheep": "black sheep of the family granja ovejas telares ropa",
	"ch1-polish": "one final polish atractivo",
	"ch1-pleas": "pleas of a poor relation pariente",
	"ch1-hardtimes": "hard times",
	"ch1-press": "freedom and the free press periodico prensa",
	"ch1-debt": "the debt is official deuda esperar",
	"ch1-raise": "time for a raise obreros workers school sausage bread soap",
	"ch1-ashes": "building from the ashes cenizas",
	"ch1-heroes": "working class heroes obreros 150",
	"ch1-lackey": "edvard's lackey lacayo",
	"ch1-scapegoats": "scapegoats chivos",
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
	"end-dream": "a dream of our own ingenieros engineers"
};
function fold(value) {
	return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function findMissions(query) {
	const q = fold(query.trim());
	if (q.length < 2) return [];
	return missions.map((mission) => {
		const chapter = chaptersById[mission.chapterId];
		const hay = fold([
			mission.title,
			mission.objective,
			mission.do.join(" "),
			chapter?.title ?? "",
			EXTRA[mission.id] ?? ""
		].join(" "));
		let score = 0;
		if (fold(mission.title).includes(q)) score += 8;
		if (hay.includes(q)) score += 3;
		q.split(/\s+/).forEach((word) => {
			if (word.length > 2 && hay.includes(word)) score += 1;
		});
		return {
			mission,
			score
		};
	}).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(({ mission }) => ({
		mission,
		why: mission.objective
	}));
}
var chains = [
	{
		id: "wood",
		title: "Madera",
		when: "Desde el arranque",
		steps: [{
			stamp: "cabin",
			label: "Leñador"
		}, {
			stamp: "mill",
			label: "Aserradero"
		}],
		buddy: "Uno y uno. Si faltan tablones, otro leñador. Si el aserradero bosteza, plantá árboles o tirale calle al almacén.",
		trap: "Cinco aserraderos y un bosque pelado."
	},
	{
		id: "fish",
		title: "Pescado",
		when: "50 granjeros",
		steps: [{
			stamp: "fish",
			label: "Pescadería"
		}],
		buddy: "Una en la costa cubre el primer pueblo. La fábrica acá es el mar.",
		trap: "Una fila de pescaderías tapando el puerto."
	},
	{
		id: "clothes",
		title: "Ropa",
		when: "100 granjeros",
		steps: [{
			stamp: "sheep",
			label: "Ovejas"
		}, {
			stamp: "yarn",
			label: "Telares"
		}],
		buddy: "Una granja, unos telares. Si los telares duermen, faltan ovejas o calle. Si hay lana a montones, no pongas más granjas.",
		trap: "Subir a obreros antes de que circule la camisa."
	},
	{
		id: "schnapps",
		title: "Schnapps",
		when: "100 granjeros · lujo",
		steps: [{
			stamp: "plant",
			label: "Papas"
		}, {
			stamp: "barrel",
			label: "Destilería"
		}],
		buddy: "Una chacra, una destilería. Es un aumento de impuesto, no supervivencia. Si no hay papa en la isla, comprala un rato.",
		trap: "Destilería primero, papas después. El edificio se duerme y cobra igual."
	},
	{
		id: "workers",
		title: "Comida de obreros",
		when: "Hora de un aumento",
		steps: [{
			stamp: "pig",
			label: "Cerdos"
		}, {
			stamp: "wheat",
			label: "Trigo → molino → pan"
		}],
		buddy: "Salchicha y pan. Cada cadena es granja afuera, fábrica al borde de la ciudad. Si la fábrica zzz, falta el campo o la calle.",
		trap: "Armar las dos fábricas en el 10×10. Huelen y no entra el módulo."
	},
	{
		id: "steel",
		title: "Acero",
		when: "Capítulo 2",
		steps: [
			{
				stamp: "pick",
				label: "Mina"
			},
			{
				stamp: "kiln",
				label: "Carbón"
			},
			{
				stamp: "fire",
				label: "Fundición"
			},
			{
				stamp: "anvil",
				label: "Acería"
			}
		],
		buddy: "Una de cada. Mina en la roca, carbonera al bosque, las otras dos en una calle sucia. Si la acería duerme, mirá carbón, mineral y obreros — no pongas una segunda acería.",
		trap: "Una avenida de acerías para 60 personas. Eso es el ticker rojo."
	},
	{
		id: "sails",
		title: "Velas",
		when: "Barcos",
		steps: [{
			stamp: "sheep",
			label: "Lana"
		}, {
			stamp: "sail",
			label: "Velas"
		}],
		buddy: "Si el velero pide tela, un taller de velas al lado de la lana que ya tenés. No fundes una isla nueva.",
		trap: "Una flota de tres velas y un telar."
	}
];
var chainRule = "Regla corta: 1 materia prima → 1 fábrica. Si la fábrica tiene zzz, falta campo, calle o gente. Si el almacén explota, sobra fábrica: pausala.";
function resolveMission(missionId) {
	if (!missionId) return null;
	const mission = missionsById[missionId];
	if (!mission) return null;
	const chapter = chaptersById[mission.chapterId];
	if (!chapter) return null;
	return {
		mission,
		chapter,
		layout: mission.layoutId ? layoutsById[mission.layoutId] : void 0,
		buildings: mission.buildingIds.map((id) => buildingsById[id]).filter((building) => Boolean(building)),
		life: lifeByChapter[chapter.id],
		people: peopleForChapter(chapter.id),
		lifeAsks: lifeAsks[chapter.id] ?? []
	};
}
var firstPlayableMissionId = "ch1-spark";
chapters.filter((chapter) => [
	"ch1",
	"ch2",
	"ch3",
	"ch4"
].includes(chapter.id));
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var svg = {
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.6,
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": true
};
var ICONS = {
	cottage: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 11.5 12 4l8 7.5V20H4z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 20v-6h4v6" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M16 9.2V6h2.2" })
	] }),
	brick: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 10h14v10H5z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 14h14M12 10v10M8.5 10v4M15.5 14v6" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 10 12 4l8 6" })
	] }),
	stall: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 9h16l-1.5 3H5.5z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 12v8M18 12v8M8 20h8" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 16h3M14 16h2" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "6",
			r: "1.4"
		})
	] }),
	cabin: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 13 12 5l9 8" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 12.5V20h12v-7.5" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 20v-5h4v5" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7.5 16.5h2" })
	] }),
	mill: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "11",
			r: "4"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 7V4M12 15v3M8 11H5M16 11h3" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9.2 8.2 7 6M14.8 13.8 17 16M14.8 8.2 17 6M9.2 13.8 7 16" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 20h8" })
	] }),
	fish: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 12c4-5 12-5 14 0-2 5-10 5-14 0Z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M18 12l4-3v6z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "8.2",
			cy: "11",
			r: ".8",
			fill: "currentColor"
		})
	] }),
	sheep: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "10",
			cy: "13",
			r: "5"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "15.5",
			cy: "11.5",
			r: "3.2"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 18v2M13 18v2M18 14.2v2" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "16.6",
			cy: "10.4",
			r: ".6",
			fill: "currentColor"
		})
	] }),
	yarn: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "11",
			r: "5.5"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7.5 9c2 2 7 2 9 0M7.5 13c2 2 7 2 9 0" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M14 16.5 16 21h3" })
	] }),
	plant: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 21V11" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 14c-4-1-6-5-5-8 3 1 5 4 5 8Z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 13c4-1 6-5 5-8-3 1-5 4-5 8Z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 21h8" })
	] }),
	barrel: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 6h10v12H7z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 6c0-1.4 2.2-2.2 5-2.2S17 4.6 17 6M7 18c0 1.4 2.2 2.2 5 2.2S17 19.4 17 18" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 10h10M7 14h10" })
	] }),
	tankard: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 8h8v10a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M15 10h2.5a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H15" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 8V6h6v2" })
	] }),
	pig: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
			cx: "12",
			cy: "13",
			rx: "7",
			ry: "5"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 11c-2-3 1-5 3-3" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "16.5",
			cy: "12",
			r: "2.2"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 18v2M14 18v2" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "17.2",
			cy: "11.4",
			r: ".5",
			fill: "currentColor"
		})
	] }),
	wheat: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 21V8" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 10c-3-2-3-5 0-6M12 10c3-2 3-5 0-6" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 14c-3-2-3-5 0-6M12 14c3-2 3-5 0-6" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 18c-3-2-3-4 0-5M12 18c3-2 3-4 0-5" })
	] }),
	soap: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
		x: "5",
		y: "9",
		width: "14",
		height: "8",
		rx: "3"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 9c0-2 2-3 3.5-2.2" })] }),
	bell: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 10a4 4 0 1 1 8 0c0 4 1.5 6 1.5 6H6.5S8 14 8 10Z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10.5 16.5a1.5 1.5 0 0 0 3 0" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 6V4" })
	] }),
	chapel: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 20V11l6-5 6 5v9z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 6V3M10.5 3h3" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10.5 20v-5h3v5" })
	] }),
	crate: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 8h16v12H4z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 8 12 4l8 4" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 12h16M12 8v12" })
	] }),
	pick: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 19 14 10" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 8c4-1 7 2 6 6" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 20h4" })
	] }),
	kiln: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 20V11l5-5 5 5v9z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 20v-5h4v5" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 13h6" })
	] }),
	fire: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 20c4 0 6-3 6-7 0-5-4-7-6-11-2 4-6 6-6 11 0 4 2 7 6 7Z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 17c1.6 0 2.5-1.3 2.5-3 0-2-1.5-3-2.5-4.5" })] }),
	anvil: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 11h14v3H5z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 14v5h8v-5" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 11V8h7l4 3" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 20h10" })
	] }),
	cannon: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 14h13a3 3 0 0 0 3-3V9H8" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "7",
			cy: "16.5",
			r: "2.3"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "16",
			cy: "16.5",
			r: "2.3"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 11V8h3" })
	] }),
	sail: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 20V5" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 6c6 1 7 8 0 10" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 20h10" })
	] }),
	hut: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 13 12 5l8 8" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 13v7h12v-7" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 13h16" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 20v-5h4v5" })
	] }),
	leaf: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 21c0-8 7-12 7-12S16 4 12 4 5 9 5 9s7 4 7 12Z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 21V8" })] }),
	star: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 3.5 14.2 9h5.8l-4.7 3.6 1.8 5.6L12 15.2 7 18.2l1.8-5.6L4 9h5.8z" }) }),
	cross: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
		x: "4",
		y: "4",
		width: "16",
		height: "16",
		rx: "3"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 8v8M8 12h8" })] }),
	wall: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 10h18v10H3z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 14h18M9 10v10M15 10v10" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 10V8h3v2M12 10V7h3v3M18 10V8h3" })
	] }),
	road: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 3 6 21M15 3l3 18" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 5v3M12 11v3M12 17v3" })] }),
	garden: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 20V11" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "9",
			r: "3.2"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 20h10" })
	] }),
	farm: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 17h16M4 20h16" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 17V12M10 17V10M14 17V12M18 17V11" })] }),
	tree: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 21v-6" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 15 7 19h10z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 11 6.5 16h11z" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 7 8 12h8z" })
	] }),
	water: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 9c2 2 4 2 6 0s4-2 6 0 4 2 6 0" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 14c2 2 4 2 6 0s4-2 6 0 4 2 6 0" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 19c2 2 4 2 6 0s4-2 6 0 4 2 6 0" })
	] }),
	industry: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 20V11l6 3V11l6 3V8l4-2v14z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M16 8V4h2" })] }),
	axe: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 21 14 8" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12.5 6.5 18 4l1.5 5.5-5.2 2.2z" })] })
};
function Stamp({ name, className, title }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: svg.viewBox,
		fill: svg.fill,
		stroke: svg.stroke,
		strokeWidth: svg.strokeWidth,
		strokeLinecap: svg.strokeLinecap,
		strokeLinejoin: svg.strokeLinejoin,
		className: cn("shrink-0", className),
		role: title ? "img" : "presentation",
		"aria-hidden": title ? void 0 : true,
		children: [title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", { children: title }) : null, ICONS[name] ?? ICONS.cottage]
	});
}
var BUILDING_STAMP = {
	lumberjack: "cabin",
	sawmill: "mill",
	marketplace: "stall",
	"farmer-house": "cottage",
	fishery: "fish",
	sheep: "sheep",
	knitters: "yarn",
	potato: "plant",
	distillery: "barrel",
	pub: "tankard",
	"worker-house": "brick",
	sausage: "pig",
	bread: "wheat",
	soap: "soap",
	school: "bell",
	church: "chapel",
	warehouse: "crate",
	"iron-mine": "pick",
	charcoal: "kiln",
	furnace: "fire",
	steelworks: "anvil",
	weapons: "cannon",
	sails: "sail",
	jornalero: "hut",
	plantain: "leaf",
	police: "star",
	hospital: "cross",
	obrero: "brick",
	defenses: "wall"
};
function buildingStamp(id) {
	return BUILDING_STAMP[id] ?? "cottage";
}
var TILE = {
	cottage: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M3.5 11.5 12 4.2 20.5 11.5V20.5H14v-6h-4v6H3.5z"
	}),
	garden: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
		fill: "currentColor",
		stroke: "none",
		cx: "12",
		cy: "9.5",
		r: "4.2"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M11 13h2v8h-2z"
	})] }),
	chapel: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M5 20.5V11l7-6 7 6v9.5h-5v-5H10v5z"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M11 3h2v3h-2zM10 3.8h4v1.4h-4z"
	})] }),
	stall: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M3.5 8.5h17l-2 4.2H5.5z"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M6.2 12.7h2.2v8.3H6.2zM15.6 12.7h2.2v8.3h-2.2zM9 18.5h6v2.5H9z"
	})] }),
	farm: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M5 8h2.4v13H5zM10.8 5.5h2.4V21h-2.4zM16.6 9h2.4v12h-2.4z"
	}) }),
	industry: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M3.5 20.5V12l5 2.2V11.5l5 2.3V9.5l6.5-2.2v13z"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M16.2 4h2.3v4h-2.3z"
	})] }),
	tree: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			fill: "currentColor",
			stroke: "none",
			d: "M12 3.5 6 12h12z"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			fill: "currentColor",
			stroke: "none",
			d: "M12 8 5.2 17h13.6z"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			fill: "currentColor",
			stroke: "none",
			d: "M11 16h2v5h-2z"
		})
	] }),
	water: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M3 9.2c2.2 2.4 4.4 2.4 6.5 0 2.2-2.4 4.3-2.4 6.5 0 2.1 2.4 4.3 2.4 5 1.2v3.2c-2 .8-3.6-.4-5-1.8-2.2-2.2-4.3-2.2-6.5 0-2.1 2.2-4.3 2.2-6.5 0z"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M3 15.4c2.2 2.4 4.4 2.4 6.5 0 2.2-2.4 4.3-2.4 6.5 0 2.1 2.4 4.3 2.4 5 1.2v3.2c-2 .8-3.6-.4-5-1.8-2.2-2.2-4.3-2.2-6.5 0-2.1 2.2-4.3 2.2-6.5 0z"
	})] }),
	crate: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
		fill: "currentColor",
		stroke: "none",
		d: "M4 8.2 12 4.2 20 8.2V20H4zM4 12h16M12 8.2V20"
	})
};
function TileMark({ name, className }) {
	const glyph = TILE[name];
	if (!glyph) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 24 24",
		className: cn("pointer-events-none", className),
		"aria-hidden": true,
		children: glyph
	});
}
var CELL_TILE = {
	H: "cottage",
	G: "garden",
	P: "chapel",
	M: "stall",
	W: "water",
	F: "farm",
	I: "industry",
	T: "tree"
};
var CELL_CLASS = {
	R: "cell-road",
	H: "cell-house",
	G: "cell-gap",
	P: "cell-public",
	W: "cell-water",
	F: "cell-farm",
	I: "cell-industry",
	T: "cell-tree",
	M: "cell-public",
	".": "cell-empty"
};
var LEGEND = [
	{
		key: "R",
		label: "Calle",
		className: "cell-road",
		stamp: "road",
		ink: "text-background/80"
	},
	{
		key: "H",
		label: "Casa",
		className: "cell-house",
		stamp: "cottage",
		ink: "text-background/80"
	},
	{
		key: "G",
		label: "Jardín",
		className: "cell-gap",
		stamp: "garden",
		ink: "text-ok"
	},
	{
		key: "P",
		label: "Público",
		className: "cell-public",
		stamp: "chapel",
		ink: "text-primary-foreground"
	},
	{
		key: "W",
		label: "Agua",
		className: "cell-water",
		stamp: "water",
		ink: "text-foreground"
	},
	{
		key: "F",
		label: "Granja",
		className: "cell-farm",
		stamp: "farm",
		ink: "text-background/80"
	},
	{
		key: "I",
		label: "Industria",
		className: "cell-industry",
		stamp: "industry",
		ink: "text-foreground"
	},
	{
		key: "T",
		label: "Árboles",
		className: "cell-tree",
		stamp: "tree",
		ink: "text-foreground"
	}
];
var CELL_INK = {
	H: "text-background/75",
	G: "text-ok",
	P: "text-primary-foreground",
	M: "text-primary-foreground",
	W: "text-foreground/85",
	F: "text-background/80",
	I: "text-foreground/85",
	T: "text-foreground/85"
};
function BlockGrid({ layout }) {
	const cols = Math.max(...layout.grid.map((row) => row.length), 1);
	const used = new Set(layout.grid.join("").split(""));
	const legend = LEGEND.filter((item) => used.has(item.key) || item.key === "P" && used.has("M"));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-auto w-full max-w-md rounded-xl bg-muted p-3",
			style: { maxWidth: "min(100%, 28rem)" },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid aspect-square w-full gap-[2px] overflow-hidden rounded-md",
				style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` },
				role: "img",
				"aria-label": layout.title,
				children: layout.grid.flatMap((row, y) => row.split("").map((cell, x) => {
					const tile = CELL_TILE[cell];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("relative grid aspect-square place-items-center", CELL_CLASS[cell] ?? "cell-empty"),
						children: tile ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TileMark, {
							name: tile,
							className: cn("size-[70%]", CELL_INK[cell])
						}) : null
					}, `${y}-${x}`);
				}))
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "flex flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground",
			children: legend.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-center gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("grid size-6 place-items-center rounded-xs", item.className),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stamp, {
						name: item.stamp,
						className: cn("size-4", item.ink)
					})
				}), item.label]
			}, item.key))
		})]
	});
}
var ROUTE = [
	{
		stamp: "water",
		label: "Puerto"
	},
	{
		stamp: "crate",
		label: "Almacén"
	},
	{
		stamp: "road",
		label: "Calle"
	},
	{
		stamp: "stall",
		label: "Mercado"
	},
	{
		stamp: "cottage",
		label: "10×10"
	}
];
function HarborRoute() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		className: "mt-5 flex flex-wrap items-center gap-2",
		children: ROUTE.map((stop, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "flex items-center gap-2",
			children: [index > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-mist",
				"aria-hidden": true,
				children: "→"
			}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "inline-flex h-11 items-center gap-2 rounded-md bg-muted px-3 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stamp, {
					name: stop.stamp,
					className: "size-4 text-primary"
				}), stop.label]
			})]
		}, stop.label))
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var askBuddy = createServerFn({ method: "POST" }).validator((input) => {
	const question = (input?.question ?? "").trim().slice(0, 800);
	if (!question) throw new Error("Decí algo primero.");
	return {
		question,
		missionId: input.missionId ?? null,
		spoilers: Boolean(input.spoilers),
		history: (input.history ?? []).slice(-8).map((turn) => ({
			role: turn.role === "assistant" ? "assistant" : "user",
			content: String(turn.content ?? "").slice(0, 1200)
		})),
		pulse: input.pulse ?? defaultPulse,
		checked: Array.isArray(input.checked) ? input.checked.slice(0, 12) : []
	};
}).handler(createSsrRpc("f345c695ab2916dd3456ae42ecfc6f01fcc27c17e5b4d82584ab007059211537"));
var useHarbor = create()(persist((set, get) => ({
	missionId: null,
	spoilers: false,
	calm: "session",
	completed: [],
	chat: [],
	pulse: defaultPulse,
	checks: {},
	setMissionId: (id) => set({
		missionId: id,
		calm: "session"
	}),
	setSpoilers: (value) => set({ spoilers: value }),
	setCalm: (value) => set({ calm: value }),
	setPulse: (patch) => set({ pulse: {
		...get().pulse,
		...patch
	} }),
	toggleCheck: (missionId, index) => {
		const current = get().checks[missionId] ?? [];
		const next = current.includes(index) ? current.filter((item) => item !== index) : [...current, index];
		set({ checks: {
			...get().checks,
			[missionId]: next
		} });
	},
	markComplete: (id) => {
		const completed = get().completed.includes(id) ? get().completed : [...get().completed, id];
		const mission = missionsById[id];
		const chapterIds = mission ? Object.values(missionsById).filter((item) => item.chapterId === mission.chapterId).map((item) => item.id) : [];
		const nextId = chapterIds[chapterIds.indexOf(id) + 1];
		set({
			completed,
			missionId: nextId ?? get().missionId,
			calm: "session"
		});
	},
	addChat: (turn) => set({ chat: [...get().chat, turn].slice(-16) }),
	clearChat: () => set({ chat: [] }),
	resetProgress: () => set({
		missionId: firstPlayableMissionId,
		completed: [],
		chat: [],
		calm: "session",
		pulse: defaultPulse,
		checks: {}
	})
}), {
	name: "harbor-buddy-es",
	partialize: (state) => ({
		missionId: state.missionId,
		spoilers: state.spoilers,
		completed: state.completed,
		chat: state.chat,
		pulse: state.pulse,
		checks: state.checks
	})
}));
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground hover:bg-primary/90",
			secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
			outline: "bg-card text-foreground shadow-border hover:shadow-border-hover",
			ghost: "text-foreground hover:bg-muted",
			destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-11 px-4",
			sm: "h-9 rounded-sm px-3",
			lg: "h-12 rounded-lg px-5",
			icon: "size-11"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		...props
	});
}
function BuddyChat({ suggestions }) {
	const missionId = useHarbor((s) => s.missionId);
	const spoilers = useHarbor((s) => s.spoilers);
	const chat = useHarbor((s) => s.chat);
	const addChat = useHarbor((s) => s.addChat);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	async function send(text) {
		const question = text.trim();
		if (!question || pending) return;
		setDraft("");
		setError(null);
		const history = useHarbor.getState().chat;
		const snapshot = useHarbor.getState();
		addChat({
			role: "user",
			content: question
		});
		setPending(true);
		try {
			const result = await askBuddy({ data: {
				question,
				missionId,
				spoilers,
				history,
				pulse: snapshot.pulse,
				checked: missionId ? snapshot.checks[missionId] ?? [] : []
			} });
			if (result.ok) addChat({
				role: "assistant",
				content: result.text
			});
			else setError(result.error);
		} catch {
			setError("Estática en la radio. Probá de nuevo.");
		} finally {
			setPending(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-card p-4 shadow-border sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "flex items-baseline justify-between gap-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-muted-foreground uppercase",
					children: "Preguntale al compañero"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-xl font-medium tracking-tight",
					children: "Acá al lado tuyo"
				})] })
			}),
			chat.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
				className: "flex max-h-72 flex-col gap-3 overflow-y-auto pr-1",
				children: [chat.map((turn, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: cn("max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap", turn.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted text-foreground"),
					children: turn.content
				}, `${turn.role}-${index}`)), pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-2 self-start text-sm text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }), "Pensando con la marea…"]
				}) : null]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm leading-relaxed text-muted-foreground",
				children: "Preguntame como a un amigo en el sillón. Dónde va la taberna. Por qué se pusieron rojas las monedas. Si vale pelear con las otras compañías."
			}),
			suggestions.length > 0 && chat.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: suggestions.map((ask) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => send(ask),
					className: "h-11 rounded-md bg-muted px-3 text-left text-sm text-foreground transition-colors duration-150 hover:bg-secondary",
					children: ask
				}, ask))
			}) : null,
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-destructive",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex gap-2",
				onSubmit: (event) => {
					event.preventDefault();
					send(draft);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "sr-only",
						htmlFor: "buddy-ask",
						children: "Preguntale a Harbor Buddy"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "buddy-ask",
						value: draft,
						onChange: (event) => setDraft(event.target.value),
						placeholder: "¿Dónde pongo la taberna?",
						className: "h-11 min-w-0 flex-1 rounded-md border-0 bg-muted px-3 text-sm text-foreground ring-1 ring-border placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						size: "icon",
						disabled: pending || !draft.trim(),
						"aria-label": "Enviar",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, {})
					})
				]
			})
		]
	});
}
function ChainBoard() {
	const [activeId, setActiveId] = (0, import_react.useState)(chains[0]?.id ?? "wood");
	const active = chains.find((chain) => chain.id === activeId) ?? chains[0];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl bg-card p-4 shadow-border sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-wide text-mist uppercase",
				children: "Materia prima → fábrica"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-1 font-display text-2xl font-medium tracking-tight",
				children: "Uno y uno alcanza"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm leading-relaxed text-muted-foreground",
				children: chainRule
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 flex flex-wrap gap-2",
				children: chains.map((chain) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setActiveId(chain.id),
					className: cn("h-11 rounded-md px-3 text-sm", active?.id === chain.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-secondary"),
					children: chain.title
				}, chain.id))
			}),
			active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: active.when
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "flex flex-wrap items-center gap-2",
						children: active.steps.map((step, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center gap-2",
							children: [index > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: "→"
							}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex h-11 items-center gap-2 rounded-md bg-muted px-3 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stamp, {
									name: step.stamp,
									className: "size-4 text-primary"
								}), step.label]
							})]
						}, step.label))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm leading-relaxed",
						children: active.buddy
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm leading-relaxed text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-foreground",
							children: "Ojo: "
						}), active.trap]
					})
				]
			}) : null
		]
	});
}
function MissionFinder() {
	const setMissionId = useHarbor((s) => s.setMissionId);
	const [query, setQuery] = (0, import_react.useState)("");
	const hits = (0, import_react.useMemo)(() => findMissions(query), [query]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl bg-card p-4 shadow-border sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-wide text-mist uppercase",
				children: "¿En qué misión estoy?"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-1 font-display text-2xl font-medium tracking-tight",
				children: "Escribí lo que ves en el diario"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm leading-relaxed text-muted-foreground",
				children: "En Anno, a la derecha o abajo: el pergamino de misiones. El título de la campaña es el que buscás. También sirve un pedazo: “acero”, “schnapps”, “Ditch Water”, “Isabel”."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 rounded-lg bg-muted p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "size-3.5" }), "Dónde mirar en el juego"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "mt-2 flex flex-col gap-1.5 text-sm leading-relaxed",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "1. Icono de diario / misiones (pergamino)." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "2. La entrada con el sello de historia, no un recado de Kahina." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "3. Copiá dos palabras del título y pegá acá." })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-4 flex flex-col gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "sr-only",
					children: "Buscar misión"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: query,
						onChange: (event) => setQuery(event.target.value),
						placeholder: "Ej: Evolución industrial, 50 granjeros, mina…",
						className: "h-11 w-full rounded-md border-0 bg-muted pr-3 pl-10 text-sm text-foreground ring-1 ring-border placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
					})]
				})]
			}),
			query.trim().length >= 2 ? hits.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 flex flex-col gap-1",
				children: hits.map(({ mission }) => {
					const chapter = chaptersById[mission.chapterId];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setMissionId(mission.id),
						className: cn("flex min-h-11 w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-muted"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium",
							children: mission.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs text-muted-foreground",
							children: [
								chapter?.title,
								" · ",
								mission.objective
							]
						})]
					}) }, mission.id);
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted-foreground",
				children: "No la encuentro. Probá una palabra sola: acero, mercado, refugiados."
			}) : null
		]
	});
}
var KIND_LABEL = {
	build: "Construir",
	errand: "Salir",
	wait: "Esperar",
	combat: "Pelear",
	expedition: "Expedición"
};
function HarborApp() {
	const missionId = useHarbor((s) => s.missionId);
	const calm = useHarbor((s) => s.calm);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-dvh bg-background",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex min-h-dvh max-w-6xl flex-col lg:flex-row",
			children: [calm !== "session" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CampaignRail, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-1 flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopBar, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "flex-1 px-4 py-5 sm:px-6 sm:py-7",
					children: !missionId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Welcome, {}) : calm === "overwhelmed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverwhelmedPanel, {}) : calm === "broke" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrokePanel, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionDesk, {})
				})]
			})]
		})
	});
}
function TopBar() {
	const spoilers = useHarbor((s) => s.spoilers);
	const setSpoilers = useHarbor((s) => s.setSpoilers);
	const calm = useHarbor((s) => s.calm);
	const setCalm = useHarbor((s) => s.setCalm);
	const missionId = useHarbor((s) => s.missionId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-w-0 items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Anchor, {
				className: "size-5 shrink-0 text-primary",
				strokeWidth: 1.75
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-lg leading-none font-semibold tracking-tight",
					children: "Harbor Buddy"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 truncate text-xs text-mist",
					children: "Anno 1800 · bastante bien, lindo, terminá la historia"
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex shrink-0 items-center gap-1 sm:gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setSpoilers(!spoilers),
				className: cn("inline-flex h-11 items-center rounded-md px-3 text-xs font-medium", spoilers ? "bg-primary text-primary-foreground" : "hover:bg-muted"),
				"aria-pressed": spoilers,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "sm:hidden",
					children: ["Spoilers ", spoilers ? "sí" : "no"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "hidden sm:inline",
					children: ["Spoilers ", spoilers ? "sí" : "no"]
				})]
			}), missionId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "outline",
				size: "sm",
				className: cn(calm === "broke" && "bg-primary text-primary-foreground"),
				onClick: () => setCalm(calm === "broke" ? "session" : "broke"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "size-3.5" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden sm:inline",
						children: calm === "broke" ? "Volver al escritorio" : "Monedas en rojo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "sm:hidden",
						children: calm === "broke" ? "Escritorio" : "Monedas"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "outline",
				size: "sm",
				className: cn(calm === "overwhelmed" && "bg-primary text-primary-foreground"),
				onClick: () => setCalm(calm === "overwhelmed" ? "session" : "overwhelmed"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-3.5" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden sm:inline",
						children: calm === "overwhelmed" ? "Volver al escritorio" : "Estoy saturado"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "sm:hidden",
						children: calm === "overwhelmed" ? "Escritorio" : "Pausa"
					})
				]
			})] }) : null]
		})]
	});
}
function CampaignRail() {
	const missionId = useHarbor((s) => s.missionId);
	const setMissionId = useHarbor((s) => s.setMissionId);
	const completed = useHarbor((s) => s.completed);
	const [openId, setOpenId] = (0, import_react.useState)(null);
	const currentChapterId = missionId ? missionsById[missionId]?.chapterId : null;
	const expanded = openId ?? currentChapterId ?? "ch1";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "border-b border-border bg-card lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-4 py-3 lg:px-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-muted-foreground uppercase",
					children: "Dónde estás"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ship, { className: "size-4 text-mist" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden",
				children: chapters.map((chapter) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						setOpenId(chapter.id);
						const first = chapter.missionIds[0];
						if (first) setMissionId(first);
					},
					className: cn("h-11 shrink-0 rounded-md px-3 text-sm", currentChapterId === chapter.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"),
					children: chapter.roman === "0" ? "Prólogo" : chapter.roman
				}, chapter.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "hidden max-h-[calc(100dvh-3.25rem)] overflow-y-auto px-3 pb-6 lg:block",
				children: chapters.map((chapter) => {
					const isOpen = expanded === chapter.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setOpenId(isOpen ? null : chapter.id),
							className: "flex h-11 w-full items-center justify-between rounded-md px-2 text-left hover:bg-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex min-w-0 flex-col",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] tracking-wide text-mist uppercase",
									children: chapter.roman === "0" ? "Prólogo" : `Capítulo ${chapter.roman}`
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate text-sm font-medium",
									children: chapter.title
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: cn("size-4 text-muted-foreground transition-transform duration-150", isOpen && "rotate-90") })]
						}), isOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-1 mb-2 flex flex-col gap-0.5 pl-2",
							children: chapter.missionIds.map((id) => {
								const mission = missionsById[id];
								if (!mission) return null;
								const active = missionId === id;
								const done = completed.includes(id);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setMissionId(id),
									className: cn("flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm leading-snug", active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full", active ? "bg-primary-foreground/20" : done ? "bg-ok text-ok-foreground" : "ring-1 ring-border"),
										children: done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-2.5" }) : null
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block truncate",
											children: mission.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: cn("text-[11px]", active ? "text-primary-foreground/70" : "text-muted-foreground"),
											children: KIND_LABEL[mission.kind]
										})]
									})]
								}) }, id);
							})
						}) : null]
					}, chapter.id);
				})
			})
		]
	});
}
function Welcome() {
	const setMissionId = useHarbor((s) => s.setMissionId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "stagger-in mx-auto flex max-w-2xl flex-col gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-mist uppercase",
					children: "Compañero de campaña"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl",
					children: "No necesitás una ciudad perfecta."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 max-w-prose text-base leading-relaxed text-muted-foreground",
					children: "Poné esto al lado de Anno en Windows. Tocá dónde estás. Yo te digo los próximos diez minutos: un sello 10×10, dónde va el edificio nuevo, cómo no fundirte, y con quién no pelear. Tocá lo que ves en tu isla y te contesto como si estuviera al lado."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MissionFinder, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WelcomeCard, {
						title: "Recién empiezo",
						copy: "El prólogo, y después el primer mercado.",
						onClick: () => setMissionId("pro-blast")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WelcomeCard, {
						title: "Fundando la primera ciudad",
						copy: "Capítulo 1. Madera, mercado, diez casas.",
						onClick: () => setMissionId(firstPlayableMissionId),
						featured: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WelcomeCard, {
						title: "Acero y mar",
						copy: "Capítulo 2. Hierro en la montaña.",
						onClick: () => setMissionId("ch2-bulk")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WelcomeCard, {
						title: "Del otro lado del océano",
						copy: "Capítulo 3. El mismo 10×10, isla nueva.",
						onClick: () => setMissionId("ch3-hand")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "En Windows: Anno sin bordes, Win + Izquierda / Derecha para partir la pantalla, o este app en el segundo monitor."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HarborFooter, {})
		]
	});
}
function WelcomeCard({ title, copy, onClick, featured }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: cn("flex min-h-28 flex-col items-start rounded-xl p-4 text-left transition-shadow duration-150", featured ? "bg-primary text-primary-foreground shadow-border" : "bg-card text-foreground shadow-border hover:shadow-border-hover"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-display text-lg font-medium",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("mt-1 text-sm", featured ? "text-primary-foreground/75" : "text-muted-foreground"),
			children: copy
		})]
	});
}
function OverwhelmedPanel() {
	const missionId = useHarbor((s) => s.missionId);
	const setCalm = useHarbor((s) => s.setCalm);
	const resolved = resolveMission(missionId);
	if (!resolved) return null;
	const { mission, chapter } = resolved;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "stagger-in mx-auto flex max-w-xl flex-col gap-6 py-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs font-medium tracking-wide text-mist uppercase",
				children: [chapter.title, " · una sola cosa"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl",
				children: mission.overwhelmed
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-base leading-relaxed text-muted-foreground",
				children: mission.why
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => setCalm("session"),
					children: "Ya puedo mirar el resto"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					onClick: () => setCalm("broke"),
					children: "El problema son las monedas"
				})]
			})
		]
	});
}
function BrokePanel() {
	const missionId = useHarbor((s) => s.missionId);
	const setCalm = useHarbor((s) => s.setCalm);
	const pulse = resolveMission(missionId)?.life?.money.pulse;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "stagger-in mx-auto flex max-w-xl flex-col gap-6 py-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-wide text-mist uppercase",
				children: "Libro · una calle"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl",
				children: "Pará de construir. Arreglá el ticker. Después jugá."
			}),
			pulse ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-base leading-relaxed text-muted-foreground",
				children: pulse
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "flex flex-col gap-3",
				children: brokeSteps.map((step, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex gap-3 text-sm leading-relaxed sm:text-base",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-display w-4 shrink-0 text-mist tabular-nums",
						children: index + 1
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: step })]
				}, step))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm leading-relaxed text-muted-foreground",
				children: "No hace falta ser eficiente al mil. Si las monedas suben, ya sos rico para terminar la historia."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => setCalm("session"),
					children: "El ticker ya está verde"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					onClick: () => setCalm("overwhelmed"),
					children: "Sigo saturado"
				})]
			})
		]
	});
}
function SessionDesk() {
	const missionId = useHarbor((s) => s.missionId);
	const spoilers = useHarbor((s) => s.spoilers);
	const completed = useHarbor((s) => s.completed);
	const markComplete = useHarbor((s) => s.markComplete);
	const setMissionId = useHarbor((s) => s.setMissionId);
	const pulse = useHarbor((s) => s.pulse);
	const checks = useHarbor((s) => s.checks);
	const toggleCheck = useHarbor((s) => s.toggleCheck);
	const resolved = resolveMission(missionId);
	const nav = missionId ? getMissionIndex(missionId) : null;
	const [buildingId, setBuildingId] = (0, import_react.useState)(null);
	const [personId, setPersonId] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		setBuildingId(null);
		setPersonId(null);
	}, [missionId]);
	const activeBuilding = (0, import_react.useMemo)(() => {
		if (!resolved) return null;
		const id = buildingId ?? resolved.buildings[0]?.id;
		return resolved.buildings.find((item) => item.id === id) ?? null;
	}, [resolved, buildingId]);
	if (!resolved || !nav) return null;
	const { mission, chapter, layout, buildings, life, people, lifeAsks } = resolved;
	const shownLayout = layout ?? layoutsById["block-10"];
	const done = completed.includes(mission.id);
	const activePerson = people.find((person) => person.id === (personId ?? people[0]?.id)) ?? null;
	const checked = missionId ? checks[missionId] ?? [] : [];
	const move = nextMove(pulse, mission.do, checked);
	const chatAsks = [...mission.suggestedAsks, ...lifeAsks.filter((ask) => !mission.suggestedAsks.includes(ask))];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "stagger-in mx-auto flex max-w-3xl flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobileMissionPicker, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MissionFinder, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IslandPulse, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl bg-primary p-4 text-primary-foreground sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-wide text-primary-foreground/70 uppercase",
						children: "Tu próximo paso"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 font-display text-2xl font-medium tracking-tight",
						children: move.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-relaxed text-primary-foreground/85",
						children: move.detail
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl bg-card p-4 shadow-border sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs font-medium tracking-wide text-mist uppercase",
						children: [
							chapter.roman === "0" ? "Prólogo" : `Capítulo ${chapter.roman}`,
							" · ",
							KIND_LABEL[mission.kind],
							" ·",
							" ",
							nav.index + 1,
							"/",
							nav.total
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 font-display text-3xl leading-tight font-semibold tracking-tight",
						children: mission.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-base leading-relaxed",
						children: mission.objective
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm leading-relaxed text-muted-foreground",
						children: mission.why
					}),
					spoilers && mission.spoilers ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 border-l-2 border-primary pl-3 text-sm leading-relaxed",
						children: mission.spoilers
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:gap-8",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-wide text-muted-foreground uppercase",
							children: "Esta sesión · tocá lo que ya hiciste"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
							className: "mt-2 flex flex-col gap-2",
							children: mission.do.map((item, index) => {
								const on = checked.includes(index);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => missionId && toggleCheck(missionId, index),
									className: cn("flex min-h-11 w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm leading-relaxed", on ? "bg-accent text-accent-foreground" : "hover:bg-muted"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full", on ? "bg-ok text-ok-foreground" : "ring-1 ring-border"),
										children: on ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-2.5" }) : null
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: on ? "line-through opacity-70" : void 0,
										children: item
									})]
								}) }, item);
							})
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-lg bg-muted p-4 sm:max-w-56",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-medium tracking-wide text-muted-foreground uppercase",
								children: "Mejor no"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm leading-relaxed",
								children: mission.dont
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-5 text-sm leading-relaxed text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-foreground",
							children: "Trampa común: "
						}), mission.trap]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => markComplete(mission.id),
							disabled: done,
							children: done ? "Anotada" : "Esto ya está"
						}), nav.nextId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							onClick: () => setMissionId(nav.nextId),
							children: "Siguiente misión"
						}) : nav.prevId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							onClick: () => setMissionId(nav.prevId),
							children: "Anterior"
						}) : null]
					})
				]
			}),
			shownLayout ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl bg-card p-4 shadow-border sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-wide text-muted-foreground uppercase",
						children: "Sello de ciudad"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 font-display text-2xl font-medium tracking-tight",
						children: shownLayout.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-relaxed text-muted-foreground",
						children: shownLayout.hint
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: "Sellos del cuaderno. No son el arte del juego."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockGrid, { layout: shownLayout })
					}),
					shownLayout.id === "first-city" || shownLayout.id === "block-10" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HarborRoute, {}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "mt-5 flex flex-col gap-2",
						children: shownLayout.steps.map((step, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex gap-3 text-sm leading-relaxed",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display w-4 shrink-0 text-mist tabular-nums",
								children: index + 1
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: step })]
						}, step))
					})
				]
			}) : null,
			buildings.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl bg-card p-4 shadow-border sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-wide text-muted-foreground uppercase",
						children: "Edificios nuevos"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 font-display text-2xl font-medium tracking-tight",
						children: "Dónde va de verdad"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: buildings.map((building) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setBuildingId(building.id),
							className: cn("inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm", activeBuilding?.id === building.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-secondary"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stamp, {
								name: buildingStamp(building.id),
								className: "size-4"
							}), building.name]
						}, building.id))
					}),
					activeBuilding ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 flex flex-col gap-4 sm:flex-row sm:items-start",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid size-24 shrink-0 place-items-center rounded-xl bg-muted text-primary",
							"aria-hidden": true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stamp, {
								name: buildingStamp(activeBuilding.id),
								className: "size-14"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex min-w-0 flex-col gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-muted-foreground",
									children: ["Se desbloquea ", activeBuilding.unlock.toLowerCase()]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm leading-relaxed",
									children: activeBuilding.buddy
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm leading-relaxed",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium",
										children: "Ponelo: "
									}), activeBuilding.where]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm leading-relaxed text-muted-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-foreground",
										children: "Ojo: "
									}), activeBuilding.trap]
								})
							]
						})]
					}) : null
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl bg-card p-4 shadow-border sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-wide text-muted-foreground uppercase",
						children: "La ciudad puede esperar"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 font-display text-2xl font-medium tracking-tight",
						children: "Esto no es un puzzle de edificios"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-relaxed text-muted-foreground",
						children: "Seguí el marcador y volvé a tus 10×10. Si las barras están verdes, la isla no te necesita un rato."
					})
				]
			}),
			life ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: cn("rounded-xl bg-card p-4 shadow-border sm:p-6", pulse.coins === "down" && "ring-2 ring-primary"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "size-3.5" }), "Que las monedas suban"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 font-display text-2xl font-medium tracking-tight",
						children: "Bastante bien le gana a eficiente"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-relaxed text-muted-foreground",
						children: life.money.pulse
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "mt-4 flex flex-col gap-2",
						children: life.money.keepGreen.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex gap-3 text-sm leading-relaxed",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display w-4 shrink-0 text-mist tabular-nums",
								children: index + 1
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item })]
						}, item))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-4 text-sm leading-relaxed text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-foreground",
							children: "Ojo: "
						}), life.money.trap]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 rounded-lg bg-muted p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-wide text-muted-foreground uppercase",
							children: "Cómo leer Economía"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-2 flex flex-col gap-2 text-sm leading-relaxed",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Impuestos = gente en casas. Si hay 60 residentes, no bancan 20 fábricas." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Edificios de producción es el gasto gordo. Pausá lo que tenga zzz o almacén lleno." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Instituciones con zzz: una estación de bomberos. Las de más, a la basura." })
							]
						})]
					})
				]
			}) : null,
			life ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl bg-card p-4 shadow-border sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Handshake, { className: "size-3.5" }), "Modales del puerto"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 font-display text-2xl font-medium tracking-tight",
						children: "Quedate en paz. Terminá la historia."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-relaxed text-muted-foreground",
						children: life.diplomacy.pulse
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "mt-4 flex flex-col gap-2",
						children: life.diplomacy.keepPeace.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex gap-3 text-sm leading-relaxed",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display w-4 shrink-0 text-mist tabular-nums",
								children: index + 1
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item })]
						}, item))
					}),
					people.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: people.map((person) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setPersonId(person.id),
							className: cn("h-11 rounded-md px-3 text-sm", activePerson?.id === person.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-secondary"),
							children: person.name
						}, person.id))
					}), activePerson ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 flex flex-col gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: activePerson.role
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm leading-relaxed",
								children: activePerson.buddy
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm leading-relaxed",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium",
									children: "Hacé: "
								}), activePerson.do]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm leading-relaxed text-muted-foreground",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-foreground",
									children: "No hagas: "
								}), activePerson.dont]
							})
						]
					}) : null] }) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-4 text-sm leading-relaxed text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium text-foreground",
							children: "Ojo: "
						}), life.diplomacy.trap]
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChainBoard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BuddyChat, { suggestions: chatAsks }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HarborFooter, { reset: true })
		]
	});
}
function ChipRow({ label, value, options, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs font-medium tracking-wide text-muted-foreground uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-wrap gap-2",
			children: options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => onChange(option.id),
				className: cn("h-11 rounded-md px-3 text-sm", value === option.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-secondary"),
				children: option.text
			}, option.id))
		})]
	});
}
function IslandPulse() {
	const pulse = useHarbor((s) => s.pulse);
	const setPulse = useHarbor((s) => s.setPulse);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl bg-card p-4 shadow-border sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-wide text-muted-foreground uppercase",
				children: "En tu partida ahora"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-1 font-display text-2xl font-medium tracking-tight",
				children: "Contame qué ves"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm leading-relaxed text-muted-foreground",
				children: "Tocá lo que está pasando en la pantalla. Yo cambio el próximo paso y el consejo."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-col gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipRow, {
						label: "Monedas",
						value: pulse.coins,
						onChange: (coins) => setPulse({ coins }),
						options: [
							{
								id: "up",
								text: "Suben"
							},
							{
								id: "down",
								text: "Están en rojo"
							},
							{
								id: "unknown",
								text: "Ni idea"
							}
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipRow, {
						label: "Casas",
						value: pulse.houses,
						onChange: (houses) => setPulse({ houses }),
						options: [
							{
								id: "ok",
								text: "Contentas"
							},
							{
								id: "yellow",
								text: "Barras amarillas"
							},
							{
								id: "empty",
								text: "Vacías"
							},
							{
								id: "unknown",
								text: "Ni idea"
							}
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipRow, {
						label: "Estoy en",
						value: pulse.looking,
						onChange: (looking) => setPulse({ looking }),
						options: [
							{
								id: "city",
								text: "La ciudad"
							},
							{
								id: "stats",
								text: "Estadísticas"
							},
							{
								id: "quest",
								text: "Un recado"
							},
							{
								id: "sea",
								text: "El mar"
							},
							{
								id: "other",
								text: "Otra isla"
							}
						]
					})
				]
			})
		]
	});
}
function MobileMissionPicker() {
	const missionId = useHarbor((s) => s.missionId);
	const setMissionId = useHarbor((s) => s.setMissionId);
	const mission = missionId ? missionsById[missionId] : null;
	if (!mission) return null;
	const chapter = chapters.find((item) => item.id === mission.chapterId);
	if (!chapter) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex flex-col gap-2 lg:hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs font-medium tracking-wide text-muted-foreground uppercase",
			children: "Misión de este capítulo"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
			className: "h-11 rounded-md bg-card px-3 text-sm shadow-border",
			value: mission.id,
			onChange: (event) => setMissionId(event.target.value),
			children: chapter.missionIds.map((id) => {
				const item = missionsById[id];
				return item ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: id,
					children: item.title
				}, id) : null;
			})
		})]
	});
}
function HarborFooter({ reset = false }) {
	const resetProgress = useHarbor((s) => s.resetProgress);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
		className: "flex flex-col gap-3 pb-8 text-xs text-muted-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
				"Creado por ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-foreground",
					children: "Cristian Sarmiento"
				}),
				" · Harbor Buddy, un compañero para jugar Anno 1800 sin planilla."
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "flex flex-wrap gap-x-3 gap-y-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "https://www.reddit.com/r/anno1800/",
						target: "_blank",
						rel: "noreferrer",
						className: "inline-flex h-11 items-center",
						children: "r/anno1800"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "https://www.reddit.com/r/anno/",
						target: "_blank",
						rel: "noreferrer",
						className: "inline-flex h-11 items-center",
						children: "r/anno"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "https://anno1800.fandom.com/wiki/Campaign",
						target: "_blank",
						rel: "noreferrer",
						className: "inline-flex h-11 items-center",
						children: "Wiki campaña"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Compass, { className: "size-3.5" }), "El progreso queda en este aparato."]
				}), reset ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						if (window.confirm("¿Empezamos el cuaderno de nuevo desde la primera ciudad?")) resetProgress();
					},
					className: "inline-flex h-11 items-center gap-1.5 hover:text-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-3.5" }), "Reiniciar"]
				}) : null]
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HarborApp, {});
}
//#endregion
export { Home as component };
