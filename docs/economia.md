# Economía — seed de ciudad

Proyecto fan no oficial; no afiliado a Ubisoft. Los números se citan de la wiki como fan reference:

- [Needs](https://anno1800.fandom.com/wiki/Needs)
- [Production](https://anno1800.fandom.com/wiki/Production)
- [Production chains](https://anno1800.fandom.com/wiki/Production_chains)
- [Calculadoras](https://anno1800.fandom.com/wiki/Anno_1800_Needs_Calculators_Overview)

El motor vive en Taller (`src/lib/sim/`). No es el diario ni “Esto, ahora”. `mode: "campaign"` es el default. El ratio wiki `perfect` solo se usa en Taller.

## Qué anotar (casas, no habitantes)

En Anno: **Estadísticas → Economía / Población**.

Anotá:

1. **Casas por clase**, no habitantes. Si el juego te muestra gente, dividí por la capacidad de una residencia llena:
   - Granjero 10, obrero 20, artesano 30, ingeniero 40, inversor 50
   - Nuevo Mundo: jornalero 10, obrero 20
2. **Fábricas que no estén en pausa.** El mantenimiento se cobra aunque el edificio esté en zzz: pausalas o tiralas.
3. El ticker de **Balance** (sube / baja). No hace falta el número exacto.
4. El **nombre de la isla**.

Pegá eso en un `city-seed.json` con schema `harbor-city-v1`. Ejemplo de capítulo 1: `src/lib/sim/fixtures/campaign-ch1.json`.

El buddy pide lo mínimo. No hace falta tipear 80 campos.

## El watcher no alcanza para conteos

`harbor-live.json` marca **presencia** de nombres (edificios, islas, estratos). No trae cuántas casas hay.

Si solo hay presencia, `compute` marca `confidence: "presence"` y **no inventa t/min**. Anotá el seed a mano.

Los conteos exactos salen de:

1. el seed que carga el jugador
2. las fórmulas de la wiki
3. más adelante, `harbor-live.json` si algún día trae números

No parsees `.a7s` en el browser. No DLL. No cheats.

## Cómo lee el motor

Consumo **por residencia**, no por habitante:

`C * (1+R) * (1+N) * (1+B)`

C es t/s de la wiki a capacidad máxima. R, N y B default 0 (items / diario / ayuntamiento). t/min de una casa = C × 60.

Producción sin luz, a 100 %:

`t/min = productivity / (100 * cycle_min)` → a 100 %, `1 / cycle_min`.

En una cadena, 1 t de input = 1 t de output. El ratio perfecto iguala t/min de cada eslabón. En campaña no armes la cadena wiki completa: una fundición y una acería alcanzan hasta que falte.

`compute(seed)` devuelve por isla y global: demanda, oferta, gap (oferta − demanda), casas cubiertas vs casas presentes, una sola `nextBuild` y alertas en rioplatense.

## Capítulo 1 — qué esperar

Con 10 casas de granjero, mercado, leñador, aserradero y **0 pescaderías**, el motor pide una pescadería. Una cubre 80 casas de granjero (wiki). La ropa se pone amarilla al llegar a 100 granjeros: todavía no es el próximo gesto.

## Qué sigue en null

Si un dato no está en la wiki o en el seed, queda `null`. Lista viva: `MISSING_WIKI` en `src/lib/sim/chains.ts`.

Hoy, a propósito:

- Mantenimiento y fuerza laboral **por edificio**, salvo pescadería (−40, 25 granjeros). Las cadenas sí tienen el total wiki (ropa −70, Schnapps −60, matadero −120).
- Bienes de inversor (C t/s).
- Influx de mercado de artesano / ingeniero.
- Ron de obrero y el resto de lujos tardíos.
- Necesidades lifestyle (correo, DLC).
- Workforce de la isla si hay un edificio sin fila wiki.

No inventes esos números. Copiá la infobox de la wiki o dejalo null.
