Repo: crisesarmiento/anno-1800-expert-buddy.
You are on branch feat/taller-ciudades from origin/main (0d7c74c). SEPARATE PR from feat/taller-good-icons. Do not merge. Cristian merges.

Harbor Studio product: Taller section **Ciudades** (never Home / diario / "Esto, ahora").

Goal: per-island stats + a small economy simulator for campaign AND sandbox, using the existing `src/lib/sim/` engine. Player seed is the source of counts. Watcher/.a7s MUST NOT invent house/factory numbers.

## Wiki contract (cite, do not scrape Ubisoft art)
- Statistics menu: https://anno1800.fandom.com/wiki/Statistics
  Tabs in game: Production Ctrl+Q, Storage Ctrl+W, Finance Ctrl+E, Population Ctrl+R, Items Ctrl+T
  Per island (or Shift/Ctrl multi-island).
- Production tab: supply vs demand t/min, current productivity, modifiers, building list. Green/red bars more accurate than rounded numbers. Docklands/passive trade often NOT in production tab.
- Population tab: per tier — residences, current pop / max capacity, workforce balance (generated − used).
- Needs: https://anno1800.fandom.com/wiki/Needs — consumption is per residence at BASIC-need capacity, NOT live headcount. Lifestyle needs do not change C. Items that raise max residents DO change C.
  Farmer C fish 0.0004166667 t/s at 10-cap house. 80 farmer houses = 1 fishery at 2 t/min.
- Workforce: https://anno1800.fandom.com/wiki/Workforce — island-wide pool; 1 inhabitant = 1 workforce of that tier. Deficit scales productivity. Surplus is fine.
- Residences capacities (wiki, ignore lifestyle): farmer 10, worker 20, artisan 30, engineer 40, investor 50.
- Production: t/min = 1 / cycle_minutes at 100% no electricity. Chain 1t in = 1t out.

## UI
- `/taller` chip or subpanel **Ciudades**. Texture Taller (mesa fría), not diary cream. No expedition wreath. No Ubisoft sprites.
- One card per island in the seed (campaign fixture: La Inapetente, NOT Bright Sands).
- Two modes: `campaign` (chapter-gated, nextBuild only seen goods; ch1 fish OK, no ropa/New World) and `sandbox` (perfect/wiki ratios allowed, still Taller).
- Spanish labels matching diary titles where they exist; Estadísticas names: Producción, Almacén, Finanzas, Población.

## Show (seed × wiki math)
Per city:
- Casas por clase + habitantes máx. (casas × capacidad)
- Mano de obra estimada (si seed no trae occupancy, asumir llenas y decirlo)
- Edificios de producción contados en el seed + t/min a productividad del seed (default 100)
- Demanda t/min por bien visto vs oferta
- Balance: falta / alcanza / saturado
- Sugerencia de mejora SOLO en Taller: campaign = pickNextBuild gated; sandbox = wiki-perfect next link
- Workforce warning if buildings demand more farmers than houses can supply (fishery 25 farmers each)

## Do NOT fake live-only stats
If seed/live does not have it, show a calm line "en el juego: Ctrl+Q/R/W/E" — do NOT invent:
- stock in warehouse, happiness, attractiveness, rumores, newspaper, actual fluctuating productivity, trade route income, item list, ship list, Docklands.

Extend `city-seed.schema.json` only with optional per-island fields you need (productivityPct, occupancy if present). Keep pulseHint unknown = no red.

## Tests
- Per-island compute does not mix two islands' houses
- campaign ch1 seed hides ropa/New World
- sandbox may suggest a wiki-perfect chain without painting Home
- Home still has no nextBuild/quests
- No watcher/a7s parsing for counts

Spanish UI. Commit + push + `gh pr create` against origin/main. List files and leftovers.

## Extra wiki (Harbor catalog)
- Ctrl+Q production IGNORES trade routes. Import/export is Ctrl+W Storage.
- Rates in-game round to 1 t/min; bars more accurate.
- Electricity-required buildings: t/min = productivity / (200 * base_cycle_min). No-elec: / (100 * cycle_min).
- Caps also: jornalero/explorer/shepherd 10; obrero/technician/elder 20; scholar 120; hotel 500. SK/High Life later, chapter-gate them.
- Campaign: hide newspaper/rumores until Freedom and the Free Press. Hide New World until Ch3. Hide Ch2 industry (bricks/steel) until that chapter.
- Royal tax thresholds UNKNOWN - do not invent.
- Building-range needs (market, pub, school) are NOT seed C.
- If .a7s name-only: island label + sin telemetria. Never fake bars.
- Rebase/merge origin/main first if behind (PR 33 goods stamps may already be on main).

## Lane nits Ledger/Desk (obligatorio)
- Una ficha COLAPSABLE por isla. No dashboard de 5 KPIs.
- Campaña: alcanza/no + sugerir edificio gated. NUNCA decir optimo ni adelantar clases/bienes.
- Sandbox = ruta/modo aparte (full wiki), no mezclar con campaña en la misma card.
- Home: solo rojo/saturado si pulseHint REAL. Sin barras t/min. Save solo nombre = sin telemetria, calmado.
