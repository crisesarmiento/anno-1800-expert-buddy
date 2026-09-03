---
name: anno-1800-qa-visual
description: Audita entregas visuales de Anno 1800 Buddy antes de aprobarlas. Usala para comprobar contraste, iconos, grillas, densidad, motion, originalidad y ausencia de arte oficial.
metadata:
  type: design-system
  version: "1.0"
  game: anno-1800
---

# QA visual de Harbor Buddy

Revisá la entrega como buddy de segundo monitor, como sistema coherente y como obra fan original. No apruebes una superficie solo porque compila.

## Cargá lo necesario

- Leé [references/visual-checklist.md](references/visual-checklist.md) y ejecutá las secciones aplicables.
- Volvé a cargar la skill que originó la superficie si encontrás una desviación.
- Inspeccioná desktop y móvil cuando exista una UI renderizada.

## Aplicá gates obligatorios

- Verificá contraste cream/navy y foco visible.
- Probá cada icono significativo a 24 px y dentro de su contexto real.
- Confirmá que una grilla anunciada como 10×10 tenga diez filas y diez columnas.
- Confirmá que mercado, leñador, aserradero u otros edificios relevantes estén dentro de la grilla, no solo en una leyenda.
- Verificá que monedas, casas y desconocido se distingan sin depender solo del color.
- Confirmá que el tablero no convierta presencia en conteo.
- Revisá que spoilers estén apagados por defecto.
- Probá `prefers-reduced-motion` y eliminá bounce.
- Buscá logos, screenshots, renders, hotlinks, data URIs raster y semejanzas oficiales.
- Confirmá el footer no afiliado a Ubisoft.

## Evaluá la voz del producto

- Hacé la prueba de tres segundos: misión o estado, próximo paso y objeto relacionado deben ser evidentes.
- Rechazá densidad de ERP, lenguaje ejecutivo y calculadora como centro.
- Conservá poco texto y una acción principal.
- Verificá español rioplatense por defecto y ausencia de `vosotros`.

## Do

- Registrá cada hallazgo con superficie, evidencia, impacto y corrección concreta.
- Compará iconos en conjunto, no solo de a uno.
- Revisá estados vacío, alerta, desconocido, completado y reduced motion.
- Volvé a probar después de corregir.

## Don't

- No apruebes por parecido con Anno; aprobá por coherencia, utilidad y originalidad.
- No uses screenshots oficiales como golden images.
- No inventes datos para llenar estados vacíos.
- No aceptes una leyenda que compense una grilla abstracta.
- No marques preferencias personales como defectos si cumplen el sistema.

## Ejemplos

**Mal:** “Se ve lindo” aunque los iconos desaparezcan a 24 px y la grilla no tenga edificios.

**Bien:** “El mercado se reconoce a 24 px dentro de la celda; calle y cobertura siguen distinguibles en escala de grises.”

**Mal:** aceptar un screenshot oficial porque está alojado localmente.

**Bien:** bloquearlo, documentar la fuente y pedir un redibujo original.

## Propiedad intelectual

Reconocé que Ubisoft es dueña de Anno 1800, sus nombres oficiales, logos, capturas, renders y UI. El self-hosting no vuelve propio ese material. Rechazá cualquier descarga, hotlink, screenshot usado como skin, pack de terceros reutilizado o afirmación de oficialidad.

Incluí siempre en el footer: **Proyecto fan no oficial; no afiliado a Ubisoft.**
