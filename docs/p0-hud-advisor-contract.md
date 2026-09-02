# P0 HUD advisor contract

Shared contract for API (`adviseHud`) and session desk/chat paste UI.

One pasted Anno 1800 HUD screenshot → one pulse + 1–4 short Spanish sentences. First sentence is the only action.

This is **not** `Pulse` in `src/lib/play.ts` (`coins` / `houses` / `looking`). Do not reuse or extend that type. HUD pulse is a single enum.

Implement in `src/lib/hud-advisor.ts` as `createServerFn({ method: "POST" })` named `adviseHud`. UI calls that function only.

---

## 1. Pulse enum

Exactly four values. NFC. Lowercase. Never a fifth (`unknown`, `verde`, `ok`, `critico`, …).

| `pulse` | Meaning | HUD cues (any one is enough) |
| --- | --- | --- |
| `rojo` | Critical now | Balance / income ticker red; coins falling hard; riot / fire / illness outbreak; need bars fully red; bankruptcy / island-unrest red; ship or combat critical |
| `amarillo` | Warning | Yellow residence need bars; yellow workforce / production; happiness yellow; stock low but not empty; missing some (not all) construction goods |
| `vacío` | Empty need or stock | Warehouse at 0 of a consumed good; empty residences (nobody moved in / zzz houses); production building idle for missing input; workforce slot empty and blocking; construction stopped for a missing material |
| `recado` | Mail / quest ping | Envelope / mail icon; campaign or quest marker; NPC request ping; expedition-return mail; screenshot is the quest / letter UI and the city is not in failure |

### Priority (highest wins)

When the screenshot shows more than one class of cue:

`rojo` > `vacío` > `amarillo` > `recado`

Pick the single highest class. Do not blend pulses. Do not return two.

### Ambiguous HUD

Never invent a fifth pulse.

- Depleted / unoccupied / “nothing in the pile” vs merely low → `vacío`
- Tint unclear (red vs yellow) but something is wrong and not empty → `amarillo`
- City looks calm (green / no failure) and a quest/mail ping is visible → `recado`
- City looks calm and there is no mail/quest ping → `amarillo` (do not invent a crisis; action = don’t expand, follow the visible mission marker if any, else leave the city alone)

---

## 2. Response shape (success)

```json
{
  "ok": true,
  "pulse": "rojo",
  "sentences": [
    "Pará de construir y pausá las fábricas que te dejan el saldo en rojo.",
    "El ticker de arriba está en rojo: las chimeneas te comen más de lo que pagan las casas."
  ]
}
```

| Field | Rule |
| --- | --- |
| `ok` | `true` |
| `pulse` | One of `rojo` \| `amarillo` \| `vacío` \| `recado` |
| `sentences` | Array of 1–4 strings. Hard cap 4 (slice extras). Empty array is invalid → error `unreadable_hud` |
| `sentences[0]` | **The** next action. Imperative. Concrete. Grounded in something visible on this HUD. Rioplatense (`vos`, `pará`, `conectá`). Never vosotros. Never Spain-Spanish. |
| `sentences[1..]` | Only justify or constrain **that same** action. No second action. No extra advisor panel. |
| Language | Spanish only. Short sentences. No markdown, no bullets, no `**bold**`. |
| Numbers | HUD-visible counts are allowed (`tres casas vacías`). **Forbidden:** ratios (`2:1`, `4:1`), `t/min`, `por minuto`, efficiency %, production-chain calculator talk, “óptimo”. |

Post-filter (deterministic, required):

1. `plainTalk` the same way as `src/lib/buddy.ts` (strip markdown).
2. If `sentences.length > 4`, `sentences = sentences.slice(0, 4)`.
3. Drop any sentence matching `/\d+\s*:\s*\d+/`, `/\bt\/min\b/i`, `/\bpor minuto\b/i`, `/\bratio\b/i`.
4. If `sentences[0]` was dropped or none remain → `ok: false`, `code: "unreadable_hud"` (no fake pulse).
5. If a later sentence contains a second imperative action (another “hacé X” that is not the first action), drop it.

---

## 3. Input

Exactly **one** image per request.

Accepted encodings (mutually exclusive):

- Multipart field `image` (binary), **or**
- JSON `{ "imageDataUrl": "data:image/png;base64,..." }`

Accepted MIME: `image/png`, `image/jpeg`, `image/webp`. Max decoded size **8 MiB**.

Reject before vision:

| Condition | `code` |
| --- | --- |
| No file, empty FileList, empty paste, whitespace-only data URL | `empty_paste` |
| Two or more images (multi-file drop, two clipboard images) | `multi_image` |
| Payload is not an image MIME (text, PDF, SVG, HTML) | `not_image` |
| Image larger than 8 MiB | `not_image` |

Client (desk/chat): Cmd/Ctrl+V or drag-drop of a single image. No gallery. No multi-file input. No `localStorage` / IndexedDB of screenshots. `URL.revokeObjectURL` after the in-flight request finishes.

---

## 4. Privacy

Image bytes exist only for the request lifetime.

- Server: hold in memory (`ArrayBuffer` / `Blob`). Never `writeFile`, never object storage, never temp files, never log pixels, data URLs, or base64. Drop the buffer when the handler returns (success or error).
- Client: in-memory only for the in-flight request. Do not persist derived screenshots. The user’s own clipboard / disk is not our store.
- Errors and analytics may log `code` + byte length, never the image.

