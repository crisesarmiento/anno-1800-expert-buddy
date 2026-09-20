# Plan de implementación: asesor económico, logístico y militar

Fecha: 2026-09-20. Estado: Etapa 0–5 en main. Etapa 6 (esta rama): sostenibilidad militar — inventario de flota del jugador, mantenimiento inferido de catálogo plegado en Taller, cobertura «riesgo no evaluable», sin acciones automáticas.
Base revisada: main local `106afe1`. No se confirmó la punta remota por restricciones de conexión.

## Objetivo y decisiones

Ayudar a responder por qué cae el balance, dónde producir, cuándo transportar entre islas y qué gasto militar se puede sostener. Integrar requisitos de misiones sin confundir una etapa sugerida con progreso confirmado.

Fuente principal: guardados leídos en modo read-only. OCR opcional como complemento por campo, isla y fecha; nunca requisito para navegar o usar el historial. Catálogo estático para interpretar GUIDs y simular escenarios. No auth, backend persistente, inyección, automatización del juego ni modificación de saves.

Inicio mantiene hasta tres prioridades. Cada consejo muestra acción, motivo, evidencia, fecha, impacto estimado si es calculable y condiciones que podrían invalidarlo. El detalle vive fuera del diario.

## Hallazgos que condicionan el trabajo

- El watcher de Windows de main emite `quests = []`; el matcher puede inferir una etapa por edificios. El parser TypeScript etiqueta como activas las quests reconocidas por GUID sin demostrar su estado. Ninguna vía basta para seguimiento real.
- `islandName` y `telemetry.islands` heredados pueden representar regiones. No deben reutilizarse como identidad de isla.
- El scanner C# guarda `goods[row.id] = amt` sin conservar el ámbito por registro y toma el máximo de los candidatos a dinero. Hay que demostrar propietario y ámbito antes de usar esos valores en diagnósticos financieros.
- La producción actual es una estimación a partir del catálogo, demanda, productividad y edificios. No demuestra excedente exportable ni justifica pausar fábricas sin conocer dependencias.
- Hay cambios locales ajenos a esta propuesta; falta el `.ps1` original y existe `.ps1.old`. El empaquetador/launcher contempla renombrados. Investigar procedencia antes de restaurar, regenerar o sobrescribir. No tratar automáticamente la diferencia local como un defecto de main.

## Etapa 0 — Contrato de evidencia y auditoría del lector

Entregable: matriz de campos con origen, ámbito, unidad, fecha, disponibilidad y validación. Estados: validado, parcial, no disponible. Un campo desconocido nunca se convierte en cero.

Revisar `a7s-scan.cs`, `a7s-snapshot.ts`, watcher y documentación; distinguir código usado por Windows de utilidades de investigación. Verificar dinero y bienes contra registros del propietario correcto. Mantener lecturas ambiguas fuera de recomendaciones.

Usar copias locales de saves reales, sin incorporarlas al repositorio. Contrastar muestras con Estadísticas del juego: dos islas, distintos bienes, una ruta, guardar/cargar y un cambio controlado conocido. Si no hay muestras accesibles, entregar fixtures y diagnóstico de cobertura, sin declarar validados los campos reales.

Criterio de salida: cada dato que llega al asesor tiene semántica documentada; el sistema puede explicar qué falta. No se publica un diagnóstico financiero a partir de una lectura ambigua.

## Etapa 1 — Islas reales e historial persistente

Extender el recorrido de FileDB anidado y vincular región/sesión, `AreaInfo`, propietario y `AreaManager`. Resolver nombres por `CityName` o `CityNameGuid`; usar un nombre neutral si no existe traducción. Relacionar estaciones comerciales con la isla mediante sus IDs, no por texto.

Añadir campos opcionales a `harbor-live-v1`, preservando los heredados sin cambiarles el significado:

- Identidad de campaña/jugador cuando pueda verificarse; ID de snapshot y tiempo de simulación cuando exista.
- `islandSnapshots[]`: clave compuesta región + área, propietario, nombre y bloques opcionales de stock, edificios, población y capacidades.
- Cobertura y procedencia por bloque/campo: guardado, OCR o manual; ámbito y momento de observación.

Los nombres definitivos y unidades se fijan al cerrar la etapa 0. Las lecturas OCR sólo se asocian automáticamente si la isla se resuelve sin ambigüedad; un nombre duplicado no basta.

Historial local en IndexedDB, separado del estado de navegación y del JSON de intercambio. Política inicial: hasta 200 snapshots distintos por campaña, deduplicados; retención configurable posteriormente. Evitar inflar el contrato actual limitado a 400 KB: snapshots resumidos, límites explícitos y sin truncado silencioso.

