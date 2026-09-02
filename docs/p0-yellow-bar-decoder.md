# P0 yellow-bar decoder

Chip amarillo (o captura del HUD) → **un** edificio y **una** zona. Sin t/min, sin ratios, sin recetas de varios edificios.

Zonas: `costa` | `campo` | `10x10`.

Lujo = plata extra. Nunca una cadena obligatoria.

| Need | Building | Zone | Luxury |
| --- | --- | --- | --- |
| Mercado | Mercado | 10x10 | no |
| Pescado | Pescadería | costa | no |
| Ropa | Telares | 10x10 | no |
| Schnapps | Destilería de Schnapps | 10x10 | sí |
| Taberna | Taberna | 10x10 | sí |
| calle | Calle | 10x10 | no |

Source of truth: `src/lib/data/yellow-bar.ts` (`decodeYellowBar`).
