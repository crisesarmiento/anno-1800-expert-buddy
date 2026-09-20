# Encargo para Grokbot: implementar Plan 2 de Harbor Buddy

Implementá el plan de `docs/revision-etapas-1-4-plan-2.md`, versión ampliada a **etapas 1–6 + auditoría UI + seguimiento de PR #68**. No vuelvas a planificar desde cero. Leé también `AGENTS.project.md` y contrastá cada hallazgo con el código actual antes de modificarlo.

## Antes de empezar

- Partí del `main` actualizado. La revisión llega a `62a54ea` (PR #68), que ya evita que el BAT renombre el `.ps1` fuente cuando se ejecuta en el checkout. Conservá el arreglo y sus pruebas; no lo vuelvas a implementar.
- El documento actualizado puede estar sólo en cambios locales o adjunto a este encargo. Si tu copia todavía dice que sólo se revisaron las etapas 1–4, usá el documento adjunto completo. No supongas que la versión antigua contiene todos los hallazgos.
- Hay otros cambios locales en dependencias y artefactos de telemetría. Inspeccionalos y preservalos; no hagas reset/clean ni incluyas cambios ajenos sin revisar.
- Objetivo: ayudar a decidir dónde producir, cuándo transportar y qué gasto económico/militar sostener. **Sólo escritorio; sin adaptación ni QA móvil.** No modificar saves, automatizar el juego, inyectar código ni añadir auth/backend.

## Orden de implementación

1. **P1-A, cálculos y honestidad:** reproducir y corregir capacidad incremental (pescado: capacidad 2, demanda 6, una pesquería existente), reservas desconocidas, selección de orígenes con transporte viable, insumos/mano de obra, alertas de stock por ámbito y entrega por destino/bien. Una misión con GUID pero sin estado no puede convertirse en activa/save-read. Separar el seed de ejemplo del diagnóstico de partida. No usar dos barcos con nombre igual como prueba de un único casco; aislar roles militares por campaña.
2. **P1-B, telemetría:** mantener sincronizados C#, watcher, contrato JSON, normalizador y UI. Añadir versión/capacidades del lector y diagnóstico de cobertura; nombres de islas, stock por isla y paridad del paquete. El XML vacío no es el extractor. No publicar ingresos/gastos o misiones reales hasta demostrar propietario, ámbito y semántica; un campo desconocido no es cero.
3. **P2-A, UI de escritorio:** compartir cabecera, marca, navegación y contexto de campaña/isla; usar la estética papel/tinta/bronce de Inicio. Resolver desbordamiento del Diario, acceso a Conectar desde vacíos, jerarquía y exceso de avisos; separar vistas Economía/Islas/Flota/Simulador y aprovechar el ancho para comparar. Preservar rutas y funciones existentes.
4. **P2-B, decisiones económicas:** tabla isla/producto, materiales e insumos completos, exportaciones comprometidas, transporte, inversión y mantenimiento incremental. Comparar todos los orígenes pertinentes. «Menor inversión» no equivale a «mejor balance»; mostrar el criterio y los datos faltantes.
5. **P2-C, misiones y flota:** objetivos y reservas con evidencia, estado manual claramente rotulado hasta disponer de lectura real; inventario de cobertura explícita, subtotal de mantenimiento conocido y separación compra/construcción/sostenibilidad. Materiales deben estar en la isla/astillero apropiado. No prometer seguridad ni resultados de combate.
6. **P3** sólo después de estabilizar lo anterior: modificadores, DLC, Docklands y escenarios conjuntos con fuentes y pruebas.

Podés adelantar la unificación de UI cuando no dependa de nuevos datos, pero no habilites recomendaciones automáticas sobre cálculos aún pendientes.

## Forma de entrega

- PRs pequeños y revisables por bloque; si un bloque mezcla demasiado, subdividilo. Indicá problema, comportamiento resultante, pruebas y límites. No mezcles arreglos de lógica con una reescritura visual masiva.
- Actualizá el documento con pendiente/hecho/parcial y evidencia de cierre. Una función implementada con fixtures no demuestra que el watcher instalado pueda obtener el dato real.
- Añadí regresiones que reproduzcan los fallos. Ejecutá typecheck, lint, build y tests de app **y scripts**. En Windows, el glob actual de `npm test` llegó a ejecutar cero tests de scripts: corregí el descubrimiento portátil o enumerá los archivos y reportá cuántos corrieron. No declares verde una suite que no se ejecutó.
- Verificá interfaz de desarrollo y build de producción en navegador de escritorio, consola y acciones principales. Cubrí vacío, datos reales, datos incompletos/antiguos, error y cambio de campaña. Comprobá 1280/1440/1920 px, zoom y teclado, sin tareas móviles.
- Verificá extremo a extremo save → watcher C# → JSON → app para las capacidades realmente disponibles. Usá copias locales de saves y no las subas al repositorio. Usá fixtures explícitos para estados adicionales; nunca presentarlos como observaciones de mi partida.
- Si un campo no puede extraerse todavía, entregá el resto del bloque y documentá el límite concreto, el fallback manual/OCR y la prueba que falta. No rellenes con ceros o supuestos ocultos para cerrar una etapa.

Empezá por P1-A. Al entregar cada PR, explicá qué decisiones de la app ya se pueden confiar y cuáles continúan condicionadas por datos faltantes.