Si se carga un save anterior, iniciar otra rama de historial; no calcular una caída contra un futuro de la misma partida. Ni el nombre de archivo ni su mtime identifican por sí solos campaña o tiempo de juego. Si no podemos identificarla, pedir selección explícita de campaña.

Criterio de salida: dos islas con el mismo bien conservan valores independientes; renombrar una isla no pierde su historial; cambiar de campaña no mezcla muestras; reiniciar conserva el historial. Los datos atrasados permanecen visibles con su fecha.

## Etapa 2 — Primer producto útil: entender pérdidas

Extraer, cuando se verifiquen, tesorería, ingresos recurrentes, mantenimiento y gastos globales. No confundir variación de dinero con balance por minuto: compras, construcción y recompensas también cambian la tesorería.

En Taller incorporar una vista de economía por isla y un resumen de gastos globales. En Inicio priorizar pérdidas recurrentes confirmadas, fallas estructurales de rutas y caídas persistentes de bienes esenciales. Una caída de stock genera una investigación sugerida, no una causa inventada.

Mostrar descomposición financiera sólo si los componentes existen; si no, mostrar evolución del dinero y cobertura incompleta. No calcular autonomía de caja ni minutos hasta agotar stock sin reloj de simulación validado y muestras suficientes. Con tiempo válido, usar varias muestras comparables, advertir variabilidad y excluir compras/recompensas identificadas.

Agregar decisiones en seguimiento: el usuario puede marcar «apliqué este cambio» y comparar guardados posteriores. Mostrar el resultado observado sin atribuir causalidad exclusiva.

Criterio de salida: una compra aislada no se etiqueta como déficit recurrente; los costos compartidos no se suman dos veces; cada alerta enlaza a evidencia concreta. Todo esto funciona con OCR apagado, según cobertura del save.

## Etapa 3 — Producir localmente o importar

Ampliar el catálogo de forma incremental para los bienes detectados en la campaña. Cada cifra debe tener fuente, unidad y cobertura de DLC/modificadores. Leer o registrar fertilidad, recursos, fuerza laboral, infraestructura, edificios activos/pausados y efectos aplicables. Datos faltantes permanecen desconocidos.

Motor de escenarios puros, separado de los datos observados:

1. Aumentar capacidad existente en la isla consumidora.
2. Crear una cadena local, con los eslabones que realmente falten.
3. Transportar excedente verificado de otra isla usando capacidad disponible.
4. Ampliar origen y transporte si no alcanza.

Comparar inversión inicial, cambio de gasto recurrente, mano de obra, dependencias y viabilidad logística. Calcular ahorro o recuperación de inversión sólo si los componentes necesarios están conocidos. No asumir que mayor suministro genera automáticamente cierto ingreso fiscal.

Preservar las necesidades de origen y otras exportaciones; evitar contar un mismo excedente dos veces. Un stock alto no prueba excedente continuo. No recomendar pausa sólo por demanda local inferior a capacidad.

Interfaz: elegir isla y bien en Taller; ver alternativas con supuestos y datos faltantes. Resultado posible: «faltan datos para elegir», acompañado del próximo dato útil.

Criterio de salida: una isla exportadora no recibe consejo de recorte por ignorar consumidores; dos destinos compiten por el mismo excedente; una alternativa imposible por recursos o mano de obra no gana por costo.

## Etapa 4 — Logística comprobable

Reutilizar Rutas y su diagnóstico estructural. Añadir nombres de islas y barcos verificables. Decodificar dirección de carga/descarga y cantidades configuradas sólo después de contrastar su semántica.

Investigar historial de entregas y reloj de juego en los saves. Si se confirma, estimar volumen efectivo por intervalo, regularidad y cobertura del consumo. Separar capacidad nominal, cantidad configurada y entrega realizada.

Las funciones de transporte de la etapa 3 se habilitan gradualmente: sin entregas o tiempos verificados se comparan escenarios con parámetros manuales explícitos, no rendimiento supuestamente real. La caída global de un bien nunca demuestra que una ruta causó el problema.

Criterio de salida: rutas configuradas sin entregas observadas no aparecen como abastecimiento garantizado; carga parcial, almacén lleno y tiempos desconocidos no producen falsas certezas.

## Etapa 5 — Misiones verificadas

Separar sugerencia de etapa, checklist manual y estado leído. Extender el contrato opcionalmente para ID de instancia, tipo, objetivos, progreso, estado y temporizador cuando puedan decodificarse. Diferenciar misiones repetidas con el mismo GUID.

