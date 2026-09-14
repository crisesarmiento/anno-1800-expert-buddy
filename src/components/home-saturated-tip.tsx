import { useEffect, useState } from "react";
import type { LiveSnapshot } from "@/lib/live/types";
import {
  HOME_SATURATED_TIP_MS,
  homeWorkshopSaturated,
  pickHomeSaturatedTip,
  stampHomeSaturatedVisit,
} from "@/lib/home-saturated-tip";

/** One Home visit: at most one 10s saturated tip. Mount = visit. */
export function useHomeSaturatedTip(snapshot: LiveSnapshot | null): string | null {
  const [shownAt, setShownAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const saturated = homeWorkshopSaturated(snapshot);
  const line = pickHomeSaturatedTip({ saturated, shownAt, now });

  useEffect(() => {
    setShownAt((prev) => stampHomeSaturatedVisit(prev, Date.now(), saturated));
  }, [saturated]);

  useEffect(() => {
    if (shownAt == null) return;
    const remain = HOME_SATURATED_TIP_MS - (Date.now() - shownAt);
    if (remain <= 0) {
      setNow(Date.now());
      return;
    }
    const id = window.setTimeout(() => setNow(Date.now()), remain);
    return () => window.clearTimeout(id);
  }, [shownAt]);

  return line;
}
