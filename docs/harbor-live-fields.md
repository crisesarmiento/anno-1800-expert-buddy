# harbor-live.json — campos

Contrato del snapshot `harbor-live-v1`. El vigilante lee el último `.a7s` de **sesión** (no `accountdata.a7s`): contenedor Resource File V2.2 → FileDB, GUIDs del catálogo. El juego guarda con **Ctrl+F5** (F5 es cámara) o autoguardado. El mod instalable es XML vacío: no inyecta, no Lua, no parche de GUID.

Techo Signal (read-only, sin Lua/DLL/Python): `docs/telemetry-ceiling.md`.
Schema: `docs/harbor-live.schema.json`.

## Lo que sí hay

| Campo | Origen hoy | Notas |
|---|---|---|
| `schema` | fijo `harbor-live-v1` | Version field. Sin este const el ingest rechaza. |
| `source` | `save` / `telemetry` / `file` | El watcher escribe `save`. |
| `updatedAt` | reloj al escribir el JSON | Se conserva. |
| `savedAt` | mtime UTC del `.a7s` | Filesystem. No parsea el binario. |
| `game` | fijo `anno-1800` | |
| `sessionName` | basename del `.a7s` | p.ej. `Autosave`. No es el título interno de sesión. |
| `islandName` | primer hit `catalog.islands` | Igual que `telemetry.islands[0].name`. |
| `quests[]` | GUID de quest mapeado (tabla chica) | `title` en el idioma del juego + `state`. Crece cuando aparece un GUID nuevo. |
| `pulseHint` | `coins` desde el delta de dinero contra el escaneo anterior; `houses` desde presencia (residencias, mercado, pescadería/stock de pescado) | Sin señal clara, queda `unknown`. Nunca adivina `down`/`empty`. |
| `workforce` | hints `farmers` / `workers` / `artisans` / `engineers` | **Presencia** (`true`). Sin números. |
| `telemetry.buildings` | `CountsPerGUID` → tabla GUID | Presencia. Nombres en inglés si el juego está en inglés. |
| `telemetry.people` | GUIDs NPC mapeados | NPCs como hit, no rutas. |
| `telemetry.chains` | si hay edificios de esa cadena | |
| `telemetry.islands` | GUIDs de sesión (Europe / New World / …) | |
| `telemetry.hints` | residencias farmer/worker/… | |
| `telemetry.goods` | `StrgLrg` pares GUID+amount | Stock. Sandbox lo muestra; la campaña no hereda tips de producción. |

El dump Lua (`tools/harbor-buddy-telemetry/dump_live.lua`) **no va en el zip**. Si algún día hay hook seguro, escribe el mismo schema y no inventa títulos. El `modinfo` 0.2.0 sigue vacío (`<ModOps></ModOps>`).

## Lo que se rechaza (a propósito)

No se agregan aunque el `.a7s` “los tenga” por dentro:

- Conteos de población por casa (sí hay residencias y `goods`; no hay barra amarilla de necesidad todavía).
- Rutas NPC y colas de fábrica hasta que el walker vea el path en un save.
- Spoilers de diario más allá de GUIDs de quest mapeados.
- Inject: Lua en el pack, parche de GUID, `ModOps` sobre assets vanilla.
- Write al `.a7s`.

Si un JSON trae `population`, `goods`, `warehouse`, `tradeRoutes` u otros extras, el ingest **los tira** y sigue con el contrato de arriba.

## Escritura crash-safe

El vigilante es el **único writer**. Chip Actualizar / File System Access solo leen.

1. Escribe `harbor-live.json.tmp` en el mismo directorio (mismo volumen).
2. `Flush($true)` (fsync a disco).
3. `File.Replace` con un `.bak` (nunca `$null`: PowerShell 5.1 lo vuelve `""` y tira "path is not of a legal form"). Si OneDrive rechaza ReplaceFile, `Copy` overwrite. Luego `Move` si el destino no existía.
4. Repite para `harbor-live.last-good.json` con los mismos bytes.

Si `harbor-live.json` queda truncado, el ingest usa last-good y **no** pinta un empty-state de error. Schema version: `harbor-live-v1`.
