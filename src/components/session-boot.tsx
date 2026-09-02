import { useLayoutEffect, useState, type ReactNode } from "react";
import { hydrateHarborFromSessionStore } from "@/lib/session-boot";

/**
 * Hydrate the last session from the local store before paint.
 * Empty store → empty desk (no wait on the server, no login wall).
 */
export function SessionBoot({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    hydrateHarborFromSessionStore();
    setReady(true);
  }, []);

  if (!ready) {
    return <div data-empty-desk="true" className="min-h-dvh bg-background" />;
  }

  return children;
}
