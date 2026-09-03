---
name: anno-1800-building-icons
description: Diseña y revisa iconos originales de edificios de campaña para Anno 1800 Buddy. Usala al crear siluetas, sellos o marcas de edificio en 24, 32 o 48 px.
metadata:
  type: design-system
  version: "1.0"
  game: anno-1800
---

# Iconos de edificios de campaña

Dibujá una familia original de edificios reconocibles dentro de la grilla 10×10. Evocá grabado industrial e isometría sin copiar iconos, renders ni modelos del juego.

## Cargá lo necesario

- Leé [references/icon-construction.md](references/icon-construction.md) antes de fijar perspectiva, detalle o exportación.
- Leé [references/campaign-building-catalog.md](references/campaign-building-catalog.md) solo para los edificios involucrados en la tarea.
- Usá [assets/building-icon-template.svg](assets/building-icon-template.svg) como guía de encuadre, no como icono terminado.
- Cargá `anno-1800-visual-system` para color y `anno-1800-qa-visual` para aprobar la familia.

## Construí la familia

- Usá una vista isométrica 3/4 consistente, con frente hacia abajo-derecha y luz desde arriba-izquierda.
- Reservá una huella óptica de 80% del lienzo y aire para chimeneas, aspas o árboles.
- Definí cada edificio por una masa primaria, un techo y una señal funcional.
- Hacé que la señal funcional sobreviva a 24 px: tronco, sierra, toldo, red, oveja, telar, papa, alambique, jarra, horno, martillo o vela.
- Priorizá silueta y espacios negativos. Agregá textura woodcut recién en 48 px.
- Usá `currentColor` o la paleta Harbor Buddy. No fijes degradados multicolor por icono.
- Probá el icono adentro de una celda real, no solo aislado en una lámina.

## Resoluciones

- A 24 px, usá una silueta sólida y un único rasgo funcional.
- A 32 px, separá techo, cuerpo y rasgo funcional.
- A 48 px, agregá una o dos líneas de material, humo o módulos sin ensuciar la silueta.
- Conservá el mismo centro óptico en las tres variantes.

## Do

- Diferenciá fundición, acería y armas por horno, martillo y cañón; no solo por etiqueta.
- Mostrá los campos o módulos de una granja como complemento separado cuando haya espacio.
- Usá chimeneas cortas y pesadas para industria; árboles y cercos para producción rural.
- Entregá SVG original y rasterizá solo si el runtime lo necesita.

## Don't

- No calques el ícono del menú de construcción ni una captura de la wiki.
- No uses un pack de Nexus o un sprite sheet descargado.
- No hotlinkees archivos de Fandom.
- No uses el mismo pictograma genérico de fábrica para toda la cadena.
- No pongas el nombre afuera de la grilla como única forma de reconocerlo.
- No presentes el dibujo como arte oficial.

## Ejemplos

**Mal:** cubo de fábrica Lucide junto a la palabra “Aserradero”.

**Bien:** galpón 3/4 original con techo bajo, pila de troncos y rueda de sierra legibles a 24 px.

**Mal:** miniatura recortada del edificio oficial.

**Bien:** silueta nueva que conserva únicamente las pistas abstractas de función y época.

## Propiedad intelectual

Reconocé que Ubisoft es dueña de Anno 1800, los nombres oficiales de sus edificios, logos, capturas, renders y UI. Podés usar nombres para identificar conceptos y observar proporciones; no copies archivos ni la expresión artística. Trazá cada edificio desde cero. No descargues ni incrustes logos, screenshots o packs de terceros tal cual.

Incluí siempre en el footer: **Proyecto fan no oficial; no afiliado a Ubisoft.**
