# Harbor Buddy Telemetry

Mod no oficial para Anno 1800. No está afiliado a Ubisoft.

No cambia la partida. No da plata. No saltea misiones. No hay Lua en este paquete.

## Si el juego crasheó

Causas que ya vimos:

- **0.1.0** parcheaba el GUID 141 (un asset interno). Eso tira Anno.
- **0.1.1** tenía `"Category": "Misc"` como texto. El loader oficial espera un objeto `{ "English": "Misc" }`. Eso también puede tirar el juego al listar mods.

Hacé esto:

1. En Anno: Mods → desactivá Harbor Buddy Telemetry
2. Cerrá el juego
3. Borrá `Documentos\Anno 1800\mods\harbor-buddy-telemetry`
4. En Harbor Buddy: Instalar el mod → zip **0.2.0** + instalador
5. Activá el mod y abrí Anno

Si sigue crasheando, dejá el mod apagado. Harbor Buddy funciona igual: “Escribí lo que ves en el diario”.

## Qué hay adentro (0.2.0)

- `modinfo.json` con Category localizada (formato mod.io / tutorial oficial)
- `data/config/export/main/asset/assets.xml` con `<ModOps>` vacío
- Nada de Lua, nada de GUIDs vanilla

## Instalar

1. Harbor Buddy → Instalar el mod → Descargar mod.zip
2. Descargar instalador
3. `install-harbor-buddy.bat` o PowerShell
4. Si Windows bloquea: Más info → Ejecutar de todas formas
5. Anno → Mods → Harbor Buddy Telemetry ON
