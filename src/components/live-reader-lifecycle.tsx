import { useEffect } from "react";
import { useHarbor } from "@/lib/store";
import { liveReader } from "@/lib/live-reader";

/** Mounted once above the router outlet; navigation must not stop polling. */
export function LiveReaderLifecycle() {
  useEffect(() => {
    const unsubscribe = useHarbor.subscribe((state, previous) => {
      if (!state.liveEnabled && previous.liveEnabled) liveReader.stop();
    });
    const onFocus = () => {
      if (document.visibilityState === "visible") void liveReader.tick();
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onFocus);
      liveReader.stop();
    };
  }, []);
  return null;
}
