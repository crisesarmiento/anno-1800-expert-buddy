# Mapa de colores y marcas de celda

Usá color más una marca visual. Las marcas deben seguir legibles en escala de grises.

| Tipo       | Color base        | Marca dentro de la celda                 |
| ---------- | ----------------- | ---------------------------------------- |
| Calle      | `#b7a78e`         | Dos líneas paralelas o adoquines cortos  |
| Residencia | `#c9a36a`         | Techo o casa 3/4                         |
| Jardín     | `#7ea37c`         | Árbol, punto con tronco o trama de hojas |
| Público    | `#c45c4a`         | Sello específico del edificio            |
| Agua       | `#2f5658`         | Dos ondas horizontales                   |
| Granja     | mezcla brass/moss | Surcos, cultivo o animal                 |
| Industria  | `#1e1a14`         | Chimenea, yunque, horno o herramienta    |
| Árboles    | `#7ea37c`         | Copa triangular o redonda                |
| Vacío      | mist al 18%       | Sin marca o punto central tenue          |

## Estados superpuestos

- **Seleccionado:** borde brass de 2 px y sombra interior corta.
- **Objetivo actual:** pequeña esquina de papel cream, no glow.
- **Cobertura de mercado:** contorno brass discontinuo sobre el área, sin tapar iconos.
- **Dormido:** bajá saturación, agregá `zzz` en mist y conservá la silueta.
- **Alerta:** marca rust triangular más texto accesible fuera de la celda al enfocar.
- **Desconocido:** trama diagonal mist; no inventes contenido.

## Densidad

- Mantené separaciones visuales de 1–2 px entre celdas.
- A menos de 18 px por celda, simplificá a siluetas sólidas.
- No uses texto dentro de cada celda.
- Permití que un edificio de varias celdas comparta una sola marca centrada sobre su huella.
