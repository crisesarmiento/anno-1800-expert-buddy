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

- `connection.native`: proveedor, pestaña, isla, versión y `observedAt`.
- `telemetry.production[]`: GUID/nombre, demanda, productividad, conteo de fábrica y fecha de la
  muestra.

El contrato detallado sigue en `docs/harbor-live.schema.json`.
