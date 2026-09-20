# Matriz de evidencia — harbor-live-v1

Fecha: 2026-09-19. Etapa 0 del plan `docs/plan-asesor-imperio.md`.
Contrato JSON: `docs/harbor-live.schema.json`. Campos heredados: `docs/harbor-live-fields.md`.

Un valor desconocido **nunca** se convierte en `0`, lista vacía con significado de “cero existencias”, ni tesorería confirmada. Si no hay propietario o ámbito, el campo se omite o queda `unknown`.

Estados: **validado** (leído y contrastado con semántica clara), **parcial** (se lee algo, pero el ámbito, el dueño o la unidad no cierran), **no disponible** (el lector actual no lo extrae).

No hay saves reales en este repositorio. Lo **validado** acá es semántica de código, fixtures y el spike FileDB ya cerrado. Los campos de partida viva siguen **parcial** hasta un contraste local (Estadísticas, dos islas, un bien, una ruta, guardar/cargar).

## Quién lee qué (auditoría)

| Camino | Archivos | Rol | Escribe `harbor-live.json`? |
| --- | --- | --- | --- |
| Vigilante de Windows | `public/watch-harbor-live.ps1` → `.bat` empaquetado; `src/lib/live/a7s-scan.cs` (pack copia a `public/a7s-scan.cs`) | Producto: lee el `.a7s` / `.save` más reciente, solo lectura | Sí, único writer |
| Ingest del navegador | `src/lib/live/validate.ts` | Normaliza JSON ya escrito. No parsea el save | No |
| Utilidad TypeScript (investigación) | `src/lib/live/a7s-snapshot.ts`, `a7s-read.ts` | Recorre FileDB de primer nivel. **No** es el writer de Windows | No |
| Spike anidado (investigación) | `src/lib/live/a7s-trade-routes.ts`, `scripts/filedb-probe.ts` | Rutas anidadas / `CityNameGuid`. No está cableado al snapshot de producto | No |
| Mod XML | `mod/harbor-buddy-telemetry/.../assets.xml` | `<ModOps></ModOps>` vacío. No inyecta, no dump, no Lua | No |
| OCR opcional | UXEnhancer `Server.exe` vía el vigilante | Pantalla Estadísticas de **una** isla visible | Enriquecer `connection.native` y `telemetry.production` |

El diario vive si el vigilante corre. El mod vacío no es fuente de datos. No confundir “mod instalado” con “hay telemetría”.

`a7s-snapshot.ts` puede divergir del scanner C#. Para lo que ve el jugador en Windows, manda C# + el `.ps1`. El TypeScript sirve para tests, semántica y prototipos. Etapa 0 los alinea en honestidad (dueño, quests, islas), no en extraer islas reales (eso es etapa 1).

## Matriz