Probar transiciones con saves antes/después: aceptar, avanzar, entregar, completar, fallar o vencer. Ausencia en una muestra no equivale a completada. Un temporizador del último save no sigue corriendo en la app como si conociera el juego vivo.

Diario muestra sólo misiones conocidas, sin spoilers. Conectar requisitos confirmados con el plan económico como reservas sugeridas; no descontar reservas ficticias del stock leído. Si no se valida el estado, conservar confirmación manual claramente rotulada.

Criterio de salida: tener un edificio no completa una misión; quests desconocidas conservan identidad; cargar un save anterior restaura su progreso sin heredar completadas futuras.

## Etapa 6 — Sostenibilidad militar

Primero inventario del jugador y gasto: barcos, tipo, mantenimiento, asignación y ubicación cuando estén disponibles. Integrar el costo militar en la etapa 2 en cuanto se valide, sin esperar el módulo completo. Evitar duplicar barcos comerciales y militares en los totales.

Después evaluar cobertura usando datos verificables de diplomacia, defensas y compromisos de escolta. Si faltan, permitir registrar una función manual por flota y mostrar «riesgo no evaluable». No inferir seguridad por ausencia de enemigos en una muestra.

Vista secundaria de flota: costo, función y compromisos. Comparar nuevas construcciones con presupuesto y materiales reservados para misiones. No sugerir desarmar una defensa solamente porque sea costosa ni prometer resultados de combate.

Criterio de salida: flota de escolta no se marca como sobrante; información militar incompleta limita el consejo explícitamente; no hay acciones automáticas sobre el juego.

## Arquitectura y superficies de cambio

- Extracción: `src/lib/live/a7s-scan.cs`, readers TypeScript y `public/watch-harbor-live.ps1`; regenerar paquetes mediante `npm run pack:mod`.
- Contrato: tipos, JSON schema, normalizador, fixtures y documentación juntos; JSON anterior sigue funcionando.
- Historial: módulo local nuevo con retención, ramas y deduplicación; el watcher sigue siendo el único escritor del snapshot compartido.
- Análisis: funciones puras separadas para finanzas, abastecimiento, escenarios, flota y misiones. Reutilizar catálogo/motor existente donde su semántica esté verificada.
- Presentación: Inicio = tres prioridades; Taller = economía/comparativas; Rutas = transporte; Diario = misiones; flota como detalle secundario. Diagnóstico de conexiones permanece en Conectar.
- Procedencia: conservar observaciones de distintas fuentes por separado. Ningún OCR más reciente borra automáticamente un dato de guardado de ámbito diferente.

## Secuencia de entregas

1. PR de auditoría y correcciones de confianza: ámbito, propietario, quests sugeridas y cobertura.
2. PR de extracción de islas y contrato compatible.
3. PR de historial y comparación de muestras.
4. PR de resumen económico y prioridades: primera versión útil para detectar pérdidas.
5. PR de catálogo y escenarios de producción, seguido de logística validada.
6. PR de misiones verificadas, o su fallback manual si la investigación no valida estados.
7. PR de flota y sostenibilidad militar.

Cada investigación tiene salida útil aun si no logra extraer todo: registrar campos no disponibles y continuar con funcionalidades sustentadas. No prometer fechas cerradas para la ingeniería inversa antes de validar muestras. No instalar parsers comunitarios ni sustituir la distribución por Python como dependencia del usuario; usar sus fuentes para investigar estructuras compatibles.

## Verificación obligatoria

Tests de semántica con fixtures pequeños y contrastes locales contra saves reales: propietarios, islas repetidas, campos ausentes, pausas, cambio de velocidad, rollback, campañas distintas, OCR desactualizado, rutas e instancias de misiones.

Para cada cambio de telemetría/UI: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; parsear PowerShell y verificar el watcher empaquetado. Revisar interfaz de desarrollo y build en navegador, escritorio y 390 px, con consola limpia. Probar OCR apagado y JSON heredado. Medir costo de lectura con partidas grandes; no reprocesar archivos idénticos.

## Referencias de investigación

- `AGENTS.project.md`, `docs/harbor-live-fields.md`, `docs/native-telemetry.md`, `docs/filedb-spike-routes.md`.
- Wiki, interpretación de estadísticas: https://anno1800.fandom.com/wiki/Statistics
- Wiki, objetivos de misiones: https://anno1800.fandom.com/wiki/Quests
- Lector comunitario de islas/edificios: https://github.com/NiHoel/Anno1800SavegameVisualizer/blob/main/tools/a7s_model.py
- OCR opcional existente: https://github.com/NiHoel/Anno1800UXEnhancer

Las referencias orientan la investigación; no prueban por sí solas que nuestra implementación extraiga correctamente un campo de la partida del usuario.
