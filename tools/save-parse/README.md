# Save parse (más adelante)

Los `.a7s` de Anno 1800 **no se parsean en el navegador**.

Un watcher de Windows, en otra entrega, tiene que leer el guardado y emitir el mismo archivo que el mod de telemetría:

- nombre: `harbor-live.json`
- schema: `harbor-live-v1`
- `source`: `"save"`
- `game`: `"anno-1800"`
- `quests[]` con `title` sacado del diario, `state` `active` | `ready` | `done`

Harbor Buddy trata telemetría y save como el mismo import. Si alguien suelta un `.a7s` acá, se rechaza: no es el JSON.
