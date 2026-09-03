# Anno 1800 Buddy · design skill pack

Pack de diez skills de diseño para que un agente trabaje sobre Anno 1800 Buddy con criterio visual específico, sin convertirlo en un clon del juego, un cheat ni una calculadora de producción.

## Cómo cargar el pack

Aplicá divulgación progresiva:

1. Leé al iniciar solamente `name` y `description` de cada `SKILL.md`.
2. Cargá el cuerpo completo de la skill cuando el pedido coincida con sus triggers.
3. Abrí solo los archivos de `references/` que la skill indique para la tarea actual.
4. Tratá `assets/` como material para copiar, adaptar o inspeccionar; no lo cargues como instrucciones.
5. Antes de cerrar una entrega visual, cargá `anno-1800-qa-visual`.

Las skills siguen la [especificación Agent Skills](https://agentskills.io/specification). Viven como hijas directas de `.grok/skills/` para que el agente de este repositorio las descubra sin configuración adicional.

## Árbol

```text
.grok/skills/
├── README.md
├── anno-1800-visual-system/
│   ├── SKILL.md
│   ├── references/tokens-and-materials.md
│   └── assets/{tokens.css,seal-template-64.svg}
├── anno-1800-building-icons/
│   ├── SKILL.md
│   ├── references/{campaign-building-catalog.md,icon-construction.md}
│   └── assets/building-icon-template.svg
├── anno-1800-city-grid/
│   ├── SKILL.md
│   ├── references/{cell-color-map.md,grid-reading-patterns.md}
│   └── assets/grid-legend.svg
├── anno-1800-mission-chrome/
│   ├── SKILL.md
│   ├── references/campaign-chrome.md
│   └── assets/mission-seal-template-64.svg
├── anno-1800-economy-pulse/
│   ├── SKILL.md
│   └── references/pulse-and-chain-states.md
├── anno-1800-diplomacy-cast/
│   ├── SKILL.md
│   ├── references/cast-and-portrait-guidance.md
│   └── assets/portrait-seal-template-64.svg
├── anno-1800-dashboard-charts/
│   ├── SKILL.md
│   └── references/presence-chart-grammar.md
├── anno-1800-copy-rioplatense/
│   ├── SKILL.md
│   └── references/voice-and-localization.md
├── anno-1800-reference-sources/
│   ├── SKILL.md
│   └── references/{source-register.md,study-protocol.md}
└── anno-1800-qa-visual/
    ├── SKILL.md
    └── references/visual-checklist.md
```

## Tabla del orquestador

| Skill                         | Cargala cuando                                                   | Cargá también                                           |
| ----------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| `anno-1800-visual-system`     | Definas o revises superficies, color, tipo, profundidad o motion | `anno-1800-qa-visual` al cerrar                         |
| `anno-1800-building-icons`    | Dibujes o evalúes iconos de edificios de campaña                 | `anno-1800-visual-system`                               |
| `anno-1800-city-grid`         | Diseñes stamps, bloques 10×10, calles, granjas o coberturas      | `anno-1800-building-icons`, `anno-1800-visual-system`   |
| `anno-1800-mission-chrome`    | Toques diario, capítulos, misiones, sellos o spoilers            | `anno-1800-copy-rioplatense`, `anno-1800-visual-system` |
| `anno-1800-economy-pulse`     | Muestres monedas, casas, necesidades o cadenas                   | `anno-1800-copy-rioplatense`, `anno-1800-visual-system` |
| `anno-1800-diplomacy-cast`    | Representes a Kahina, Blake, Hannah, Edvard o Isabel             | `anno-1800-visual-system`                               |
| `anno-1800-dashboard-charts`  | Diseñes el tablero de presencia y sus tooltips                   | `anno-1800-economy-pulse`, `anno-1800-visual-system`    |
| `anno-1800-copy-rioplatense`  | Escribas o revises cualquier texto visible                       | Ninguna obligatoria                                     |
| `anno-1800-reference-sources` | Consultes la wiki, el juego o Anno Union                         | La skill visual correspondiente                         |
| `anno-1800-qa-visual`         | Hagas la revisión final de una entrega visual                    | Las skills que originaron la entrega                    |

## Límites del producto

- Diseñá un buddy de campaña para segundo monitor: calmado, visual y de poco texto.
- No agregues features, reglas de juego ni telemetría que el producto no tenga.
- No conviertas el buddy en ERP, overlay, cheat, clon de la UI del juego ni calculadora de toneladas por minuto.
- Conservá React, TanStack Start, dark mode y las decisiones técnicas existentes; estas skills elevan el diseño, no reescriben el stack.
- Usá español rioplatense por defecto y respetá los idiomas existentes `es`, `en`, `it` y `de`.

## Propiedad intelectual

Ubisoft es titular de Anno 1800, sus nombres oficiales, logos, capturas, renders y UI. El self-hosting no cambia esa titularidad. Usá la wiki y el juego como referencias de observación, redibujá equivalentes originales y no descargues, hotlinkees ni incrustes arte oficial o packs de terceros tal cual.

Incluí siempre en el producto: **Proyecto fan no oficial; no afiliado a Ubisoft.**
