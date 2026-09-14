# Spike FileDB: nombres de isla + tradeRoutes

Read-only. Docs + findings. **No** UI, **no** merge de schema, **no** rutas inventadas, **no** Lua/DLL, **no** write a `.a7s`.

Fecha: 2026-09-14. Card: `t_406205df`.

## Preguntas

1. ¿El save de sesión guarda el nombre que el jugador le pone a la isla (p.ej. La Inapetente)?
2. ¿Hay paths de rutas de comercio / estaciones que el walker pueda leer sin inject?

## Método

- Walker propio: `src/lib/live/a7s-read.ts` + `a7s-snapshot.ts` (RDA V2.2 → FileDB, un nivel).
- Notas previas: `docs/telemetry-ceiling.md`, `docs/harbor-live-fields.md`, `tools/save-parse/README.md`.
- Parser comunitario 1800 (no 117): NiHoel `Anno1800SavegameVisualizer` `tools/a7s_model.py`.
- Save local: se buscó `Documents/Anno 1800`, OneDrive, Steam, Projects, DATA, workspaces Hermes. **Ningún `.a7s` de sesión en esta Mac.**

## Lo que el walker de Harbor ya ve (código, origin/main)

`scanSaveBytes` recorre **solo** el FileDB de primer nivel de `meta.a7s` y `data.a7s`. No entra a blobs anidados.

| Attr / path | Qué hace hoy | Es el nombre de isla del jugador? |
|---|---|---|
| `meta.a7s` / `CorporationSaveGameName` | `sessionName` (título del save) | No |
| `CurrentlyActiveSession`, `LastActiveSession`, `StartSessionGUID` | GUID de **sesión** (Old World / New World / …) → `catalog.islands` | No. `islandName` = primer hit de región, no “La Inapetente” |
| `CountsPerGUID` | edificios | No |
| `StrgLrg` | stock + dinero | No |
| `QuestGUID` / `QuestID` | quests | No |
| `ParticipantID` | 0 = humano (economía) | No |

`docs/harbor-live-fields.md` ya dice: `islandName` = primer hit de catálogo; `tradeRoutes` en el JSON **se tira** en ingest.

## Paths esperados (comunidad 1800) — no confirmados en un `.a7s` de Cristian

NiHoel parsea XML FileDB **después** de unpack RDA + decompress + FileDBReader. Los nombres de isla y las rutas **no** viven en el stream plano que Harbor camina hoy: están dentro de `SessionData/BinaryData` (otro FileDB).

### Nombres de isla (display / rename)

```
data.a7s
  MetaGameManager
    GameSessions / None
      SessionDesc / SessionGUID          → GUID de sesión (región)
      SessionData / BinaryData / Content / GameSessionManager
        AreaInfo / None                  → AreaID (alterna id / bloque)
          Owner/id                       → < 4 = jugador (mismo umbral que NiHoel)
          CityName                       → utf16  ← rename del jugador
          CityNameGuid                   → fallback loca si CityName vacío
        AreaManagers / Area_{id}         → edificios de esa isla
```

`CityName` es el campo que correspondería a “La Inapetente”. `CityNameGuid` es el nombre generado si nadie lo tocó.

**Anno 117** usa `CustomIslandName` en su analyzer. **No** usar ese tag como evidencia 1800.

### Rutas / estaciones (jugador)

```
data.a7s
  MetaGameManager
    SessionTradeRouteManager
      RouteMap / None                    (saltar hojas id; Owner/id < 4 = no NPC)
        ID
        Name                             → utf16 (nombre de ruta)
        Owner / id
        Ships                            → lista int64 (ids de barco)
        Stations / None
          StationID
          AreaID                         → isla
          GoodInfos / None
            ProductGUID
            Amount
```

Barcos (para atar buque ↔ ruta), también anidados:

```
GameSessionManager / AreaManagers/*/AreaObjectManager/GameObject/objects/None
  guid
  MetaPersistent / MetaID
  Nameable / VehicleName                 → utf16
```

Historia pasiva (no es la ruta activa): `PassiveTrade/History/TradeRouteEntries` (`RouteID`, `TraderShip`, `GoodGuid`, `GoodAmount`). No es el menú de rutas.

Lua in-game (`ts.TradeRoute.GetRoute`) **queda fuera de techo**. No es path FileDB.

## Probe en vivo (esta máquina)

| Qué | Resultado |
|---|---|
| `.a7s` de sesión (no `accountdata.a7s`) | **NOT FOUND** |
| Attr `CityName` / `CityNameGuid` en walker Harbor | **NOT FOUND** (el scanner no los lee; no hay save para listar dicts) |
| Attr `SessionTradeRouteManager` / `RouteMap` / `Stations` en walker Harbor | **NOT FOUND** (igual) |
| Recursión a `BinaryData` | **NOT FOUND** — `visitFileDb` no reentra |

Sin save no se puede afirmar que el dict FileDB de Cristian tenga o no esos tags. Sí se puede afirmar: **con el walker actual, Harbor no puede pintar La Inapetente ni rutas reales.**

## Decisión (producto)

Hasta que un follow-up confirme `CityName` y `RouteMap` en un `.a7s` de sesión real, **no** se mergean `tradeRoutes` ni `islands[].name` al schema.

**Comercio = tips de saturación / link-out wiki** (Decisiones 2026-09-02). No inventar rutas. Ingest sigue tirando `tradeRoutes` extras.

`islandName` sigue siendo GUID de sesión. Copy de campaña puede decir “La Inapetente”; el live no.

## Schema propuesto (solo follow-up, no implementar)

Si el probe anidado confirma los attrs:

```
telemetry.islands[]: { id: areaId, name: CityName | loca(CityNameGuid) }
islandName: name de la isla activa (Owner humano + CurrentlyActiveSession), no la región
tradeRoutes[]: { id, name, ownerId, stations: [{ areaId, goods: [{ guid, amount }] }], shipIds[] }
```

Filtro: `Owner/id < 4` (jugador). Sin estaciones o sin `Name` → omitir, no rellenar.

## Cómo re-probar (read-only)

1. Copiar un `.a7s` de sesión (Ctrl+F5 / Autosave, no `accountdata.a7s`) a un path local.
2. Unpack RDA; `visitFileDb` en `data.a7s`; si un leaf `BinaryData` empieza con FileDB (`0xfffffffd` en el trailer), **reentrar**.
3. Listar attrs únicos: `CityName`, `CityNameGuid`, `SessionTradeRouteManager`, `RouteMap`, `Stations`, `AreaID`, `ProductGUID`.
4. Grep utf16 “Inapetente” / nombres de ruta.
5. No `xml2a7s`, no pack, no Lua.

## Verdict: PARTIAL

- **VALIDATED (código):** el techo de primer nivel no tiene nombres de isla ni rutas.
- **VALIDATED (comunidad 1800):** los paths existen, anidados en `BinaryData`.
- **INVALIDATED (live):** no hay `.a7s` acá para cerrar el loop.
- **Producto:** no UI, no fake routes, Comercio = wiki/tips hasta el follow-up.
