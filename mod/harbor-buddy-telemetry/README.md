# Harbor Buddy Telemetry

Mod no oficial para Anno 1800. No está afiliado a Ubisoft.

No cambia la partida. No da plata. No saltea misiones.

## Si el juego crasheó

La versión 0.1.0 parcheaba un GUID interno del juego (141). Eso puede tirar Anno al arrancar.

1. En Anno: Mods → desactivá Harbor Buddy Telemetry
2. Cerrá el juego
3. Borrá la carpeta `Documentos\Anno 1800\mods\harbor-buddy-telemetry`
4. En Harbor Buddy: Instalar el mod → descargá el zip **0.1.1** y corré el instalador de nuevo
5. Activá el mod y abrí Anno

Si sigue crasheando, dejá el mod apagado y usá Harbor Buddy a mano: “Escribí lo que ves en el diario” o **Exportar dónde estoy**.

## Qué hace (0.1.1)

El paquete es un mod vacío a propósito, para que el loader lo acepte. El dump del diario es opcional y **no corre al cargar**.

Harbor Buddy lee `Documentos\Anno 1800\harbor-live.json` si existe. Si no, elegís la misión en la app.

## Instalar (recomendado)

1. En Harbor Buddy: Instalar el mod → Descargar mod.zip
2. Descargar instalador
3. Clic derecho en `install-harbor-buddy.ps1` → Ejecutar con PowerShell
   o doble clic en `install-harbor-buddy.bat`
4. Si Windows bloquea: Más info → Ejecutar de todas formas
5. Abrí Anno → Mods → activá “Harbor Buddy Telemetry”
6. Entrá a la campaña

## Instalar a mano

Copiá la carpeta `harbor-buddy-telemetry` a:

`C:\Users\TU_USUARIO\Documents\Anno 1800\mods\harbor-buddy-telemetry`

Tiene que existir `modinfo.json` justo ahí adentro, no un zip suelto.
