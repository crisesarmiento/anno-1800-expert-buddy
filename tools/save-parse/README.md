# Save parse

Los `.a7s` de Anno 1800 **no se parsean en el navegador**.

El loader oficial **no corre Lua**, así que el mod XML no escribe `harbor-live.json`.

El vigilante de Windows (`watch-harbor-live.ps1`) lee el último `.a7s` en `Documentos\Anno 1800\accounts`, busca títulos de campaña y escribe el mismo archivo que pedía la telemetría:

- nombre: `harbor-live.json`
- schema: `harbor-live-v1`
- `source`: `"save"`
- `game`: `"anno-1800"`
- `quests[]` con `title` y `state` `active` | `done`

Si aparecen demasiados títulos (tabla de textos del juego), no adivina: dejá el JSON vacío y usá el buscador.

Harbor Buddy trata telemetría y save como el mismo import. Si alguien suelta un `.a7s` acá, se rechaza: no es el JSON.
