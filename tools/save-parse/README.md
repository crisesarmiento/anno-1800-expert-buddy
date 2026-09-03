# Save parse

Los `.a7s` de Anno 1800 **no se parsean en el navegador**. Techo Signal: `docs/telemetry-ceiling.md` (read-only, sin Lua/DLL/Python).

El loader oficial **no corre Lua**, así que el mod XML no escribe `harbor-live.json`.

El vigilante de Windows (`watch-harbor-live.ps1`) sugiere el `.a7s` más reciente por mtime bajo `Documentos\Anno 1800\accounts` (también OneDrive y la clave de registro Personal). Si no hay, pide la carpeta a mano (mismo browse de siempre). Lee ese save, busca títulos de campaña y escribe el mismo archivo que pedía la telemetría:

- nombre: `harbor-live.json`
- schema: `harbor-live-v1` (`docs/harbor-live.schema.json`)
- `source`: `"save"`
- `game`: `"anno-1800"`
- `updatedAt` (escritura del JSON) y `savedAt` (mtime del `.a7s`)
- `sessionName`: basename del `.a7s`
- `islandName`: primer hit de isla del catálogo, si hay
- `workforce`: presencia `farmers` / `workers` / `artisans` / `engineers` (sin conteos)
- `quests[]` con `title` y `state` `active` | `done`
- `telemetry` de buildings / people / chains / islands / hints

Lista have vs refused: `docs/harbor-live-fields.md`.

Si aparecen demasiados títulos (tabla de textos del juego), no adivina: dejá el JSON vacío y usá el buscador.

Harbor Buddy trata telemetría y save como el mismo import. Si alguien suelta un `.a7s` acá, se rechaza: no es el JSON.

El vigilante **no escribe** `.a7s` y **no manda F5**.
