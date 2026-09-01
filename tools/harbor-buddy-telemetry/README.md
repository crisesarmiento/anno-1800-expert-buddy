# dump_live.lua

No va adentro del pack que se instala en Anno. El loader oficial no documenta Lua en `scripts/` y un dump al cargar puede tirar el juego.

Si más adelante hay un hook seguro (consola / timer / ts.Quests), este archivo escribe `harbor-live-v1` en `Documentos\Anno 1800\harbor-live.json` y no inventa títulos.
