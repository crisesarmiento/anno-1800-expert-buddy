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
