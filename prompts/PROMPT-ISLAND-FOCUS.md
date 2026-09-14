Repo: crisesarmiento/anno-1800-expert-buddy.
Branch feat/island-focus-selector from origin/main (includes #43). Open ONE PR. Do not merge.

Harbor Studio locked order: **1 first** — island selector + "Esto, ahora" per colony.

## Product
- Campaign Home / diary: player picks **active island** (focus). "Esto, ahora" + 10s chips speak about THAT island only.
- Not a map. Not GPS. No building coordinates. No overlay on Anno.
- Source of island list for now:
  1) city-seed islands[] (Taller seed / fixtures) if present
  2) else manual short list / campaign known names (e.g. La Inapetente) — honest that live CityName may come later from FileDB
  3) Do NOT invent trade routes or NPC traders
- Persist active island id in local storage / session store (same calm pattern as other desk prefs).
- Spanish UI. Titles match diary ES.
- pulseHint unknown → no fake red. Counts/chains stay out of Home grids (Taller only).
- Stamp: notebook chip/selector texture, not brass CTA expedition wreath on the selector.

## Out of scope
- Nested FileDB CityName/routes (other PR)
- Construction layout tips pack (item 3 — later)
- Annocalculator embed

## Tests
- Switching island changes the tip/chip scope
- Home still has no building count grids / nextBuild / quests paint
- Default to seed's first island or La Inapetente in campaign fixture

Commit, push, gh pr create against main.

## Lane review nits (obligatorio)
- Story: solo islas YA VISTAS; sin adelantar misión/bioma; sin mapa/rutas.
- Signal: isla de chip/CityName limpio o seed — no counts inventados; pulseHint por colonia solo con señal; unknown no rojo.
- Ledger: rojo/saturado por colonia solo pulseHint real; counts/cadenas fuera del diario.
- Desk: chips no mapa; un Esto ahora por colonia; home sin lista de islas/rutas/counts; no pelear con tip 10s.
- Stamp: chips/sellos notebook, no orla de puerto; textura diario; sin chrome rutas/counts.
