# Prompt para Grok CLI — economía, islas y stats de Anno 1800 Buddy

Pegá este archivo entero. No improvises números. Si un dato no está en wiki/fandom o en el seed, dejalo `null` y anotá la fuente que falta.

## Cómo correrlo

En el repo `anno-1800-expert-buddy` (o un worktree):

```bash
# 1. login una vez
grok login

# 2. trabajo interactivo (recomendado)
grok --cwd ~/anno-1800-expert-buddy --effort high --rules "No inventes t/min. Fuente o null."

# después, en el TUI, pegá este prompt o:
# /read prompts/PROMPT-GROK-CLI-ANNO-1800-ECONOMIA.md

# 3. headless (deja archivos y sale)
grok --cwd ~/anno-1800-expert-buddy \
  --prompt-file prompts/PROMPT-GROK-CLI-ANNO-1800-ECONOMIA.md \
  --effort high \
  --max-turns 40 \
  --output-format plain
```

No uses `gbot` (eso es Grok Bot de macOS). Esto es **Grok CLI** (`grok`).

## Quién sos

Arquitecto de datos de **Anno 1800 Buddy** (persona Harbor Buddy).
Repo: https://github.com/crisesarmiento/anno-1800-expert-buddy
App self-hosted de segundo monitor. No cheats. No DLL. No parsear .a7s en el browser.
El watcher de Windows solo marca **presencia** de nombres. Los conteos exactos salen de:
1. seed que carga el jugador (`city-seed.json`)
2. fórmulas de la wiki
3. más adelante, harbor-live.json si trae números

Idioma de UI: español rioplatense. Nombres de edificios: español + id inglés de wiki.

Copyright: Ubisoft dueña del juego. No bajes screenshots ni logos. Los números de la wiki se citan como datos de fan reference.

## Objetivo de esta corrida

Construir un **motor de stats de CIUDAD**, no una planilla suelta.

Entregables (crear/actualizar, no reescribir la app):

1. `src/lib/sim/types.ts` — tipos Island, HouseCounts, BuildingCounts, GoodFlow
2. `src/lib/sim/needs.ts` — consumo por residencia (t/s y t/min)
3. `src/lib/sim/chains.ts` — ratios perfectos early/mid campaign
4. `src/lib/sim/compute.ts` — demanda, oferta, gap, houses-supplied
5. `src/lib/sim/city-seed.schema.json` — JSON Schema del seed del jugador
6. `src/lib/sim/fixtures/campaign-ch1.json` — seed de ejemplo cap. 1
7. `docs/economia.md` — cómo leer Estadísticas → Economía y llenar el seed
8. Tests con los números de la wiki (1 fishery = 80 casas granjero de pescado)

NO agregues Next, Prisma, cuentas, ni cloud DB.
NO toques el mod de Anno.
SI el archivo ya existe, extendelo.

## Física del juego (fuente de verdad)

Wiki:
- https://anno1800.fandom.com/wiki/Needs
- https://anno1800.fandom.com/wiki/Production
- https://anno1800.fandom.com/wiki/Production_chains
- Calculadoras: https://nihoel.github.io/Anno1800Calculator/
- Overview: https://anno1800.fandom.com/wiki/Anno_1800_Needs_Calculators_Overview

Reglas:

1. El consumo es **por residencia**, no por habitante.
2. Una residencia llena:
   - Farmer 10, Worker 20, Artisan 30, Engineer 40, Investor 50
   - New World: Jornalero 10, Obrero 20
3. Fórmula de consumo de un bien en una casa:
   `C * (1+R) * (1+N) * (1+B)`
   C = base (t/s), R/N/B = modificadores de items/ayuntamiento/etc. Default 0.
4. t/min de una casa = C * 60
5. Producción de un edificio sin luz:
   `t/min = productivity / (100 * cycle_min)`
   A 100%, t/min = 1 / cycle_min
6. En una cadena, **1 t de input = 1 t de output**. El ratio perfecto iguala t/min de cada eslabón.
7. Ratio perfecto ≠ siempre correcto en campaña. Early game: 1 horno + 1 acería alcanza. No armes la cadena wiki completa si el buddy está en cap. 1–2.
8. Mantenimiento se cobra aunque el edificio esté en zzz. Por eso el buddy dice “pausá o tirate las fábricas dormidas”.

### C base (t/s) — Needs wiki, casa a capacidad máxima

Farmers (casa 10):
| bien        | C t/s        | t/min casa | casas por 1 t/min |
|-------------|--------------|------------|-------------------|
| Fish        | 0.0004166667 | 0.025      | 40                |
| Work Clothes| 0.000512821  | 0.030769   | 32.5              |
| Schnapps    | 0.000555556  | 0.033333   | 30                |

Workers (casa 20):
| bien        | C t/s        | t/min casa | casas por 1 t/min |
|-------------|--------------|------------|-------------------|
| Fish        | 0.0008333334 | 0.050      | 20                |
| Work Clothes| 0.001025642  | 0.061538   | 16.25             |
| Sausages    | 0.000333334  | 0.020      | 50                |
| Bread       | 0.00030303   | 0.018182   | 55                |
| Soap        | 0.000138889  | 0.008333   | 120               |

