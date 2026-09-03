# Tokens y materiales

Consultá esta referencia al crear o auditar temas, superficies, estados y movimiento.

## Paleta canónica

| Token        |     Valor | Uso                                   |
| ------------ | --------: | ------------------------------------- |
| `ink`        | `#14110e` | Fondo profundo, texto sobre cream     |
| `ink-raised` | `#1e1a14` | Paneles de madera y metal oscuro      |
| `brass`      | `#c9a36a` | Acción, selección, borde activo       |
| `cream`      | `#f3e6cf` | Papel, texto principal sobre oscuro   |
| `sea`        | `#2f5658` | Agua, navegación, estado informativo  |
| `moss`       | `#7ea37c` | Correcto, abastecido, jardín          |
| `rust`       | `#c45c4a` | Déficit, urgencia, industria caliente |
| `mist`       | `#b7a78e` | Texto secundario, calles, desconocido |

No sumes un color de marca competitivo. Derivá transparencias o mezclas de esta paleta.

## Contraste

- Usá cream sobre `ink` o `ink-raised` para texto principal.
- Usá `ink` sobre cream para papel y controles claros.
- No uses brass como texto pequeño sobre cream.
- Comprobá 4.5:1 para texto normal y 3:1 para texto grande o límites de controles.
- Acompañá moss y rust con forma, texto o patrón; no dependas solo del color.

## Tipografía

- Títulos de sección y misión: Fraunces 600–700, tracking normal o levemente cerrado.
- Interfaz y cuerpo: Figtree 400–600.
- Kicker y metadata: Figtree 600, mayúsculas moderadas, tracking amplio.
- Números del pulso: cifras tabulares solo cuando ayuden a comparar; no las conviertas en KPI.

## Superficies

- **Madera oscura:** base `ink`, veta sugerida con gradientes casi imperceptibles.
- **Papel de almacén:** cream, ruido fino dibujado por CSS, borde mist y esquinas poco redondeadas.
- **Metal cepillado:** `ink-raised`, línea horizontal tenue y brillo brass muy corto.
- **Sello:** trazo irregular controlado, círculo imperfecto y una silueta original central.

No uses fotografías de madera, texturas extraídas del juego ni filtros que degraden la legibilidad.

## Forma y profundidad

- Radio mínimo: 2 px para papel y grillas.
- Radio de control: 6 px.
- Radio de panel: 10 px.
- Evitá radios mayores a 14 px salvo sellos circulares.
- Construí elevación con un borde, una sombra corta y, si hace falta, un inset tenue.
- Evitá capas translúcidas tipo vidrio.

## Movimiento

| Token  | Duración | Uso                            |
| ------ | -------: | ------------------------------ |
| `fast` |   110 ms | Hover, focus, cambio de estado |
| `base` |   180 ms | Apertura corta, selección      |
| `slow` |   260 ms | Entrada de hoja o tablero      |

Usá `cubic-bezier(.2,.7,.2,1)`. Permití un desplazamiento de 2–6 px o una rotación de sello menor a 2°. Nunca uses rebote.

## Jerarquía de una superficie

1. Decí qué necesita atención ahora.
2. Mostrá el objeto de juego relacionado mediante silueta o sello original.
3. Ofrecé una acción corta.
4. Dejá detalles y explicación para disclosure o tooltip.
