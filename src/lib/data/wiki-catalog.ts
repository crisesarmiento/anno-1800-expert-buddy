export const WIKI_ORIGIN = "https://anno1800.fandom.com";

export type WikiLink = {
  title: string;
  page: string;
};

export type WikiCatalogEntry = {
  id: string;
  /** Spanish label shown in the catalog. */
  title: string;
  /** Primary Fandom page title (underscored). */
  page: string;
  extra?: WikiLink[];
};

/** Hub pages first, then one row per in-app building. Text + href only. */
export const wikiCatalogHubs: WikiCatalogEntry[] = [
  { id: "hub-buildings", title: "Edificios", page: "Buildings" },
  { id: "hub-campaign", title: "Campaña", page: "Campaign" },
  { id: "hub-production", title: "Cadenas de producción", page: "Production_chains" },
];

export const wikiCatalogBuildings: WikiCatalogEntry[] = [
  { id: "lumberjack", title: "Cabaña de leñador", page: "Lumberjack's_Hut" },
  { id: "sawmill", title: "Aserradero", page: "Sawmill" },
  { id: "marketplace", title: "Mercado", page: "Marketplace" },
  { id: "farmer-house", title: "Residencia de granjeros", page: "Farmer_Residence" },
  { id: "fishery", title: "Pescadería", page: "Fishery" },
  { id: "sheep", title: "Granja de ovejas", page: "Sheep_Farm" },
  { id: "knitters", title: "Telares", page: "Knitter" },
  { id: "potato", title: "Granja de papas", page: "Potato_Farm" },
  { id: "distillery", title: "Destilería de Schnapps", page: "Schnapps_Distillery" },
  { id: "pub", title: "Taberna", page: "Pub" },
  { id: "worker-house", title: "Residencia de obreros", page: "Worker_Residence" },
  {
    id: "sausage",
    title: "Granja de cerdos + Matadero",
    page: "Pig_Farm",
    extra: [{ title: "Matadero", page: "Slaughterhouse" }],
  },
  {
    id: "bread",
    title: "Granja de trigo, molino, panadería",
    page: "Grain_Farm",
    extra: [
      { title: "Molino", page: "Mill" },
      { title: "Panadería", page: "Bakery" },
    ],
  },
  { id: "soap", title: "Fábrica de jabón", page: "Soap_Factory" },
  { id: "school", title: "Escuela", page: "School" },
  { id: "church", title: "Iglesia", page: "Church" },
  {
    id: "warehouse",
    title: "Almacén / Puesto comercial",
    page: "Warehouse",
    extra: [{ title: "Puesto comercial", page: "Trading_Post" }],
  },
  { id: "iron-mine", title: "Mina de hierro", page: "Iron_Mine" },
  { id: "charcoal", title: "Carbonera", page: "Charcoal_Kiln" },
  { id: "furnace", title: "Fundición", page: "Furnace" },
  { id: "steelworks", title: "Acería", page: "Steelworks" },
  { id: "weapons", title: "Fábrica de armas", page: "Weapon_Factory" },
  { id: "sails", title: "Fábrica de velas", page: "Sailmakers" },
  { id: "jornalero", title: "Residencia de jornaleros", page: "Jornalero_Residence" },
  {
    id: "plantain",
    title: "Plantación de plátanos + Cocina",
    page: "Plantain_Plantation",
    extra: [{ title: "Cocina", page: "Kitchen" }],
  },
  { id: "police", title: "Comisaría", page: "Police_Station" },
  { id: "hospital", title: "Hospital", page: "Hospital" },
  { id: "obrero", title: "Residencia de obreros", page: "Obrero_Residence" },
  {
    id: "defenses",
    title: "Cañones montados, torres de cañón, grúa de reparación",
    page: "Cannon_Tower",
    extra: [
      { title: "Cañones montados", page: "Mounted_Guns" },
      { title: "Grúa de reparación", page: "Repair_Crane" },
    ],
  },
];

export const wikiCatalog: WikiCatalogEntry[] = [
  ...wikiCatalogHubs,
  ...wikiCatalogBuildings,
];

export function wikiHref(page: string): string {
  return `${WIKI_ORIGIN}/wiki/${encodeURI(page)}`;
}

export function catalogLinks(entry: WikiCatalogEntry): WikiLink[] {
  return [{ title: entry.title, page: entry.page }, ...(entry.extra ?? [])];
}
