# harbor-live.json — campos

Contrato del snapshot `harbor-live-v1`. El vigilante lee el último `.a7s` (UTF-8/UTF-16 + zlib suelto) y busca **needles del catálogo**. El mod instalable es XML vacío: no inyecta, no Lua, no GUIDs.

Schema: `docs/harbor-live.schema.json`.

## Lo que sí hay

| Campo | Origen hoy | Notas |
|---|---|---|
| `schema` | fijo `harbor-live-v1` | |
| `source` | `save` / `telemetry` / `file` | El watcher escribe `save`. |
| `updatedAt` | reloj al escribir el JSON | Se conserva. |
| `savedAt` | mtime UTC del `.a7s` | Filesystem. No parsea el binario. |
| `game` | fijo `anno-1800` | |
| `sessionName` | basename del `.a7s` | p.ej. `Autosave`. No es el título interno de sesión. |
| `islandName` | primer hit `catalog.islands` | Igual que `telemetry.islands[0].name`. |
| `quests[]` | títulos de campaña en el blob | `title` + `state`. Sin diario extra. |
| `pulseHint` | opcional, UI / fixture | El watcher no lo inventa. |
| `workforce` | hints `farmers` / `workers` / `artisans` / `engineers` | **Presencia** (`true`). Sin números. |
| `telemetry.buildings` | nombres del catálogo | Incluye el edificio Warehouse si el nombre aparece. |
| `telemetry.people` | nombres del catálogo | NPCs como hit de nombre, no rutas. |
| `telemetry.chains` | cadenas + needles | |
| `telemetry.islands` | islas del catálogo | |
| `telemetry.hints` | needles (farmers, taxes, …) | |

El dump Lua (`tools/harbor-buddy-telemetry/dump_live.lua`) **no va en el zip**. Si algún día hay hook seguro, escribe el mismo schema y no inventa títulos. El `modinfo` 0.2.0 sigue vacío (`<ModOps></ModOps>`).

## Lo que se rechaza (a propósito)

No se agregan aunque el `.a7s` “los tenga” por dentro:

- Conteos de población / workforce (haría falta layout binario no documentado).
- Llenado de almacén o stock por bien (hoy el warehouse es solo un hit de edificio).
- Spoilers de diario / misiones más allá del match de título de campaña.
- Rutas de comercio NPC.
- Sim de fábrica por edificio (colas, rates, inputs).
- Inject: Lua en el pack, parche de GUID, `ModOps` sobre assets vanilla.
- Parse profundo del grafo zlib más allá del scan de texto que ya existe.

Si un JSON trae `population`, `goods`, `warehouse`, `tradeRoutes` u otros extras, el ingest **los tira** y sigue con el contrato de arriba.
