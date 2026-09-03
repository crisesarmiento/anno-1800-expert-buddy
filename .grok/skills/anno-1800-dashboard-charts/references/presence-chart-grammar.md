# Gramática de gráficos de presencia

## Elegí según la pregunta

| Pregunta                     | Visualización                          | No uses                |
| ---------------------------- | -------------------------------------- | ---------------------- |
| ¿Apareció este edificio?     | Sello presente/ausente/desconocido     | Barra porcentual       |
| ¿Qué falta para esta misión? | Lista corta de huellas con estado      | Pie chart              |
| ¿Qué cadenas aparecieron?    | Pares de iconos unidos                 | Sankey complejo        |
| ¿Qué cambió entre lecturas?  | Tira cronológica de eventos observados | Línea interpolada      |
| ¿Qué isla se nombró?         | Tag de papel con sello de mapa         | Mapa copiado del juego |
| ¿A quién vimos?              | Retrato-sello más estado textual       | Reputación inventada   |

## Barras

- Usá barras solamente cuando haya un conjunto finito conocido, por ejemplo tres de cinco categorías presentes.
- Mostrá el denominador o las etiquetas de cada segmento.
- Rellená presente con moss; usá brass para el segmento enfocado.
- Dibujá falta como contorno y desconocido como hatch mist.
- No suavices ni animes la barra como un KPI en vivo.

## Historial

- Dibujá un punto por observación real.
- Permití saltos en el tiempo y marcá huecos.
- No unas puntos de estados incomparables.
- Etiquetá “reportado”, “leído” o “manual” según la fuente real.

## Tooltip de almacén

Formato recomendado:

```text
Aserradero · Visto
Fuente: última lectura local
Hace: 2 min
Significa presencia, no cantidad ni actividad.
```

Omití líneas sin datos. No reemplaces ausencias por cero.

## Densidad

- Máximo sugerido de cinco ítems por grupo antes de colapsar.
- Una sola visualización dominante por viewport.
- Leyendas junto a la marca, no en un bloque lejano.
- Etiquetas de 1–4 palabras y una explicación secundaria corta.
