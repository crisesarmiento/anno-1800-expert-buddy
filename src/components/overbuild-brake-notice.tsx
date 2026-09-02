import {
  OVERBUILD_BRAKE_CLEAR_ACTION,
  OVERBUILD_BRAKE_NOTICE,
} from "@/lib/overbuild-brake";
import { useHarbor } from "@/lib/store";

export function OverbuildBrakeNotice() {
  const active = useHarbor((s) => s.overbuildBrake.active);
  const acknowledgeMovedIn = useHarbor((s) => s.acknowledgeMovedIn);

  if (!active) return null;

  return (
    <aside
      data-overbuild-brake="notice"
      role="status"
      aria-live="assertive"
      className="sticky top-0 z-[60] border-b border-destructive-foreground/20 bg-destructive px-4 py-3 text-destructive-foreground"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="font-display text-base font-semibold tracking-tight sm:text-lg">
          {OVERBUILD_BRAKE_NOTICE}
        </p>
        <button
          type="button"
          onClick={acknowledgeMovedIn}
          className="inline-flex min-h-11 items-center rounded-md bg-destructive-foreground px-4 text-sm font-medium text-destructive"
        >
          {OVERBUILD_BRAKE_CLEAR_ACTION}
        </button>
      </div>
    </aside>
  );
}
