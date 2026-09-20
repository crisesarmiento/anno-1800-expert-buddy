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
