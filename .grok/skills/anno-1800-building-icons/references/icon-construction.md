# Construcción de iconos

## Perspectiva

- Usá ejes aproximados de 30° y 150° para techos y bases.
- Mantené el frente hacia abajo-derecha en toda la familia.
- Iluminá arriba y a la izquierda; oscurecé la pared derecha.
- Evitá perspectiva realista profunda. El icono debe sentirse como sello, no como render.

## Capas conceptuales

1. Dibujá la huella o plataforma.
2. Sumá el volumen principal.
3. Cortá la línea de techo.
4. Agregá un rasgo funcional dominante.
5. Sumá una marca ambiental si todavía se lee a tamaño objetivo.

## Escala

| Tamaño | Trazo orientativo | Detalle máximo | Prueba                                  |
| ------ | ----------------: | -------------- | --------------------------------------- |
| 24 px  |          1.7–2 px | 1 rasgo        | Identificar sin texto a 100%            |
| 32 px  |        1.5–1.8 px | 2 rasgos       | Distinguir edificios de la misma cadena |
| 48 px  |        1.4–1.7 px | 3 rasgos       | Conservar lectura al reducir a 24 px    |

No uses líneas menores a 1 px en el tamaño final. Convertí detalles críticos en masas.

## Color

- Usá cream sobre fondo oscuro para siluetas neutrales.
- Usá brass para selección o edificio nuevo.
- Usá moss para rural o abastecido y rust para industria o alerta, nunca como único identificador.
- Permití dos tonos más fondo a 24 px y tres tonos más fondo a 32/48 px.

## Exportación

- Preferí SVG con `viewBox="0 0 64 64"` y `currentColor`.
- Evitá filtros, máscaras complejas, fuentes y enlaces externos.
- Incluí `<title>` y `<desc>` cuando el SVG sea significativo.
- Convertí trazos a formas solo si el pipeline final lo exige.
- Revisá el asset sobre ink, cream, sea y dentro de una celda 10×10.