| Campo | Origen | Ámbito / dueño | Unidad | Fecha | Disponibilidad | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| `schema` | Constante `harbor-live-v1` | Documento | — | — | Siempre | validado |
| `source` | Writer: vigilante `save`; pegado/ejemplo `file` | Documento | enum | — | Siempre | validado |
| `updatedAt` | Reloj al escribir el JSON | Writer, no el juego | ISO-8601 UTC | Escritura | Siempre | validado |
| `savedAt` | `mtime` del `.a7s` / `.save` parseado | Filesystem | ISO-8601 UTC | Archivo | Si el vigilante parseó un save | validado |
| `game` | Constante `anno-1800` | Documento | — | — | Siempre | validado |
| `sessionName` | `CorporationSaveGameName` o basename | Campaña/archivo, no isla | texto | `savedAt` | Si el save lo trae | parcial |
| `islandName` | Primer hit de catálogo (`CurrentlyActiveSession` / `LastActiveSession` / `StartSessionGUID`) | **Región/sesión** (Old World, New World, Bright Sands). **No** es el rename del jugador | texto de sesión | `savedAt` | Si hay GUID de sesión mapeado | parcial |
| `quests[]` | Vigilante: siempre `[]`. Parser TS: GUIDs de quest **sin estado**. JSON manual: títulos explícitos | Sin instancia ni progreso | título + `state` declarado | — | Watcher: lista vacía a propósito. Manual: solo si el JSON lo trae | no disponible (save); parcial (JSON explícito) |
| `pulseHint.coins` | Delta del dinero **del participante 0** contra el sidecar `harbor-live.money.json` | Jugador, tesorería global (no isla). Sidecar interno, fuera del schema | `unknown` / `up` / `down` | Entre dos escaneos con dueño player | Solo si el scanner atribuyó dinero al jugador | parcial |
| `pulseHint.houses` | Presencia de residencias + mercado + pescadería o stock de pescado **player** | Presencia global del save, no una isla | `unknown` / `ok` / `yellow` / `empty` | `savedAt` | Si hay edificios en el escaneo | parcial |
| `workforce.*` | Presencia de casas farmer/worker/artisan/engineer | Presencia global | `true` o ausente (nunca `false` inventado) | `savedAt` | Si el GUID está en `CountsPerGUID` | parcial |
| `connection.mode` | Extensión y origen del archivo | local / cloud / native / manual | enum | escritura | Si el vigilante o el ingest lo setean | validado |
| `connection.fileName` | Basename, sin ruta de usuario | Archivo | texto | — | Watcher | validado |
| `connection.*Count` | Conteos del escaneo | Resumen, no inventario | entero ≥ 0 | `savedAt` | Watcher | parcial |
| `connection.native` | Última observación OCR **válida** | Isla visible en Estadísticas, no todas | provider/view/isla | `observedAt` | OCR opt-in; no se borra al fallar el sondeo | parcial |
| `connection.nativeProbe` | Último HTTP a `127.0.0.1:8000` | Técnico, no estado de juego | `reachable` / `unreachable` / `invalid_response` | `lastProbeAt` | Watcher con OCR | validado |
| `telemetry.buildings` | `CountsPerGUID` + catálogo | Presencia **global** (mezcla islas). `count` opcional | id/nombre; count si > 0 | `savedAt` | GUIDs mapeados | parcial |
| `telemetry.people` | GUIDs NPC | Hit, no diplomacia | id/nombre | `savedAt` | Casi vacío en el watcher | no disponible |
| `telemetry.chains` | Derivado de edificios mapeados | Presencia de cadena, no t/min | id/nombre | `savedAt` | Si hay edificios de esa cadena | parcial |
| `telemetry.islands` | Mismos GUIDs de sesión que `islandName` | **Región/sesión**, no colonia del jugador | id/nombre de catálogo | `savedAt` | Si hay sesión mapeada | parcial |
| `telemetry.hints` | Residencias / schnapps / steel vistos | Presencia | token | `savedAt` | Derivado | parcial |
| `telemetry.goods` | `StrgLrg` del **ParticipantID 0**. Si el dueño no es 0, se **omite** (no se rellena con 0 ni con el máximo ajeno) | Jugador, stock **global**, no por isla | enteros del save | `savedAt` | Solo con dueño player | parcial |
| `telemetry.goodsChanges` | Diff de `goods` entre dos saves de la misma `sessionName` | Global jugador; no prueba una ruta | delta + `previousSavedAt` | par de `savedAt` | Si hay dos muestras comparables | parcial |
| `telemetry.routes` | `SessionTradeRouteManager/RouteMap`, `ownerId === 0` | Ruta del jugador; paradas con `areaId` crudo | barcos, paradas, GUIDs configurados | `savedAt` | Watcher C# | validado (estructura); no disponible (dirección/throughput) |
| `telemetry.production` | OCR Producción + Finanzas | Isla seleccionada en pantalla | t/min leídos, % , conteo | `observedAt` / `buildingCountObservedAt` | OCR; consejo solo con ambos | parcial (lectura); **inferido** el consejo de construir/pausar |
| Tesorería absoluta | Candidatos `GUID 1010017` en `StrgLrg` | Antes: máximo ciego (inválido). Ahora: solo participante 0, o ausente | monedas | — | No entra al JSON público | parcial |
| Nombre de isla del jugador (`CityName`) | FileDB anidado `AreaInfo` | Isla / `Owner` | texto o guid loca | — | Spike: `CityNameGuid` sí, `CityName` poblado no contrastado | no disponible |
| `islandSnapshots[]` | — | — | — | — | Etapa 1, no este PR | no disponible |
| Ingresos / mantenimiento / gasto militar | — | — | — | — | Etapa 2–6 | no disponible |
| Estado real de misión (activa/hecha) | GUID en el save no prueba estado | Instancia | — | — | Watcher emite `quests: []` | no disponible |
| Throughput de ruta | — | — | t/min reales | — | Ni save ni OCR | no disponible |

## Reglas de honestidad (código)

1. **Quests.** El vigilante escribe `quests: []`. Un GUID de quest en el FileDB no se publica como `state: "active"`. El matcher por edificios es **sugerencia** (`kind: "suggested"`): no completa el diario ni traba la campaña. Solo un JSON con títulos explícitos puede confirmar una etapa.
2. **Islas.** `islandName` y `telemetry.islands` son región/sesión. No se usan como identidad de colonia ni como foco de isla. El nombre OCR (`connection.native.islandName`) es la isla **visible** en Estadísticas, otra fuente.
3. **Dinero y bienes.** Sin `ParticipantID === 0` no hay tesorería ni stock para diagnóstico. No se toma el máximo de todos los `StrgLrg`. `pulseHint.coins` queda `unknown`. Taller no inventa inventario a 0.
4. **Producción.** Capacidad vs demanda del OCR es **inferida**. No afirma excedente exportable ni justifica pausar sin dependencias.
5. **Mod vs lector.** XML vacío ≠ inject. El writer es el vigilante externo.

## Contraste pendiente (no bloquea etapa 0)

Con copias locales gitignored en `tmp-saves/`: dos islas, el mismo bien, una ruta, guardar/cargar, un cambio de dinero conocido. Hasta entonces ningún campo de partida viva se marca **validado** más allá de la estructura de rutas ya cerrada en `docs/filedb-spike-routes.md`.
