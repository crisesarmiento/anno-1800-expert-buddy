# Telemetría nativa opcional (OCR)

Harbor Buddy puede enriquecer `harbor-live.json` con el servidor local de
[Anno1800UXEnhancer](https://github.com/NiHoel/Anno1800UXEnhancer). Es opt-in y no se redistribuye
su binario.

## Qué hace realmente

- `Server.exe` captura la ventana de Anno y reconoce la pantalla **Estadísticas** con OCR.
- Harbor Buddy consulta sólo el endpoint local `http://127.0.0.1:8000/AnnoServer/Population`.
- El vigilante consulta ese endpoint cada 4 segundos y guarda evidencia con hora, isla y pestaña.
- **Producción** aporta demanda (`limit`) y productividad media (`percentBoost`).
- **Finanzas** aporta cuántas fábricas existen en la isla (`existingBuildings`).
- El Taller recién aconseja construir o pausar cuando tiene ambas lecturas y un ritmo estático
  conocido para ese edificio. No usa el conteo global del save para una decisión por isla.

Esto no es lectura de memoria, una API de Ubisoft ni telemetría continua de fondo: si la pantalla de
Estadísticas no está visible, no aparecen datos nuevos. El código fuente del servidor confirma que
toma una captura y devuelve sólo la pestaña abierta.

## Instalación híbrida

1. Descargar la release externa y extraerla como `UXEnhancer` junto al launcher de Harbor Buddy.
2. Dejar `watch-harbor-live.bat` y `launch-harbor-buddy.bat` en la carpeta padre.
3. Abrir el launcher. Detecta `UXEnhancer\Server.exe`, luego inicia Anno, el vigilante y la app.
4. En cada isla a revisar, abrir unos segundos Estadísticas → Producción y después Finanzas.

Si `Server.exe` no existe o deja de responder, el vigilante continúa con saves locales/Ubisoft Cloud.
La última observación OCR queda fechada y la UI no la presenta como lectura de memoria.

## Límites conocidos

- El proyecto externo declara requisitos como Visual C++ Redistributable, ventana sin elementos que
  tapen los valores y, en algunos equipos, permisos de administrador.
- La última release publicada se identifica como Game Update 17; debe tratarse como integración
  experimental frente a actualizaciones posteriores del juego.
- El endpoint no expone rendimiento, tiempo de viaje, carga efectiva ni descarga de rutas
  comerciales. Las rutas siguen viniendo del save; Harbor Buddy no debe inventar throughput.
- Sólo los edificios cuyo GUID y ritmo están en el catálogo del Taller reciben recomendación. Los
  desconocidos se conservan como evidencia, pero no se clasifican.

## Campos nuevos de `harbor-live-v1`

- `connection.native`: proveedor, pestaña, isla, versión y `observedAt`. Sigue siendo la última
  observación **válida**: el vigilante nunca la borra sólo porque el sondeo actual falle.
- `connection.nativeProbe` (opcional): hechos técnicos del último sondeo HTTP, separados de
  `connection.native`. `state` es `reachable`, `unreachable` o `invalid_response`; `lastProbeAt`
  y, si alguna vez hubo éxito, `lastSuccessAt`; `reason` opcional (`timeout`,
  `connection_refused`, `bad_payload`) sólo en fallas. Nunca lleva palabras de estado de juego
  (`missing`, `starting`, `connected`, `stale`, `wrong_view`), ni `hintEs`, rutas locales,
  stacktraces o mensajes crudos de Windows. Un JSON sin este campo sigue siendo válido.
- `telemetry.production[]`: GUID/nombre, demanda, productividad, conteo de fábrica y fecha de la
  muestra (`observedAt`). `buildingCountObservedAt` (opcional) marca cuándo llegó ese conteo desde
  Finanzas — independiente de `observedAt` — para que el frescor de Finanzas no dependa del de
  Producción.

## Sondeo y reescritura

- `nativeProbe.result` es opcional: `observation`, `no_observation` (HTTP 200 con versión pero
  sin isla/métricas reconocidas), o `no_window` (HTTP 204). Los dos últimos indican un servidor
  accesible, no un JSON inválido. No reemplazan `native` ni `production` ni sus fechas.
- `lastSuccessAt` confirma una respuesta válida del servidor, **no** una observación útil.
  La fecha de evidencia sigue siendo exclusivamente `native.observedAt` / la de cada muestra.
- El timeout HTTP es de 8 segundos: la cadencia es ~4 segundos **más** el tiempo del sondeo y
  del procesamiento del save, no una garantía de tiempo real.
- La web mantiene un solo lector del archivo seleccionado durante la navegación. Tras recargar
  el navegador se requiere Actualizar; pausar o importar una muestra manual cancela el lector.
  Al volver a la pestaña se reintenta, sujeto a permisos del navegador.

- El vigilante sondea `Server.exe` cada ~4 segundos; eso está bien, no sobrecarga el proceso local.
- Sólo reescribe `harbor-live.json` cuando cambia el `state`/vista/observación útil del sondeo, o
  pasó un heartbeat de 30–60 segundos sin cambios. Una falla idéntica repetida (mismo `state` y
  `reason`) **no** reescribe el archivo sondeo tras sondeo.
- Si el sondeo falla, el vigilante sigue leyendo saves y **conserva** `connection.native` y
  `telemetry.production` del último éxito; sólo actualiza `connection.nativeProbe`. La UI debe
  marcar esa evidencia como histórica, no borrarla.

## Copy de servidor (UI)

- Estado `unreachable` → «Servidor OCR no detectado». Nunca «no está instalado»: el jugador puede
  tenerlo instalado y cerrado, o recién por abrir.
- Nunca mostrar un estado tipo `starting` salvo una señal real de lanzador + timestamp; no se
  infiere arrancando sólo por un TCP que todavía no contesta.
- `reachable` con `view` `population` o `unknown` → guiar, no diagnosticar: «Servidor conectado ·
  abrí Producción y Finanzas» (población) o «No pude reconocer la pestaña» (desconocida). Nunca
  mostrar `wrong_view` como si fuera evidencia.

El contrato detallado sigue en `docs/harbor-live.schema.json`.
