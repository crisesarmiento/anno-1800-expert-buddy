---
name: anno-1800-city-grid
description: Diseña y revisa la gramática visual de grillas 10×10 de Anno 1800 Buddy. Usala para bloques urbanos, calles, jardines, granjas, cobertura y fábricas dormidas.
metadata:
  type: design-system
  version: "1.0"
  game: anno-1800
---

# Grilla de ciudad 10×10

Hacé que el jugador entienda el barrio de un vistazo. Representá ubicación y función dentro de las celdas; no relegues los edificios a una leyenda lateral.

## Cargá lo necesario

- Leé [references/cell-color-map.md](references/cell-color-map.md) al definir estados y tipos de celda.
- Leé [references/grid-reading-patterns.md](references/grid-reading-patterns.md) al componer barrios, costa, granjas o industria.
- Usá [assets/grid-legend.svg](assets/grid-legend.svg) como ejemplo original de una grilla autocontenida.
- Cargá `anno-1800-building-icons` para marcas de edificios y `anno-1800-visual-system` para color.

## Construí la lectura

- Dibujá exactamente diez filas por diez columnas cuando la pieza se presente como 10×10.
- Mostrá casas como huellas 3×3 reconocibles, con calle y al menos un hueco de jardín.
- Insertá el icono de mercado, leñador, aserradero, taberna u otro edificio dentro de sus celdas ocupadas.
- Diferenciá calle, casa, jardín, público, agua, granja, industria, árboles y vacío por color más símbolo o patrón.
- Hacé visibles los límites de módulo sin convertir la pieza en una planilla.
- Usá una retícula de papel o plano urbano, no un spreadsheet con encabezados A–J y 1–10.
- Mostrá cobertura de mercado con un halo brass tenue o un borde discontinuo. No pintes un heatmap opaco.
- Mostrá una fábrica dormida con `zzz` pequeño, mist y sin parpadeo.

## Orden de atención

1. Permití reconocer calles y continuidad.
2. Permití localizar el edificio que importa ahora.
3. Mostrá casas, jardines y módulos rurales.
4. Dejale la leyenda a los símbolos secundarios.

## Do

- Usá símbolos originales de 12–20 px centrados dentro de las celdas o huellas.
- Mantené un contraste suficiente entre calle y terreno.
- Recortá costa o bosque con bordes orgánicos sin romper la cuadrícula funcional.
- Permití zoom o ampliación si el destino físico vuelve ilegible el 10×10.

## Don't

- No muestres cien cuadrados abstractos y una leyenda que haga todo el trabajo.
- No dibujes casas como puntos idénticos a fábricas.
- No uses un mapa satelital ni una captura del juego como base.
- No agregues ratios, producción por minuto o optimización matemática.
- No animes `zzz` con bounce.

## Ejemplos

**Mal:** grilla beige con letras H, R y F, más una leyenda extensa al costado.

**Bien:** calles mist, huellas de casas brass, jardines moss e iconos woodcut de mercado y aserradero dentro del 10×10.

**Mal:** screenshot de un layout de la wiki con una capa de texto encima.

**Bien:** reconstrucción SVG propia que conserva solo la idea espacial del bloque.

## Propiedad intelectual

Reconocé que Ubisoft es dueña de Anno 1800, sus edificios, logos, capturas, renders y UI. Podés estudiar layouts y proporciones en `https://anno1800.fandom.com/`, pero redibujá cada grilla, símbolo y textura desde cero. No descargues ni hotlinkees mapas, screenshots o iconos. No afirmes que el resultado es arte oficial.

Incluí siempre en el footer: **Proyecto fan no oficial; no afiliado a Ubisoft.**
