---
name: anno-1800-copy-rioplatense
description: Escribe y revisa la voz de Anno 1800 Buddy en español rioplatense y sus variantes en inglés, italiano y alemán. Usala para microcopy, ayudas, alertas y estados.
metadata:
  type: design-system
  version: "1.0"
  game: anno-1800
---

# Copy rioplatense del buddy

Escribí como alguien sentado al lado en el sofá: breve, concreto, calmo y atento a lo que el jugador ve. Usá voseo argentino sin sobreactuar modismos.

## Cargá lo necesario

- Leé [references/voice-and-localization.md](references/voice-and-localization.md) al redactar cadenas nuevas, traducir o revisar consistencia.
- Cargá la skill visual o funcional correspondiente para conocer el estado que estás nombrando.
- Conservá las claves, variables y estructura de i18n existentes.

## Escribí la voz base

- Usá `vos` y verbos como `mirá`, `fijate`, `poné`, `seguí`, `usá`, `dejá`, `pará` y `volvé`.
- Decí una cosa por oración y una acción principal por bloque.
- Empezá por lo que importa ahora; explicá el porqué después.
- Soná cercano sin tratar al jugador como incapaz.
- Preferí palabras del juego que el usuario ya ve. No inventes jerga técnica.
- Mantené el humor seco y ocasional. No conviertas cada mensaje en un chiste.
- Usá “buddy”, “compañero” o expresiones naturales del producto sin forzar una mascota.

## Adaptá otros idiomas

- Traducí la intención y la longitud, no el acento argentino palabra por palabra.
- Usá inglés informal y directo, italiano informal y alemán con `du`.
- Conservá nombres propios y términos oficiales según la fuente de datos existente.
- No inventes una traducción canónica de una misión. Si el producto la mantiene en español, respetala.
- Mantené placeholders y variables exactamente iguales entre idiomas.

## Do

- Escribí labels de una a cuatro palabras.
- Limitá ayudas primarias a una o dos frases cortas.
- Usá “No sé” o “Todavía no hay dato” cuando falte información.
- Distinguí consejo de hecho observado.

## Don't

- No uses `vosotros`, conjugaciones peninsulares ni “estimado usuario”.
- No uses tono corporativo, ejecutivo o de soporte técnico.
- No prometas optimización perfecta ni resultados que la app no puede medir.
- No agregues features, lore, recompensas o datos de juego.
- No hagas chistes con nacionalidad, clase social o personajes.

## Ejemplos

**Mal:** “Estimado usuario, proceda a optimizar la capacidad productiva de su asentamiento.”

**Bien:** “Las monedas bajan. Pausá lo que duerme y mirá las casas.”

**Mal:** “Construid dos fábricas adicionales para maximizar el throughput.”

**Bien:** “Primero una cadena. Si alcanza, no la toques.”

**Mal:** “Error 404 de misión.”

**Bien:** “No la encontré. Copiame dos palabras del diario.”

## Propiedad intelectual

Reconocé que Ubisoft es dueña de Anno 1800, sus nombres oficiales, personajes, misiones, logos, capturas, renders y UI. Usá nombres solo para identificar contenido legítimo del producto. No presentes texto fan como copy oficial ni reproduzcas pasajes extensos del juego o materiales promocionales.

Incluí siempre en el footer: **Proyecto fan no oficial; no afiliado a Ubisoft.**
