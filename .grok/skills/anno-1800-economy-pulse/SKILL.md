---
name: anno-1800-economy-pulse
description: Diseña y revisa el pulso económico de Anno 1800 Buddy. Usala para monedas, casas, necesidades, alertas y cadenas simples de materia prima a fábrica.
metadata:
  type: design-system
  version: "1.0"
  game: anno-1800
---

# Pulso de economía

Mostrá si la isla respira sin transformarla en una calculadora. El jugador necesita una señal y un próximo gesto, no un modelo de producción exhaustivo.

## Cargá lo necesario

- Leé [references/pulse-and-chain-states.md](references/pulse-and-chain-states.md) al mapear estados, casas o cadenas.
- Cargá `anno-1800-visual-system` para color y motion.
- Cargá `anno-1800-copy-rioplatense` para frases y `anno-1800-dashboard-charts` si el pulso entra al tablero.

## Diseñá el pulso

- Mostrá monedas como suben, bajan o desconocidas. No inventes una cifra.
- Usá moss con flecha corta ascendente para estable o positivo.
- Usá rust con flecha corta descendente para déficit.
- Usá mist y guion para desconocido o sin dato.
- Representá casas como ocupadas, vacías o con necesidad amarilla.
- Mostrá una recomendación breve asociada al estado: parar, conectar, llenar o mirar una necesidad.
- Animá cambios con un golpe corto y pesado. No mantengas un pulso infinito.

## Diseñá cadenas

- Presentá la regla visual `materia prima → fábrica`.
- Usá un par de sellos o siluetas y una flecha brass.
- Permití recorrer la cadena hacia atrás desde la necesidad de la casa.
- Mantené la heurística 1:1 solo cuando el contenido existente la indique; no la conviertas en simulación universal.
- Si falta información, marcá la cadena como desconocida y pedí observación, no cantidades.

## Do

- Hacé visibles rojo, verde y desconocido mediante forma, texto y color.
- Permití escanear monedas, casas y cadena en tres segundos.
- Mantené una acción principal por alerta.
- Mostrá `zzz` como señal de pausa o falta de insumo sin adivinar la causa exacta.

## Don't

- No uses tablas de toneladas por minuto, sliders de productividad ni hojas de cálculo.
- No inventes conteos de casas, fábricas o bienes.
- No llenes la pantalla con KPIs, sparklines o porcentajes sin fuente.
- No hagas parpadear el déficit ni uses alarmas rojas permanentes.
- No copies barras de necesidades ni iconos oficiales.

## Ejemplos

**Mal:** dashboard con ingreso neto exacto, doce ratios y optimizador de fábricas sin datos confiables.

**Bien:** sello rust “Monedas bajan”, una frase “Pausá lo que duerme” y una cadena visual para revisar.

**Mal:** una tabla con madera 2.4 t/min y aserraderos recomendados.

**Bien:** leñador → aserradero, ambos dibujados como sellos originales, con estado desconocido si no hay observación.

## Propiedad intelectual

Reconocé que Ubisoft es dueña de Anno 1800, sus nombres oficiales, logos, capturas, renders, barras e iconos. Observá relaciones y jerarquías, pero redibujá todos los estados y símbolos. No descargues ni incrustes screenshots o arte oficial.

Incluí siempre en el footer: **Proyecto fan no oficial; no afiliado a Ubisoft.**
