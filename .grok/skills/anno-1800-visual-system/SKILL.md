---
name: anno-1800-visual-system
description: Define y revisa el lenguaje visual Belle Époque industrial de Anno 1800 Buddy. Usala al trabajar color, tipografía, superficies, profundidad, sellos, estados o motion.
metadata:
  type: design-system
  version: "1.0"
  game: anno-1800
---

# Sistema visual de Harbor Buddy

Diseñá una herramienta compañera de segundo monitor. Evocá un escritorio portuario de 1800 sin clonar la interfaz del juego.

## Cargá lo necesario

- Leé [references/tokens-and-materials.md](references/tokens-and-materials.md) antes de definir tokens, temas, superficies o motion.
- Copiá o adaptá [assets/tokens.css](assets/tokens.css) cuando haga falta una base CSS namespaced.
- Usá [assets/seal-template-64.svg](assets/seal-template-64.svg) como guía geométrica para un sello original; no lo conviertas en logo de Anno.
- Cargá `anno-1800-qa-visual` antes de aprobar la entrega.

## Fijá la voz visual

- Usá `#14110e` y `#1e1a14` como fondos oscuros cálidos.
- Usá `#c9a36a` para brass, `#f3e6cf` para cream, `#2f5658` para sea, `#7ea37c` para moss, `#c45c4a` para rust y `#b7a78e` para mist.
- Reservá cream para papel, texto principal y recortes de diario; no lo conviertas en una grilla de cards blancas.
- Usá Fraunces o una serif display cercana en títulos. Usá Figtree o una sans humanista cercana en controles y texto corto.
- Construí superficies como madera oscura, papel de almacén, latón envejecido y metal cepillado.
- Mantené bordes finos, radios moderados y sombras cortas. Hacé que la profundidad parezca física, no flotante.
- Usá sellos, woodcuts y siluetas como voz iconográfica primaria. Dejá iconos genéricos solo para utilidades secundarias.
- Animá con recorridos cortos, masa perceptible y desaceleración firme. Respetá `prefers-reduced-motion`.

## Diseñá para segundo monitor

- Priorizá una lectura útil en tres segundos.
- Mostrá un foco principal y como máximo dos señales secundarias por superficie.
- Reducí el texto ejecutivo. Preferí una frase y un estado visible.
- Conservá objetivos táctiles de al menos 40 px sin inflar toda la interfaz.
- Permití densidad compacta en escritorio y una columna clara en móvil.

## Do

- Combiná papel cream con madera navy y detalles brass.
- Usá pequeñas imperfecciones controladas en sellos, reglas y tramas.
- Marcá estados con color, forma y texto breve.
- Repetí una gramática visual coherente entre diario, grilla, cadenas y tablero.

## Don't

- No uses neón, violeta SaaS, glassmorphism frío ni gradientes de startup.
- No armes una pared de cards blancas con sombras azules.
- No uses pills para cada dato ni Lucide como personalidad principal.
- No agregues dashboards corporativos, KPIs ejecutivos o tablas como héroe.
- No copies marcos, escudos, logos, capturas o texturas del juego.
- No uses bounce, overshoot elástico ni confetti.

## Ejemplos

**Mal:** card blanca flotante, ícono genérico de fábrica, número grande y gráfico violeta.

**Bien:** recorte de papel sobre madera oscura, sello original de chimenea, estado rust y una frase corta del buddy.

**Mal:** pegar una captura de Estadísticas como fondo para “verse Anno”.

**Bien:** observar su jerarquía y redibujar barras originales en brass y moss.

## Propiedad intelectual

Reconocé que Ubisoft es dueña de Anno 1800, sus nombres oficiales, logos, capturas, renders y UI. El self-hosting no vuelve propio ese material. Observá paleta, proporción e iconografía y redibujá equivalentes originales. No descargues ni incrustes logos, screenshots, renders o packs de Nexus tal cual. No afirmes que el arte generado es oficial.

Incluí siempre en el footer: **Proyecto fan no oficial; no afiliado a Ubisoft.**
