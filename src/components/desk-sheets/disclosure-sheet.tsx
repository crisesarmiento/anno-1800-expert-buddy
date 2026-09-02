import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Second-layer overlay. Not a nav tab and not an always-visible column.
 * Unmounts children while closed so the default desk never dumps this layer.
 * Inside SessionDeskSurface it docks on the companion column so 'Esto, ahora' stays visible.
 */
export function DisclosureSheet({
  open,
  onClose,
  title,
  kicker,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  labelledBy: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 [[data-session-surface]_&]:absolute"
      data-desk-sheet=""
      data-keep-primary=""
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/70 [[data-session-surface]_&]:hidden"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-xl bg-card p-4 shadow-border",
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6",
          "[[data-session-surface]_&]:inset-0 [[data-session-surface]_&]:max-h-none [[data-session-surface]_&]:max-w-none [[data-session-surface]_&]:translate-x-0 [[data-session-surface]_&]:translate-y-0 [[data-session-surface]_&]:rounded-xl",
        )}
      >
        {kicker ? (
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{kicker}</p>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <h2 id={labelledBy} className="mt-1 font-display text-2xl font-medium tracking-tight">
            {title}
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
