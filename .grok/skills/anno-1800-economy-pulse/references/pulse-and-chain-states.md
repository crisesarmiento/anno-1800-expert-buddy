# Estados de pulso y cadenas

## Contrato de datos visual

Usá solamente estados presentes en la app o informados por el jugador. Diferenciá:

| Dominio | Estado       | Tratamiento                 | Mensaje posible                          |
| ------- | ------------ | --------------------------- | ---------------------------------------- |
| Monedas | suben        | moss, flecha corta arriba   | “Viene bien. No toques lo que funciona.” |
| Monedas | bajan        | rust, flecha corta abajo    | “Pará de construir. Mirá producción.”    |
| Monedas | desconocidas | mist, guion                 | “Decime si el ticker sube o baja.”       |
| Casas   | ocupadas     | cream/moss, ventanas llenas | “Estas casas sostienen la isla.”         |
| Casas   | vacías       | mist, contorno hueco        | “Calle al mercado. Después esperá.”      |
| Casas   | amarillas    | brass, marca de necesidad   | “Una necesidad por vez.”                 |
| Fábrica | dormida      | mist, `zzz` pequeño         | “Revisá insumo, campo, calle o gente.”   |

No presentes “amarillo” como error fatal. Es una señal de prioridad.

## Forma del ticker

- Mostrá una moneda o sello original, no el icono oficial.
- Limitá el cambio animado a 180 ms.
- Permití leer el estado sin movimiento.
- Anunciá el cambio de forma accesible solo cuando sea nuevo y accionable.

## Cadenas de campaña

Mostrá únicamente la porción necesaria:

- troncos → tablones;
- costa → pescado;
- ovejas → ropa de trabajo;
- papas → Schnapps;
- cerdos → salchichas;
- trigo → harina → pan;
- cerdos/sebo → jabón;
- mineral + carbón → acero → armas;
- lana → velas;
- plátanos → comida del Nuevo Mundo.

Los nombres describen relaciones de juego. Creá todos los símbolos desde cero.

## Fricción útil

Si una fábrica muestra `zzz`, no declares una causa sin evidencia. Presentá cuatro verificaciones cortas: materia prima, módulos o campo, calle al almacén y fuerza laboral. Si el almacén está lleno según datos reales, sugerí pausa; si no hay ese dato, mantenelo como pregunta.
