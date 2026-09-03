---
name: anno-1800-mission-chrome
description: Diseña y revisa el diario de campaña de Anno 1800 Buddy. Usala para prólogo, capítulos I a IV, misiones, progreso, spoilers, sellos y ayuda para ubicarse en el juego.
metadata:
  type: design-system
  version: "1.0"
  game: anno-1800
---

# Chrome de misión y diario

Convertí la campaña en un diario de pergamino tranquilo. Mostrá dónde está el jugador y qué mirar ahora sin reemplazar el diario del juego ni revelar lo que sigue.

## Cargá lo necesario

- Leé [references/campaign-chrome.md](references/campaign-chrome.md) al crear el rail, estados, sellos o mensajes de orientación.
- Usá [assets/mission-seal-template-64.svg](assets/mission-seal-template-64.svg) como base geométrica para sellos originales.
- Cargá `anno-1800-visual-system` para superficies y `anno-1800-copy-rioplatense` para microcopy.
- Cargá `anno-1800-qa-visual` antes de aceptar la entrega.

## Construí el diario

- Representá Prólogo y capítulos I–IV como una secuencia de hojas, pestañas o marcas de margen.
- Hacé que el capítulo actual domine. Mostrá pasado como completado y futuro como cerrado sin adelantar títulos ni objetivos.
- Mantené spoilers apagados por defecto. Revelá detalle futuro solo después de una acción explícita.
- Mostrá una misión principal por vez con objetivo, un próximo paso y una trampa breve.
- Permití reconocer el tipo de misión mediante un sello original: construir, mandado, espera, expedición o combate.
- Incluí “dónde mirar en el juego” como ayuda corta: diario, sello de historia y fragmento de título.
- Tratá el buddy como acompañante. No dupliques toda la lista de quests del juego.

## Jerarquía

1. Capítulo y misión actual.
2. Qué hacer ahora.
3. Dónde mirar en Anno si no coincide.
4. Qué evitar.
5. Progreso anterior y navegación secundaria.

## Do

- Usá papel cream, tinta oscura, reglas brass y sellos de tinta originales.
- Hacé que el estado actual se lea sin depender de una barra porcentual.
- Marcá completado con sello, no con confetti.
- Conservá nombres de misión provenientes de la fuente de datos existente; no inventes traducciones canónicas.

## Don't

- No muestres thumbnails, capturas o retratos oficiales del diario.
- No reveles títulos futuros con blur legible, tooltips o accesibilidad accidental.
- No transformes capítulos en un wizard SaaS.
- No agregues lore, objetivos o recompensas que el producto no tenga.
- No uses un logo de Anno como sello de campaña.

## Ejemplos

**Mal:** timeline azul con 73% completado, cards de próximos capítulos y recompensas bloqueadas.

**Bien:** margen de diario con I–IV, sello brass en el capítulo actual y hojas futuras cerradas sin texto revelador.

**Mal:** screenshot del diario del juego pegado como fondo.

**Bien:** papel y jerarquía redibujados desde cero, con un sello woodcut propio.

## Propiedad intelectual

Reconocé que Ubisoft es dueña de Anno 1800, sus nombres oficiales, logos, capturas, renders y UI. Podés observar el diario, sus proporciones y sus categorías; no copies el pergamino, sellos, insignias ni screenshots. No presentes el chrome como oficial.

Incluí siempre en el footer: **Proyecto fan no oficial; no afiliado a Ubisoft.**
