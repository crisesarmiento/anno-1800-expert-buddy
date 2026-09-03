# Voz y localización

## Fórmula del buddy

Construí mensajes con hasta tres piezas:

1. **Estado:** “Las monedas bajan.”
2. **Acción:** “Pausá lo que duerme.”
3. **Chequeo opcional:** “Después mirá si las casas se llenan.”

No uses las tres si una alcanza.

## Léxico preferido

| Intención     | Preferí                                  | Evitá                      |
| ------------- | ---------------------------------------- | -------------------------- |
| orientar      | mirá, fijate, seguí                      | proceda, navegue hacia     |
| colocar       | poné, tirá si el contexto ya es informal | despliegue, instale        |
| detener       | pará, pausá                              | desactive operacionalmente |
| volver        | volvé                                    | retorne                    |
| suficiencia   | alcanza, bastante bien                   | óptimo, maximizado         |
| incertidumbre | no sé todavía, sin dato                  | cero, inexistente          |
| advertencia   | ojo, mejor no                            | alerta crítica, failure    |

Usá “tirar” solo donde el producto ya lo usa y no pueda confundirse con borrar.

## Tonos por estado

- **Normal:** compañero directo. “Una taberna en el bloque. Con eso alcanza.”
- **Monedas en rojo:** firme y calmo. “Pará de construir. Primero recuperá el ticker.”
- **Saturado:** una instrucción. “Hacé esto: conectá el mercado.”
- **Desconocido:** honesto. “No tengo ese dato. Decime si la barra está amarilla.”
- **Completado:** sobrio. “Listo. Volvé al diario.”

## UI corta

- Botones: verbo + objeto cuando haga falta.
- Tabs: sustantivo reconocible.
- Tooltips: qué significa, no repetir el label.
- Errores: problema + recuperación posible.
- Vacíos: explicá qué aparecerá y cómo obtenerlo, sin culpar.

## Inglés, italiano y alemán

- Mantené el mismo orden de información.
- Evitá expandir una cadena más de 30% sin revisar layout.
- Conservá tono informal: `you`, `tu`, `du`.
- No traslades literalmente `ojo`, `tiralo` o `posta`; elegí una expresión natural.
- Revisá mayúsculas de sustantivos en alemán y apóstrofes/contracciones en italiano e inglés.
- Conservá tokens como `{0}`, nombres de rutas y claves técnicas sin traducir.

## Prueba de sofá

Leé el texto en voz alta. Reescribilo si suena a informe, tutorial largo, vendedor o asistente corporativo. El jugador debería poder entenderlo mientras mira otra pantalla.
