# Techo de telemetría (Signal)

Harbor Buddy mira archivos. No toca el juego.

Comunidad: editores de plata, inject de Python y el loader Python de mods **tiran Anno**. Este techo es a propósito.

`pulseHint` (coins / houses) es opcional. El vigilante lo calcula desde señales reales del escaneo: `coins` del delta de dinero contra el escaneo anterior, `houses` de la presencia de residencias / mercado / pescadería. Sin señal clara queda `unknown` — **nunca adivina** `down`/`empty`. Campos: `docs/harbor-live-fields.md`. Schema: `docs/harbor-live.schema.json`.

## Obligatorio

- **Read-only en `.a7s`.** El vigilante lee el último save de **sesión** (ignora `accountdata.a7s`), unpack RDA V2.2 + FileDB, mapea GUIDs. Escribe solo `Documentos\Anno 1800\harbor-live.json` (tmp → fsync → replace, más last-good). Nunca escribe ni edita `.a7s`. FileDB **read** de GUIDs está permitido; parche de GUID no.
- **Sin Lua in-game.** `tools/harbor-buddy-telemetry/dump_live.lua` no entra al zip ni al instalador ni al `.bat` del vigilante. El loader oficial no documenta Lua; un dump al cargar tira el juego.
- **Sin inject.** No DLLs, no Anno Python API, no `ModOps` sobre assets vanilla, no parche de GUID.
- **El pack de telemetría es un stub.** `mod/harbor-buddy-telemetry` es XML vacío (`<ModOps></ModOps>`). No hace falta para el diario. Si Anno se cae, el mod se apaga y el vigilante sigue.

## Qué se envía al jugador

| Artefacto | Rol |
|---|---|
| `public/watch-harbor-live.bat` | Diario: file-watch only. Un solo archivo. |
| `public/watch-harbor-live.ps1` | Fuente del `.bat` (pack lo embebe). |
| `public/install-harbor-buddy.bat` / `.ps1` | Copia el zip stub a `mods\`. Borra `scripts/` legado si aparece. |
| `public/harbor-buddy-telemetry.zip` | Stub 0.2.0. Sin `.lua`. |
| `tools/harbor-buddy-telemetry/dump_live.lua` | **No shipped.** Hook futuro, si algún día hay uno seguro. |

`scripts/pack-mod.mjs` saltea `*.lua` y la carpeta `scripts/`. El test `scripts/telemetry-ceiling.test.mjs` falla si `dump_live.lua` aparece en zip o bats.

## Fuera de techo (no hacer)

- Money editors / trainers / hex-edit de saves.
- Python inject / mod-loader python.
- Cargar Lua desde el pack.
- Pedir el mod para que el vigilante funcione.
