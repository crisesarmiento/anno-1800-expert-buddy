import { layoutsById } from "./data/layouts.ts";
import { tenSecondLine } from "./campaign-tips.ts";

/** Everyone starts with the 10×10 stamp — the calm default when an island has no override. */
export const CONSTRUCTION_TIP_DEFAULT_LAYOUT_ID = "block-10";

/**
 * Per-island layout override. La Inapetente is the first city (mercado cerca
 * del puerto), so it gets the port-growth layout instead of the bare stamp.
 */
const ISLAND_LAYOUT_IDS: Record<string, string> = {
  "la-inapetente": "first-city",
};

/** Which layouts.ts entry backs the construction tip for a focused island. */
export function constructionLayoutIdForIsland(islandId: string): string {
  return ISLAND_LAYOUT_IDS[islandId] ?? CONSTRUCTION_TIP_DEFAULT_LAYOUT_ID;
}

/**
 * One 10s construction/layout line for the focused island — the blueprint hint
 * from layouts.ts, never a ratio, nextBuild chain, or building count.
 */
export function constructionTipLine(islandId: string): string | null {
  const layoutId = constructionLayoutIdForIsland(islandId);
  const layout = layoutsById[layoutId] ?? layoutsById[CONSTRUCTION_TIP_DEFAULT_LAYOUT_ID];
  if (!layout) return null;
  return tenSecondLine(layout.hint);
}
