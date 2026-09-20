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
| Spike anidado (investigación) | `src/lib/live/a7s-trade-routes.ts`, `src/lib/live/a7s-islands.ts`, `scripts/filedb-probe.ts` | Rutas + islas anidadas. El writer de Windows es C# + `.ps1` | No |
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
| `quests[]` | Vigilante: siempre `[]`. Parser TS: GUIDs de quest **sin estado**. JSON: títulos + `state`; opcionales `instanceId`, `guid`, `type`, `objectives`, `progress`, `timer` si vienen decodificados | Instancia si hay `instanceId` (repite GUID). Sin instancia, el GUID no prueba activo | título + estado declarado; progreso/temporizador congelados en el save | `savedAt` si save-read | Watcher: lista vacía a propósito. Save-read: solo con campos de instancia/estado. Manual: checklist rotulada | no disponible (watcher); parcial (JSON explícito); validado (semántica: ausencia ≠ hecha, edificio ≠ completa) |
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
| `telemetry.routes` | `SessionTradeRouteManager/RouteMap`, `ownerId === 0` | Ruta del jugador; paradas con `areaId` crudo | barcos, paradas, GUIDs configurados | `savedAt` | Watcher C# | validado (estructura) |
| `telemetry.routes[].stops[].goods[].isLoading` | `GoodInfos/IsLoading` (1 byte) | Parada / bien | bool crudo | `savedAt` | Si el save lo escribió | validado (`false` = descarga). **no disponible** si el campo falta: no se infiere carga |
| `telemetry.routes[].ships[].name` | `Nameable/VehicleName` + `PropertyTradeRouteVehicle/TradeRouteID` | Barco en esa ruta | texto del save | `savedAt` | Si el join por id de ruta es único | validado (nombre). Los ids de `Ships` **no** matchean el `ID` del GameObject en el save contrastado |
| `telemetry.routes[].delivery` | `PassiveTrade/History/TradeRouteEntries` (finalizadas) | Ruta; `GoodAmount` con signo respecto de la isla que guardó la visita | visitas, mediana \|cantidad\|, último amount, intervalo de `ExecutionTime` | `simTime` / `ExecutionTime` | Si hay visitas finalizadas | validado (visitas). **inferido** el t/min. no es capacidad nominal ni abastecimiento garantizado |
| Throughput de ruta | Derivado opcional en UI (`medianAbsAmount / interval`) | Ruta | t/min inferidos | reloj de simulación | Sólo con visitas e intervalo | inferido; Taller no lo usa como transporte real |
| Dirección de carga si `IsLoading` ausente | — | Parada | — | — | En el save contrastado la mitad de los bienes omiten el campo y nunca se vio `IsLoading=1` | no disponible |
| `telemetry.production` | OCR Producción + Finanzas | Isla seleccionada en pantalla | t/min leídos, % , conteo | `observedAt` / `buildingCountObservedAt` | OCR; consejo solo con ambos | parcial (lectura); **inferido** el consejo de construir/pausar |
| `economy.treasury` | `GUID 1010017` en `StrgLrg` del **ParticipantID 0** | Jugador, tesorería global. Sidecar `harbor-live.money.json` sigue siendo solo el delta de `pulseHint.coins` | monedas (entero, puede ser negativo) | `savedAt` | Opcional; se omite si el dueño no es player. Ingreso/mantenimiento **no disponible** (`TaxBalance` vive en `ConstructionAI`, no en islas `ownerId=0`) | parcial |
| Nombre de isla del jugador (`CityName`) | FileDB anidado `AreaInfo` | Isla / `Owner` | texto del jugador, o `[CityNameGuid]` si no hay traducción | `savedAt` | C# + TS leen `CityName` / `CityNameGuid`; sin traducción no se inventa nombre | parcial |
| `islandSnapshots[]` | `GameSessions` → `SessionData` → `AreaInfo` + `AreaManager_{areaId}` | Clave `regionId`+`areaId`; stock por `AreaStorageManager` si está | enteros del save | `savedAt` | Opcional; JSON heredado sigue válido | parcial |
| `campaignId` / `playerId` / `snapshotId` / `simTime` | Save cuando el campo existe. `simTime`: `lastSnapshot` global o el máximo `SessionTotalTime` (int64) por sesión | Campaña/jugador/reloj de simulación | id o tick | `savedAt` | `campaignId` no se lee del save; filename/mtime no identifican campaña ni orden. Sin reloj, el historial no abre rama ni calcula deltas | parcial |
| Historial IndexedDB | Módulo `src/lib/history` | Por campaña y rama; no es `harbor-live.json` | resumen + tesorería opcional | `savedAt` / `simTime` / fecha de ingest | Local, ~200 muestras, dedupe, rama si el save es anterior | validado (código) |
| Ingresos / mantenimiento / gasto militar | `TaxBalance` / `Income` / `Expenses` / `ShipMaintenance` en FileDB | Sin dueño jugador demostrable (ConstructionAI / AreaManager_3, no colonias `ownerId=0`) | float32 o entero | — | Etapa 2 no los publica. ConstructionAI sigue **no disponible** | no disponible |
| `telemetry.fleet[]` | GameObject con `Nameable/VehicleName` + `Owner/id === 0` | Jugador, casco. Tipo por GUID de catálogo. Asignación si hay `TradeRouteID`. Lugar = `AreaManager_*` | texto / GUID / área | `savedAt` | Opcional; se omite sin dueño player. El mantenimiento de catálogo **no** se escribe en el JSON | parcial |
| Mantenimiento de flota (UI) | Catálogo wiki `Ships_properties` por GUID leído | Inferido; no es `ShipMaintenance` del save | monedas / min | catálogo | Taller, si hay barcos player y cifra wiki. No se duplica con `routes[].ships` | inferido |
| Cobertura militar (diplomacia / defensas / escolta) | — | No hay relaciones, cañones ni escolta leídos. Función manual por barco | — | — | «riesgo no evaluable». Ausencia de enemigos ≠ seguridad | no disponible |
| Estado real de misión (activa/hecha) | GUID en el save no prueba estado. Completada sólo con `state: "done"` explícito. Ausencia en una muestra ≠ hecha | Instancia (`instanceId`) | — | `savedAt` | Watcher emite `quests: []`. Un save anterior no hereda completadas futuras | no disponible (watcher); validado (semántica de fixtures) |
| Capacidad nominal del barco | `StackLimit` / slots del catálogo o carga planificada | Barco | t por viaje | — | `PlannedLoad` aparece vacío o sin GUIDs útiles en el save contrastado | no disponible |
| Escenario producir/importar | Catálogo wiki + observaciones (demanda/capacidad/rutas). Motor puro en `src/lib/scenario/` | Isla elegida + bien | créditos, t/min, mano de obra | `savedAt` / OCR `observedAt` si hay | Taller. Inferido. Stock ≠ excedente. Transporte = parámetro manual explícito; las visitas observadas no se usan como t/min reales | parcial (catálogo); no disponible (fertilidad, pausas, capacidad nominal) |

