# Smoke P1-B follow-up (2026-09-20)

Contraste contra `OneDrive/Documentos/Anno 1800/harbor-live.json` (mtime ~15:17, mode `ubisoft-cloud`, ~11KB) y re-scan del `.save` `1359534061.save` con el lector de esta rama.

## Checklist: reiniciar el vigilante

Tras mergear P1-B (#70) o este follow-up:

1. Cerrar la ventana del vigilante (bat/ps1) si sigue abierta.
2. Desde el repo (o la descarga): `npm run pack:mod` si tocaste C#/ps1, o usar el zip/bat nuevo de la app.
3. Abrir de nuevo `public/watch-harbor-live.bat` (o el instalado).
4. En Anno: Ctrl+F5 o esperar el autoguardado.
5. Verificar en `harbor-live.json`:
   - `reader.version` (esperado `0.6.1` en esta rama; `0.6.0` tras solo #70)
   - `coverage.fields` presente
6. Si el JSON no cambia: el bat viejo sigue embebido — no alcanza con `git pull` si la ventana ya estaba abierta.

El smoke de las 15:17 **no** traía `reader`/`coverage` porque el vigilante no se había reiniciado después de #70 (ps1 en disco más nuevo que el JSON).

## Hallazgos

| Campo | Smoke JSON 15:17 | Re-scan `.save` cloud (lector actual) | Lectura |
|-------|------------------|----------------------------------------|---------|
| `reader` / `coverage` | ausentes | presentes | reinicio vigilante |
| `telemetry.buildings` | 0 | 21 (CountsPerGUID global) | el smoke viejo quedó corto; tras reinicio deberían aparecer |
| `telemetry.goods` / tesorería | vacío / sin economy | `storageOwner: unknown`, goods [] | gap: no hay `StrgLrg` con `ParticipantID === 0` en este save |
| `islandSnapshots` | 8 | 8 | OK |
| stock / buildings por isla | 0 / 0 | 0 / 0 | **gap de scanner**, no específico de cloud |
| `nameSource` GUID | `neutral` + `[guid]` | `city-name-guid` + `[guid]` (esta rama) | no se inventa nombre; cobertura `islandNames` cuenta el GUID |
| `quests` | `[]` | `[]` | unavailable / empty-on-purpose |
| `nativeProbe` | unreachable | — | esperado sin Server.exe |

## Por qué stock/edificios por isla salen vacíos

En el `.save` cloud y en un Autosave `.a7s` local del mismo account, `AreaManager_*` **sí** enlaza por `areaId` (sin `managerMisses`), pero el nodo **no contiene** `AreaStorageManager`. Los hijos observados son del estilo `AreaObjectManager`, `AreaPopulationManager`, etc.

Los fixtures de test sí meten `AreaStorageManager`/`StrgLrg` bajo el manager; por eso los tests pasan y el save real no llena `islandSnapshots[].stock` / `.buildings`.

`CountsPerGUID` global (visita plana del FileDB) sí rinde `telemetry.buildings`. Eso no se copia todavía a cada isla.

**No se publica 0 inventado.** Coverage: `islandStock` / `islandBuildings` → `absent` (reason `not-extracted`). Capabilities se mantienen: el camino existe cuando el save trae la forma de los fixtures.

## Fuera de alcance (no P2-A)

- UI de escritorio / comparador / flota visible
- Extraer stock por isla desde otra ruta FileDB aún no contrastada
