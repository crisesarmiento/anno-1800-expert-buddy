import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, uiFor, type UiDict } from "@/lib/i18n";
import { useHarbor } from "@/lib/store";

/** Persisted locale applies after mount so SSR HTML and hydration share DEFAULT_LOCALE copy. */
export function useT(): UiDict {
  const locale = useHarbor((s) => s.locale);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return uiFor(ready ? locale : DEFAULT_LOCALE);
}