---

## 5. Spoilers and product bans (always on this endpoint)

Spoilers are **OFF** here even if the session toggle is on. Ignore `store.spoilers`.

Forbidden in model prompt **and** in post-filter of `sentences`:

- Campaign / story reveals, betrayals, endings, DLC plot
- Unrevealed unlocks, future resident tiers, buildings not visible on this HUD
- Ratios, tons/minute, chain calculators, min-max layouts
- Shame about ugly cities; 20-step plans

Allowed: name what is **on this screenshot** (ticker, a need bar, a mail icon, “el marcador de la misión”). Traders visible on HUD (e.g. Kahina as cajero) are OK as HUD-grounded, not as plot.

Vision instruction: infer the most urgent **visible** issue, map it with §1, write `sentences` per §2. Do not solve the campaign.

---

## 6. Errors

No `pulse` field on error. Never invent a pulse to be polite.

```json
{
  "ok": false,
  "code": "unreadable_hud",
  "message": "No se lee el HUD. Acercá la captura o recortá la barra de arriba."
}
```

| `code` | When | Canonical `message` (UI may show this verbatim) |
| --- | --- | --- |
| `empty_paste` | Zero images | No hay captura. Pegá una sola foto del HUD. |
| `multi_image` | More than one image | Una sola foto. Sacá las demás y pegá de nuevo. |
| `not_image` | Not a PNG/JPEG/WebP, or > 8 MiB | Eso no es una imagen. Pegá una captura del juego. |
| `not_anno` | Readable image that is not Anno 1800 HUD (desktop, another game, photo) | No parece Anno 1800. Pegá el HUD del juego, no otra pantalla. |
| `unreadable_hud` | Anno-ish but HUD unreadable (blur, crop, overlay), or model/post-filter produced no valid sentences | No se lee el HUD. Acercá la captura o recortá la barra de arriba. |
| `advisor_down` | Missing `XAI_API_KEY`, upstream fail, network | No llegó la radio del puerto. Probá de nuevo. |

HTTP/server-fn: still return the JSON body above (do not throw for the cases in this table except validator-level empty input, which must map to `empty_paste` rather than a generic 500).

---

## 7. Spanish format examples (copy these tones)

### `rojo`

```json
{
  "ok": true,
  "pulse": "rojo",
  "sentences": [
    "Pará de construir y pausá las fábricas que te dejan el saldo en rojo.",
    "El ticker de arriba está en rojo: las chimeneas te comen más de lo que pagan las casas.",
    "No abras islas ni recados hasta que el saldo deje de bajar."
  ]
}
```

### `amarillo`

```json
{
  "ok": true,
  "pulse": "amarillo",
  "sentences": [
    "Arreglá el pescado de esas casas con la barra amarilla.",
    "Una cadena sola: el pescado. No una ciudad nueva."
  ]
}
```

### `vacío`

```json
{
  "ok": true,
  "pulse": "vacío",
  "sentences": [
    "Conectá esas casas vacías al mercado con una calle.",
    "Sin camino no se muda nadie, y las casas vacías no pagan."
  ]
}
```

### `recado`

```json
{
  "ok": true,
  "pulse": "recado",
  "sentences": [
    "Abrí el sobre del recado y entregá lo que pide.",
    "Las barras se ven calmas; el recado es el único ping."
  ]
}
```

Bad (reject / post-filter):

- `"Poné granjas y panaderías 2:1 y otra isla."` — ratio + second action
- `"En el próximo capítulo tu hermano te traiciona."` — spoiler
- `"El layout óptimo es diamante 10×10 a 100% eficiencia."` — calculator
- Fifth pulse `"verde"` — illegal

---

## 8. TypeScript sketch (normative names)

```ts
export const HUD_PULSES = ["rojo", "amarillo", "vacío", "recado"] as const;
export type HudPulse = (typeof HUD_PULSES)[number];

export const HUD_ERROR_CODES = [
  "empty_paste",
  "multi_image",
  "not_image",
  "not_anno",
  "unreadable_hud",
  "advisor_down",
] as const;
export type HudErrorCode = (typeof HUD_ERROR_CODES)[number];

export type AdviseHudSuccess = {
  ok: true;
  pulse: HudPulse;
  sentences: [string, ...string[]]; // length 1–4
};

export type AdviseHudError = {
  ok: false;
  code: HudErrorCode;
  message: string;
};

export type AdviseHudResult = AdviseHudSuccess | AdviseHudError;
```

JSON Schema: `docs/p0-hud-advisor.schema.json`.

---

## 9. Test fixtures the API worker must cover

1. No persistence: spy `fs.writeFile` / storage SDK; image bytes must not be written; buffers dropped after handler.
2. Pulse enum only: fixture outputs cannot leave the four values.
3. Action-first: `sentences.length` in 1–4; `[0]` is imperative.
4. Prompt + post-filter refuse ratios and spoilers (inject a `2:1` model stub → no ratio in result; inject a plot line → stripped or `unreadable_hud`).
5. `empty_paste`, `multi_image`, `not_anno`, `unreadable_hud` return `ok: false` with no `pulse`.
