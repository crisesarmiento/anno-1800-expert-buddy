# Revisión de etapas 1–4 y propuesta de segunda iteración

Fecha: 2026-09-20. Base local revisada: `2f41c70`, merge de etapa 4 (#64). Rama activa: `keel/etapa-5-verified-missions`; no se revisa ni se declara terminada la etapa 5. No se verificó la punta remota. Este documento complementa el plan original, cuyo encabezado de avance quedó desactualizado.

Preferencia explícita del usuario: escritorio; no se requiere adaptación ni QA móvil. Priorizar comparación entre islas, lectura de tablas y uso junto al juego. No añadir trabajo móvil al siguiente plan.

## Evaluación

La separación entre observado, confirmado e inferido, las islas identificadas por región/área, el historial por campaña y la distinción entre ruta configurada y entrega observada son una buena base. La tesorería histórica permite detectar caídas; todavía no explica el balance operativo sin ingresos, mantenimiento y movimientos extraordinarios. El contrato mantiene ingresos/mantenimiento fuera hasta verificar su propietario.

La etapa 3 implementa comparación de escenarios; no equivale todavía a un optimizador económico fiable. La etapa 4 añade evidencia logística, pero necesita conservar el destino y bien de cada observación antes de utilizar tasas para decidir abastecimiento. OCR sigue siendo complemento: no es requisito universal, pero los campos que el save no aporta necesitan una fuente alternativa explícita o permanecer desconocidos.

## Correcciones prioritarias

1. **Capacidad incremental mal contabilizada.** `src/lib/scenario/engine.ts`, `buildLocalChain`: calcula edificios a partir del déficit residual y vuelve a restar los edificios existentes. Reproducción con pescado: capacidad 2, demanda 6, una pesquería existente; propone añadir una y declara 4 t/min adicionales. Debe añadir capacidad real suficiente o declarar que no cubre el déficit. Probar cadenas parcialmente construidas y producción distinta de 100%.
2. **Entregas sin ámbito de estación.** `src/lib/live/a7s-trade-routes.ts`, `extractRouteVisits` y `summarizeRouteDeliveries`: conservan RouteID pero no isla/estación; agrupan todos los eventos de la ruta. `src/lib/trade-route-logistics.ts`, `inferredDeliveryTMin`, usa la mayor mediana entre bienes y el intervalo global. Una secuencia alternada de carga/descarga de 10 t cada minuto produce 10 t/min aunque el destino reciba 10 t cada dos minutos. Preservar región, área, bien, sentido verificado y tiempo; calcular entregas por destino/bien. Corregir también el scanner C# y el contrato, no solamente el parser TS.
3. **Reservas y selección de origen incompletas.** `verifiedSurplusTMin` trata reservas desconocidas como cero; `pickOrigin` elige por mayor excedente antes de evaluar transporte y coste. Evaluar todos los orígenes, conservar reservas desconocidas como restricciones y no reutilizar excedente entre destinos. `expandOriginAndTransport` debe propagar los datos faltantes del origen incluso cuando su capacidad numérica existe.
4. **Restricciones de producción insuficientes.** La expansión de fábrica puede suponer insumos disponibles sin comprobar suministro incremental; el adaptador copia población a disponibilidad laboral. Mantener población y trabajadores libres separados y exigir cobertura de insumos antes de declarar una alternativa viable.
5. **Alertas mezclan ámbitos.** `essentialStockDrops` acumula por bien, combinando islas y total global. Dos caídas aisladas en lugares distintos pueden cumplir el umbral de repetición. Mantener series independientes por campaña/rama/región/área/bien y distinguir explícitamente totales globales.
6. **Menor inversión no significa mejor balance.** `verdictOf` ordena por monedas de construcción. Mostrar ese criterio literalmente; comparar mantenimiento incremental, transporte e insumos antes de presentar una recomendación de ahorro. Un componente desconocido no debe costar cero.

## Plan 2 propuesto: decisiones económicas comprobables

### A. Consolidar cálculo y evidencia

Resolver las correcciones anteriores con pruebas de regresión. Definir un contrato compartido entre lector C#, JSON, validación y consumidor TS. Validar con copias de partidas reales y cambios controlados; los fixtures prueban lógica, no semántica del save. Registrar cobertura efectiva por isla/campo, unidad, fuente y antigüedad.

Criterio de salida: ningún consejo afirma cubrir demanda con capacidad insuficiente ni usa una tasa de ruta sin destino/bien; datos faltantes bloquean solamente las conclusiones que dependen de ellos.

### B. Diagnóstico de caja y operación

Separar tesorería, variación entre guardados y balance recurrente. Buscar ingresos/mantenimiento del jugador con ámbito probado. Hasta conseguirlos, ofrecer entrada manual o captura OCR contextual de esos campos, con fecha. Registrar compras, construcciones y recompensas cuando exista evidencia o declaración manual; nunca inferir su ausencia.

Criterio de salida: explicar qué se sabe de la caída y qué falta para atribuirla; no llamar déficit operativo a una mera reducción de tesorería.

### C. Tabla de abastecimiento para escritorio

Filas por isla y bien: stock, producción, consumo, importación observada, exportación reservada, déficit/excedente, fuente y antigüedad. Filtros por región, bien e isla; detalle lateral. Estimar tiempo hasta agotamiento sólo con stock y tasa neta comparables. Inicio conserva hasta tres acciones prioritarias.

### D. Comparador de decisiones

Evaluar producir localmente, ampliar cadena, importar y ampliar en cada origen candidato. Mostrar inversión, coste recurrente incremental, fuerza laboral, insumos, fertilidad, transporte y restricciones faltantes. Incluir productividad y pausas verificadas o supuestos editables. Comparar en un horizonte elegido; no inventar retorno si faltan beneficios/costes. Reservar abastecimiento entre destinos en un escenario conjunto.

Criterio de salida: una recomendación explica qué construir o transportar, dónde, cuánto cubre y qué podría invalidarla.

### E. Seguimiento, misiones y presupuesto militar

Registrar acción aplicada con isla/bien, fecha y muestra base; comparar ventanas posteriores de la misma rama sin afirmar causalidad automática. Incorporar requisitos de misiones verificados como reservas explícitas. Integrar etapa 6 con mantenimiento militar conocido, coste de ampliación y margen económico; presentar límites de datos cuando falten valores.

## Verificación de esta revisión

- `npm run typecheck`: aprobado.
- 47 pruebas focalizadas: historial, tesorería, escenarios, adaptador de escenarios, rutas y extracción de rutas; todas aprobadas.
- Reproducciones adicionales del cálculo incremental y de agregación de visitas ejecutadas contra el código local.
- No se ejecutó build, empaquetado ni auditoría visual en esta revisión; Grokbot está trabajando en la etapa 5 en el mismo checkout. No se modificó código de implementación.

Orden sugerido: completar misiones con sus límites explícitos; corregir A antes de ampliar recomendaciones automáticas; luego B–D, integrando presupuesto militar y seguimiento en E. La utilidad principal para el usuario es evitar decisiones económicas equivocadas, no aumentar la cantidad de indicadores.

## Plan 2 — P1-A (cálculos y honestidad)

Base de implementación: `62a54ea` (main, incluye etapa 6 #67 y el arreglo del BAT #68). Este bloque no reabre el BAT ni trabajo visual P1-B/P2.

| Ítem | Estado | Evidencia / límite |
| --- | --- | --- |
| 1. Capacidad incremental (pescado 2/6, 1 pesquería) | **hecho** | `buildLocalChain` ya no resta otra vez los edificios existentes. Prueba: añade 2 pesquerías y 4 t/min, no 1 y 4. Productividad ≠ 100% y cadena parcial de schnapps cubiertas en test. |
| 2. Reservas desconocidas ≠ 0 | **hecho** | `verifiedSurplusTMin` deja el excedente desconocido si hay otros consumidores y no hay reserva medida. |
| 3. Origen con transporte viable | **hecho** | `pickOrigin` prioriza transporte conocido sobre un excedente mayor sin barco. |
| 4. Insumos / mano de obra | **hecho** (lógica) / **parcial** (dato real) | Expandir fábrica exige insumos planificados. El adaptador ya no copia población como trabajadores libres. El save **no** publica mano de obra ociosa: sin dato, la alternativa queda desconocida, no viable. |
| 5. Alertas de stock por ámbito | **hecho** | `essentialStockDrops` separa campaña/rama/isla/bien y el total global. Dos caídas de una vez en islas distintas no disparan el umbral. |
| 6. Entrega por destino/bien | **hecho** (parser + contrato) / **parcial** (cobertura del save) | C#, JSON `stations[]`, watcher y consumidor TS. Tasa inferida sólo con `areaId`+bien. Si TradeRouteEntries no trae `AreaID`/`Identifier`, no hay tasa de destino: queda documentado, no se usa el intervalo mezclado. |
| 7. GUID de misión sin estado ≠ activa/save-read | **hecho** | Ingest ya no rellena `state: "active"`. `isSaveReadQuest` exige estado explícito. |
| 8. Seed de ejemplo ≠ diagnóstico de partida | **hecho** | Overlay de conteos sobre `campaign-ch1` queda `diagnosis: "mixed"`, no `save`. El seed de ejemplo solo es diagnóstico de ejemplo. |
| 9. Dos barcos mismo nombre ≠ un casco; roles por campaña | **hecho** | Inventario no colapsa por nombre. Roles manuales viven en `fleetRolesByCampaign`. |
| Tests `npm test` en Windows | **hecho** | `scripts/run-tests.mjs` enumera archivos y reporta conteos. Última corrida: scripts 15 archivos / 83 tests; app 74 archivos / 635 tests. Un glob que corre 0 tests no se declara verde. |

**Qué se puede confiar** (con los datos que el lector sí aporta): déficit incremental de una cadena, no gastar un excedente desconocido, no elegir un origen sin transporte por tener más números, no mezclar alertas de islas distintas, no tratar un GUID de quest como misión activa, no pintar el seed de ejemplo como la partida.

**Qué sigue condicionado:** ingresos/mantenimiento, mano de obra libre, reservas de exportación medidas, `AreaID` en cada visita de ruta, estado de quests desde el vigilante (`quests: []`), mantenimiento militar del save. Sin esos campos, la app declara el hueco; no completa con ceros.

P1-B (telemetría C#/contrato/cobertura): **hecho parcial** en esta rama (ver sección abajo). P2 (UI de escritorio, comparador, flota visible) queda **pendiente**.

## P1-B telemetria (2026-09-20)

Estado: **hecho parcial**.

Hecho:
- `reader` (id/version/engine/capabilities) + `coverage` snapshot-level en schema, types, validate, C#, watcher, a7s-snapshot, LiveStatus.
- XML vacio del mod documentado como no-extractor.
- income / maintenance / quests save-read: `unavailable` o empty-on-purpose; unknown ≠ 0.

Limites / condicionado:
- Cobertura describe lo que hay en el JSON de esta lectura; no prueba semántica de TaxBalance/Income.
- Nombres de isla dependen de CityName/CityNameGuid en el save.
- pack:mod debe regenerar bat/ps1 embebido tras tocar el watcher.

## P1-B follow-up (2026-09-20)

- Smoke + checklist reinicio vigilante: `docs/smoke-p1b-followup.md`.
- `nameSource: city-name-guid` cuando solo hay `CityNameGuid` (sigue `[guid]`, sin inventar nombre).
- Stock/edificios por isla: documentados como gap (AreaStorageManager no está bajo AreaManager en saves reales contrastados).

## P2-A UI de escritorio (2026-09-20)

Estado: **hecho parcial**. PR pequeño, solo escritorio; sin cambios de cálculo ni telemetría nueva.

Hecho:
- `HarborNavigation` (marca "Harbor Buddy", nav Inicio/Producción/Rutas/Diario, menú Más) ahora es el header
  compartido de `/`, `/diario`, `/taller` y `/rutas` — antes cada superficie tenía su propia cabecera
  (Diario: fila de 7 links + toggles que desbordaba horizontalmente en desktop; Taller: header mínimo sin
  selector de idioma; Rutas: header propio con Volver/idioma duplicados). Diario conserva solo lo que le es
  propio bajo el header compartido: spoilers y los dos escapes de calma.
- Contexto de isla activa (`activeIslandId`/`liveSnapshot`, ya existentes en el store) se muestra junto a la
  marca del header en las cuatro superficies, solo cuando hay una lectura — nunca inventa una isla sin save.
- `LiveStatus` (usado por Rutas y por el panel de conexión del Diario) ahora ofrece "Conectar partida" desde
  su estado vacío; antes el vacío de Rutas no tenía salida a `/conectar`.
- Taller se separó en pestañas Economía / Islas / Flota / Simulador (`data-taller-view`), con el contenedor
  ensanchado a `max-w-6xl` y las tarjetas de isla en grilla (`xl:grid-cols-2`) para comparar sin scroll extra
  en desktop ancho. Ningún componente ni prop de las tarjetas existentes cambió — solo se reorganizó el JSX
  de `TallerBench`.
- Overflow horizontal del Diario (fila de nav que se cortaba en `~1280px`, con "Anno 1800 Buddy" partiéndose
  en dos líneas) queda resuelto al pasar por el header compartido; verificado sin scroll horizontal en
  1280/1440/1920 en `/`, `/diario`, `/taller`, `/rutas`.

Qué se puede confiar: las cuatro superficies principales navegan entre sí de forma idéntica y sin ambigüedad
de marca; el contexto de isla mostrado en el header nunca aparece sin una lectura que lo respalde; los vacíos
de Rutas y del panel de conexión ya no son callejones sin salida.

Límites / pendiente para P2-B/C:
- No se tocó la lógica de cálculo, el contrato de telemetría ni el comparador económico — eso sigue en P2-B.
- El contexto de header muestra isla, no campaña (no hay nombre de campaña legible fuera del selector de
  `CampaignPicker`; mostrar el id crudo hubiera sido ruido, no evidencia).
- "Menos alertas apiladas" se abordó unificando chrome (una sola fila de nav en vez de cabecera + fila de
  links + fila de toggles en Diario); no se auditó cada aviso/alerta individual de cada tarjeta — eso queda
  para una pasada de jerarquía visual dedicada si se pide.
- Taller mantiene su paleta fría propia (`data-visual="taller"`) en vez de adoptar el bronce cálido de Inicio
  1:1 — es una decisión deliberada para no rehacer el sistema visual del taller en este PR; la estructura de
  header/nav sí es idéntica a las otras tres superficies.

## P2-B decisiones económicas (2026-09-20)

Estado: **hecho**. Un solo PR, solo escritorio; sin cambios de telemetría ni de contrato JSON.

| Ítem del encargo | Estado | Evidencia / límite |
| --- | --- | --- |
| 1. Tabla isla/producto usable | **hecho** | Nueva tabla en `/taller` → Simulador: fila por isla con stock, producción t/min, consumo t/min, déficit/excedente verificado, exportación comprometida, transporte hacia el consumidor y estado de ruta. Valores desconocidos muestran "sin dato", nunca 0. |
| 2. Materiales e insumos completos | **hecho** | `ScenarioAlternative.materialsNeeded` (nuevo campo) lista cada insumo directo de los edificios a sumar, a la tasa incremental — no solo el bien final. Se muestra en cada tarjeta de alternativa (`t.scenario.materialsLabel`). |
| 3. Exportaciones comprometidas, transporte, inversión y mantenimiento incremental | **hecho** | La tabla y cada tarjeta de alternativa muestran `reservedExportTMin`/`hasOtherConsumers` del origen y el t/min de transporte explícito. Inversión y mantenimiento ya eran incrementales (solo sobre `buildingsToAdd`); ahora ambos se exigen conocidos antes de comparar (ver ítem 5). |
| 4. Comparar todos los orígenes pertinentes | **hecho** | `pickOrigin` (single-best) se reemplazó por `rankedOrigins` + `transportSurplusFrom`/`expandOriginAndTransportFrom` por cada isla candidata. La UI agrupa las alternativas "Traer excedente" y "Ampliar origen y traer" por isla de origen en vez de mostrar una sola. Un origen sin ruta lista sigue apareciendo, marcado impossible con su bloqueador — no se oculta. |
| 5. «Menor inversión» ≠ «mejor balance» | **hecho** | `verdictOf` ya no ordena solo por `investment.coins`: una alternativa entra al ranking de costo solo si inversión **y** mantenimiento recurrente son ambos conocidos (`flagCostGaps`); un mantenimiento desconocido ya no cuenta como cero. El veredicto expone el motivo (`only-viable` vs `lowest-known-incremental-cost`) y la UI lo traduce con una advertencia explícita de que no es necesariamente el mejor balance si falta otro costo. |

Regresión: 3 pruebas nuevas en `engine.test.ts` (materiales del insumo directo en expand-local, comparación de 2 orígenes pertinentes en paralelo, y un veredicto que pasa a `insufficient-data` cuando la inversión es conocida pero el mantenimiento no). Las 20 pruebas previas del motor y las 4 de `observe.ts` siguen en verde sin cambios de comportamiento en los casos de un solo origen.

Qué se puede confiar: ninguna recomendación de "traer de otra isla" oculta orígenes con ruta o excedente pertinente; una alternativa con mantenimiento desconocido ya no puede ganar el comparador solo por tener menor costo de construcción conocido; los insumos directos de una ampliación quedan a la vista antes de construir.

Límites / pendiente:
- `materialsNeeded` es de un nivel (insumo directo de cada edificio agregado), no traza la cadena completa hacia atrás cuando `expand-local` asume que el insumo ya se produce en otro lado — eso ya lo cubre `inputBlockers`/`missing: inputs` por separado.
- No hay horizonte ni ROI: la comparación sigue siendo de costo conocido, no de retorno inventado (fuera del alcance de este PR, ver sección D del plan).
- La cobertura de mantenimiento por edificio en el catálogo sigue parcial (17 de ~26 edificios); muchas alternativas seguirán cayendo en "faltan datos" con honestidad en vez de un veredicto — es el comportamiento esperado, no un bug.
- `npm test` (75 archivos app / 641 pruebas, 15 archivos scripts / 83 pruebas), `npm run typecheck`, `npm run lint` y `npm run build` en verde. Verificación visual manual en `/taller` → Simulador con Playwright headless (1440×900): sin errores de consola; sin datos de guardado real disponibles en este entorno para capturar la tabla poblada, así que la vista con datos no se auditó pixel a pixel — el estado vacío honesto sí se confirmó.
