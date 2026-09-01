import { uiFor, type UiDict } from "@/lib/i18n";
import { useHarbor } from "@/lib/store";

export function useT(): UiDict {
  return uiFor(useHarbor((s) => s.locale));
}
