# Spike FileDB: nombres de isla + tradeRoutes

Read-only. Docs + reader utilitario + tests. **No** UI, **no** merge de schema, **no** rutas inventadas, **no** Lua/DLL, **no** write a `.a7s`.

Fecha: 2026-09-14 (abierta) → 2026-09-14 (cerrada contra save real). Card: `t_406205df`.

## Preguntas

1. ¿El save de sesión guarda el nombre que el jugador le pone a la isla (p.ej. La Inapetente)?
2. ¿Hay paths de rutas de comercio / estaciones que el walker pueda leer sin inject?

## Método

- Walker propio: `src/lib/live/a7s-read.ts` + `a7s-snapshot.ts` (RDA V2.2 → FileDB, un nivel).
- Probe nuevo (este PR): `scripts/filedb-probe.ts` — reentra cualquier leaf cuyo payload sea a su vez un FileDB (trailer `0xfffffffd`), no solo los que se llaman literalmente `BinaryData`.
- Notas previas: `docs/telemetry-ceiling.md`, `docs/harbor-live-fields.md`, `tools/save-parse/README.md`.
- Parser comunitario 1800 (no 117): NiHoel `Anno1800SavegameVisualizer` `tools/a7s_model.py`.
- Save real usado para cerrar el loop: `tmp-saves/Cristian-Sarmien17.a7s` (copia read-only, **no** commiteada — ver `.gitignore`).

## Lo que el walker de Harbor ya ve (código, origin/main)

`scanSaveBytes` recorre **solo** el FileDB de primer nivel de `meta.a7s` y `data.a7s`. No entra a blobs anidados. Esto sigue igual — este PR agrega un reader nuevo y separado (`a7s-trade-routes.ts`), no toca `scanSaveBytes`.

| Attr / path | Qué hace hoy | Es el nombre de isla del jugador? |
|---|---|---|
| `meta.a7s` / `CorporationSaveGameName` | `sessionName` (título del save) | No |
| `CurrentlyActiveSession`, `LastActiveSession`, `StartSessionGUID` | GUID de **sesión** (Old World / New World / …) → `catalog.islands` | No. `islandName` = primer hit de región, no “La Inapetente” |
| `CountsPerGUID` | edificios | No |
| `StrgLrg` | stock + dinero | No |
| `QuestGUID` / `QuestID` | quests | No |
| `ParticipantID` | 0 = humano (economía) | No |

`docs/harbor-live-fields.md` ya dice: `islandName` = primer hit de catálogo; `tradeRoutes` en el JSON **se tira** en ingest.

## Probe contra save real (`Cristian-Sarmien17.a7s`)

RDA: `meta.a7s, header.a7s, gamesetup.a7s, data.a7s`. Reentrada nested FileDB: **3 blobs**, profundidad máx. 1 (un solo nivel de `BinaryData` anidado en este save).

### Nombres de isla (`CityName` / `CityNameGuid`) — CONFIRMADO parcial

El path predicho por la comunidad **se confirma exacto**:

```
data.a7s
  MetaGameManager
    GameSessions / tag_1
      SessionData [BinaryData → reentra FileDB anidado]
        GameSessionManager
          AreaInfo / tag_1        ← 67 registros en este save
            CityNameGuid          → CONFIRMADO: presente, int32 (guid loca)
            Owner / id            → CONFIRMADO: sibling, int32
            CityName              → NOT FOUND (ni como attr, ni en el dict de nombres)
```

- `CityNameGuid`: **67 hits**, todos en profundidad 1 dentro del `BinaryData` de `SessionData`, exactamente donde la comunidad predijo.
- `CityName`: **ausente por completo** — ni un solo leaf, y el nombre `CityName` ni siquiera aparece en el diccionario de tags/attrs del FileDB (que sí lista nombres no usados activamente cuando el save los serializó alguna vez). Lectura más simple: **este jugador nunca renombró una isla** en esta partida, así que el juego nunca escribió el attr. Esto **no invalida** el tag (NiHoel lo documenta para 1800), pero tampoco lo confirma con datos reales — sigue sin verse un `CityName` poblado.
- **Producto:** sin un save con al menos una isla renombrada, no se puede confirmar el formato de `CityName` poblado. `islands[].name` sigue sin mergear al schema.

### Rutas / estaciones (jugador) — CONFIRMADO, con una corrección al doc original

**Corrección:** el doc original asumía que `SessionTradeRouteManager` vivía anidado en `BinaryData` junto a `CityName`. **Es falso** — en el save real, `SessionTradeRouteManager/RouteMap` vive en el **nivel superior** de `data.a7s` (profundidad 0), sin reentrar ningún `BinaryData`:

```
data.a7s
  MetaGameManager
    SessionTradeRouteManager
      RouteMap / (57 registros en este save)
        ID                    → CONFIRMADO int32
        Name                  → CONFIRMADO utf16 (ver nombres reales abajo)
        IsDefaultName         → CONFIRMADO bool (los 57 = true en este save)
        Owner / id            → CONFIRMADO int32
        Ships                 → CONFIRMADO: array int64 packed (ids de barco, p.ej. [113, 273])
        Stations / (N por ruta)
          AreaID              → CONFIRMADO int32 (isla real)
          GoodInfos / (M por estación)
            ProductGUID       → CONFIRMADO int32
            Amount            → CONFIRMADO int32
```