Artisans (casa 30) — C t/s wiki:
- Sausages 0.000666667
- Bread 0.000606061
- Soap 0.000277778
- Canned Food 0.00017094
- Sewing Machines 0.00047619
- Fur Coats 0.000444444

Engineers (casa 40):
- Canned Food 0.00034188
- Sewing Machines 0.000952381
- Fur Coats 0.000888889
- Glasses 0.000148148
- Coffee 0.000784314

Influx (habitantes extra por necesidad cumplida), farmers:
- Market +5, Fish +3, Clothes +2 → 10
Workers: Market +5, Fish +3, Clothes +2, Sausages +3, Bread +3, Soap +2, School +2 → 20

### Cadenas early (Production chains wiki, 100% prod, sin luz)

| bien     | t/min final | ratio edificios                         | casas farmer | casas worker |
|----------|-------------|-----------------------------------------|--------------|--------------|
| Timber   | 4           | 1 leñador : 1 aserradero                | (construcción) | |
| Fish     | 2           | 1 pescadería                            | 80           | 40           |
| Clothes  | 2           | 1 ovejas : 1 telares                    | 65           | 32.5         |
| Schnapps | 2           | 1 papas : 1 destilería                  | 60           | 30           |
| Sausages | 1           | 1 cerdos : 1 matadero                   | —            | 50           |
| Bread    | 1           | 2 trigo : 1 molino : 2 panadería        | —            | 55 / panadería |
| Bricks   | 2           | 1 arcilla : 2 ladrillera                | —            | —            |
| Steel*   | ver wiki    | mina + carbón + fundición + acería      | campaña: 1 de cada hasta que falte | |

\* Wiki full steel beams: más hornos que acería. En cap. 2 misión: **una de cada**. El compute debe tener `mode: "campaign" | "perfect"`.

Mantenimiento aprox. wiki (créditos/min, no inventes más precisión):
- Fishery −40, Knitters/Schnapps orden −60/−70, Slaughterhouse −120
- Usá wiki al escribir cada edificio; si no está, `maintenance: null`

## Seed del jugador (`city-seed.json`)

El jugador no va a tipear 80 campos. El buddy pide lo mínimo:

```json
{
  "schema": "harbor-city-v1",
  "game": "anno-1800",
  "updatedAt": "ISO",
  "mode": "campaign",
  "missionHint": "Una chispa que vuelve",
  "islands": [
    {
      "id": "bright-sands",
      "world": "old",
      "houses": { "farmer": 10, "worker": 0, "artisan": 0, "engineer": 0, "investor": 0 },
      "buildings": {
        "lumberjack": 1, "sawmill": 1, "marketplace": 1,
        "fishery": 1, "sheep": 0, "knitters": 0
      },
      "pulse": { "coins": "down", "houses": "empty" },
      "notes": "primera isla, mercado cerca del puerto"
    }
  ]
}
```

`compute(seed)` devuelve por isla y global:

- `demand[good]` t/min
- `supply[good]` t/min (edificios * rate * productivity/100)
- `gap` = supply − demand (negativo = falta)
- `housesSupported[need]` vs `housesPresent`
- `workforce` estimado solo si hay tabla; si no, null
- `alerts[]` en rioplatense: “con 10 casas y 0 telares, la ropa va a ponerse amarilla al llegar a 100 granjeros”
- `nextBuild` 1 sola cosa, estilo buddy, no 12 fábricas

## Cómo se llena el seed (escribilo en docs/economia.md)

En Anno: **Estadísticas → Economía / Población**.
Anotar:
- casas por clase (no habitantes, si hay duda dividir por cap)
- fábricas que no estén en pausa
- ticker Balance
- islas con nombre

El watcher `harbor-live.json` NO alcanza para conteos. Si solo hay presencia, el compute marca `confidence: "presence"` y no inventa t/min.

## Trabajo que Grok CLI tiene que hacer YA

1. Buscá en la wiki (web) cualquier C o ratio que falte para cap. 1–2 Old World + jornaleros básicos New World.
2. Codificá needs + chains + compute con tests.
3. Fixture `campaign-ch1.json` con 10 casas farmer, 1 mercado, 1 leñador, 1 aserradero, 0 pescadería — el test espera alert de pescado y nextBuild = fishery.
4. No rediseñes UI en esta corrida salvo un panel mínimo “Ciudad” que lea el seed + compute, si ya existe tablero.
5. Citá URLs de wiki en comentarios de datos, no copies arte.

## Do / Don’t

DO: números de wiki, seed chico, alerts de buddy, mode campaign vs perfect.
DON’T: God mode, skip quests, scrape de saves como fuente de verdad de conteos, logos Ubisoft, “óptimo mundial” en prólogo.

Cuando termines, imprimí:
- archivos tocados
- 5 números de test que coinciden con la wiki
- qué datos siguen en `null`

## Extra Harbor Studio (obligatorio)

- El motor `src/lib/sim/` es **Taller**, nunca Home / “Esto, ahora”.
- UI mínima si existe: chip Taller o `/taller`. No grilla de bienes en el diario.
- `mode: "campaign"` default. `perfect` solo en Taller.
- Al terminar: branch + commit + `gh pr create` contra origin/main. No mergees. Cristian mergea.
- No toques el mod, no parsees .a7s en el browser, no DLL.
