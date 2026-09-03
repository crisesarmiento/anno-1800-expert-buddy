---
name: anno-1800-dashboard-charts
description: Diseña y revisa gráficos de presencia para el tablero de Anno 1800 Buddy. Usala al mostrar edificios, cadenas, islas, diplomacia o pulso sin inventar conteos.
metadata:
  type: design-system
  version: "1.0"
  game: anno-1800
---

# Gráficos del tablero

Diseñá un tablero de presencia, no una consola de business intelligence. Mostrá qué apareció, qué falta y qué cambió según los datos disponibles.

## Cargá lo necesario

- Leé [references/presence-chart-grammar.md](references/presence-chart-grammar.md) al elegir visualización, estados o tooltips.
- Cargá `anno-1800-economy-pulse` para monedas y casas.
- Cargá `anno-1800-visual-system` para color y `anno-1800-copy-rioplatense` para etiquetas.
- Cargá `anno-1800-qa-visual` antes de aceptar el tablero.

## Mostrá presencia con honestidad

- Usá estados visto, falta, apareció también y desconocido.
- No conviertas presencia en cantidad. Ver una serrería no significa conocer cuántas hay ni si trabaja.
- Usá barras cortas brass o moss solo para categorías discretas y etiquetadas.
- Usá hatch mist para desconocido y contorno para falta.
- Preferí listas gráficas, tiras de sellos y barras de estado antes que tortas o gauges.
- Mostrá historial únicamente si existen observaciones con tiempo; no interpolés puntos.

## Diseñá tooltips de almacén

Incluí, cuando existan:

- etiqueta humana;
- fuente del dato;
- momento de observación;
- significado y límite del dato;
- una acción corta si es accionable.

## Do

- Ordená por atención actual, no por volumen visual.
- Usá brass para foco, moss para presente/correcto, rust para atención y mist para desconocido.
- Escribí “presencia, no conteo” cerca de la primera visualización que pueda confundirse.
- Conservá valores ausentes como ausentes.

## Don't

- No inventes alturas, porcentajes, escalas o tendencias.
- No uses tortas 3D, gauges de velocidad, neón o gráficos violetas.
- No muestres una barra al 70% si solo sabés presente/ausente.
- No llenes el segundo monitor con ejes, leyendas y tablas.
- No copies el panel Estadísticas del juego.

## Ejemplos

**Mal:** “Aserraderos 4” y una barra al 80% a partir de una mención en el save.

**Bien:** sello de aserradero “Visto”, fuente “última lectura”, tooltip “presencia; no sabemos cantidad ni actividad”.

**Mal:** dashboard ejecutivo con revenue, efficiency y health score.

**Bien:** tablero tranquilo con tres grupos: falta ahora, visto y desconocido.

## Propiedad intelectual

Reconocé que Ubisoft es dueña de Anno 1800, sus nombres oficiales, logos, capturas, renders, gráficos e interfaz Estadísticas. Podés estudiar jerarquía y ratios, pero redibujá todas las visualizaciones y marcas. No incrustes screenshots ni arte oficial.

Incluí siempre en el footer: **Proyecto fan no oficial; no afiliado a Ubisoft.**