## Reglas de honestidad (código)

1. **Quests.** Tres canales: **sugerencia** (edificios/matcher, nunca “misión completada”), **confirmación manual** (checklist rotulada) y **save-read** (sólo con instancia/estado decodificados). El vigilante escribe `quests: []`. Un GUID de quest en el FileDB no se publica como `state: "active"`. Ausencia ≠ hecha. Un temporizador del save no corre en la app. Requisitos confirmados son reservas sugeridas: no se descuentan del stock leído. Quests desconocidas conservan `instanceId`/`guid`/título.
2. **Islas.** `islandName` y `telemetry.islands` son región/sesión. Las colonias viven en `islandSnapshots` (región + área). El OCR sólo se asocia si el nombre visible mapea a **una** isla; un nombre duplicado no basta.
3. **Dinero y bienes.** Sin `ParticipantID === 0` no hay tesorería ni stock para diagnóstico. No se toma el máximo de todos los `StrgLrg`. `economy.treasury` se omite; `pulseHint.coins` queda `unknown`. Taller no inventa inventario a 0. Ingreso/mantenimiento no se publican sin dueño jugador.
4. **Producción.** Capacidad vs demanda del OCR es **inferida**. No afirma excedente exportable ni justifica pausar sin dependencias.
5. **Rutas.** Configurada ≠ abastecimiento garantizado. `IsLoading` ausente no se rellena. Entregas observadas (visitas finalizadas) no son capacidad nominal. Un `goodsChanges` global no prueba que esa ruta haya causado la caída. El OCR no prueba una ruta.
6. **Mod vs lector.** XML vacío ≠ inject. El writer es el vigilante externo.
7. **Flota.** Solo `Owner/id === 0`. Un barco en `telemetry.routes` y en `telemetry.fleet` es el mismo casco: no se suma dos veces. El mantenimiento wiki es **inferido**. ConstructionAI `ShipMaintenance` no se publica. Escolta/defensa nunca es «sobrante». Sin diplomacia/defensas/escolta leídas el consejo queda en «riesgo no evaluable». Ausencia de enemigos ≠ seguridad. Cero acciones automáticas sobre el juego.

## Contraste pendiente (no bloquea etapa 0)

Con copias locales gitignored en `tmp-saves/`: dos islas, el mismo bien, una ruta, guardar/cargar, un cambio de dinero conocido. Hasta entonces ningún campo de partida viva se marca **validado** más allá de la estructura de rutas ya cerrada en `docs/filedb-spike-routes.md`.