- 57 rutas leídas. Nombres reales encontrados (no inventados): *"Noz - Hot"*, *"Pra - Str"*, *"Ron Tri - Por"*, *"Caña de azúcar Tri - Por"*, *"Lúpulo Les - La"*, *"Pescado Pra - Wan"*, etc. Son nombres **automáticos** del juego (abreviatura de isla origen/destino, a veces con el bien principal) — `IsDefaultName` es `true` en las 57, es decir, **el jugador tampoco renombró manualmente ninguna ruta** en este save. Son reales y útiles para mostrar, pero no son "nombres puestos por el jugador"; no confundir con lo que pediría la pregunta 1 para islas.
- 25/57 rutas tienen `GoodInfos` poblado con guid/amount reales; el resto son rutas nuevas/incompletas (plantilla, sin bienes asignados todavía).
- `Ships` decodificado y verificado con hex dump manual contra el buffer crudo (no solo con el parser) antes de confiar en el reader.

Barcos (para atar buque ↔ ruta), también anidados — **CONFIRMADO**, path exacto:

```
GameSessionManager / AreaManagers/AreaManager_3/AreaObjectManager/GameObject/objects/tag_1
  Nameable / VehicleName        → utf16, CONFIRMADO. 72 hits reales: "Empresa", "Gorgona", "Campeón", "Ventolera", "Salvaje", "Olimpia", "Heraldo", "Cangrejo Sucio", "Conflicto", "Tiburón Tosco", …
```

Historia pasiva (no es la ruta activa): `PassiveTrade/History/TradeRouteEntries` — no se re-probó, sigue fuera de scope (no es el menú de rutas).

Lua in-game (`ts.TradeRoute.GetRoute`) **queda fuera de techo**. No es path FileDB.

## Reader agregado en este PR (gateado, sin schema/UI)

- `src/lib/live/a7s-read.ts`: `parseNestedFileDbTree` + `isNestedFileDb` — generaliza `visitFileDb` a un árbol real (en vez de un callback plano) y reentra automáticamente cualquier leaf cuyo payload sea un FileDB anidado. Necesario porque el path plano (string) no distingue registros hermanos repetidos (todos comparten el mismo tag id) — el árbol sí, vía `children[]`.
- `src/lib/live/a7s-trade-routes.ts`: `extractTradeRoutes(dataBytes)` — usa el árbol para devolver `{ id, name, isDefaultName, ownerId, shipIds, stations: [{ areaId, goods: [{ guid, amount }] }] }[]`. Verificado manualmente contra `tmp-saves/Cristian-Sarmien17.a7s` (57 rutas, matchea el probe) — ese chequeo fue manual/descartable, **no** vive en el repo como test (no se puede depender de un save real committeado).
- Tests: `src/lib/live/a7s-nested.test.ts`, `src/lib/live/a7s-trade-routes.test.ts` — fixtures FileDB armados a mano (encoder mínimo dentro del test), **no** el save completo.
- **Deliberadamente no wireado** a `a7s-snapshot.ts` / `LiveSnapshot` / UI / `harbor-live.schema.json`. Motivo: aunque `tradeRoutes` está confirmado y leíble, todavía no hay decisión de producto sobre cómo presentarlo (nombres son auto-generados, no del jugador; falta manejar `Owner/id` real de jugador vs NPC con datos reales — ver abajo). Eso es el follow-up.

## Pendiente para el follow-up (no en este PR)

- El umbral `Owner/id < 4 = jugador` (NiHoel) **se sostiene** en este save: `ownerId` distintos van de 0 a 101, y **`0` es el único valor bajo `4`** — con 11 rutas, todas con nombres reales y específicos (`"Lúpulo Les - La"`, `"Jabón Les - La"`, …), vs. el resto de owners (13, 16, 17, 18, 19, 21, 22, 24, 25, 27, 62, 63, 87, 97, 99, 100, 101) que tienen 1–16 rutas cada uno y probablemente son IA/rivales. `0` también matchea la convención ya usada en `a7s-snapshot.ts` (`ParticipantID === 0` = humano). Falta: confirmar esto contra un segundo save (uno solo no prueba el patrón) antes de hardcodear el filtro en el schema.
- Confirmar `CityName` poblado con un save que tenga al menos una isla renombrada.
- Recién ahí: `telemetry.islands[].name` y `tradeRoutes[]` al schema (`harbor-live.schema.json`) + UI.

## Cómo re-probar (read-only)

1. Copiar un `.a7s` de sesión (Ctrl+F5 / Autosave, no `accountdata.a7s`) a `tmp-saves/` (gitignored, nunca commitear).
2. `node --experimental-strip-types scripts/filedb-probe.ts tmp-saves/<archivo>.a7s`.
3. Revisar hits de `CityName`/`CityNameGuid`/rutas/nombres de barco en la salida.
4. No `xml2a7s`, no pack, no Lua, no escribir el `.a7s`.

## Verdict: PARTIAL → cerrado con datos reales

- **VALIDATED (código, este save):** reentrada a `BinaryData` funciona; `CityNameGuid` confirmado anidado donde predijo la comunidad; `SessionTradeRouteManager/RouteMap/Stations/GoodInfos` confirmado — pero en el **nivel superior**, no anidado (corrección al doc original); `Ships` y `VehicleName` confirmados.
- **INVALIDATED (parcial):** el supuesto de que rutas vivían anidadas en `BinaryData` — no, viven en el nivel superior de `data.a7s`.
- **INCONCLUSO:** `CityName` poblado (rename real de isla) — no aparece en este save porque el jugador nunca renombró una isla; no se puede confirmar su formato de wire sin un save que lo tenga.
- **Producto:** reader + tests agregados y gateados (no wireados a schema/UI). Comercio sigue siendo tips/link-out wiki hasta que el follow-up resuelva el filtro de `ownerId` real de jugador y un save con `CityName` poblado.
