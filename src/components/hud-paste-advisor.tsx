import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { adviseHud } from "@/lib/hud-advisor";
import {
  HUD_IDLE_COPY,
  HUD_LOADING_COPY,
  HUD_PULSE_LABEL,
  HUD_RETRY_COPY,
  fileToImageDataUrl,
  filesFromDataTransfer,
  networkFailureUi,
  pickHudImage,
  resultToUi,
  type HudUiState,
} from "@/lib/hud-paste";
import { cn } from "@/lib/utils";
import type { HudPulse } from "@/lib/hud-advisor-logic";

const PULSE_CLASS: Record<HudPulse, string> = {
  rojo: "bg-destructive text-destructive-foreground",
  amarillo: "bg-amber-500 text-black",
  vacío: "bg-muted text-foreground",
  recado: "bg-primary text-primary-foreground",
};

export function HudPasteAdvisor({
  listen = "self",
}: {
  listen?: "window" | "self";
}) {
  const [ui, setUi] = useState<HudUiState>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const pending = useRef(false);
  const rootRef = useRef<HTMLElement>(null);

  const ingest = useCallback(async (files: File[]) => {
    if (pending.current) return;
    const picked = pickHudImage(files);
    if (!picked.ok) {
      setUi({ kind: "error", message: picked.message });
      return;
    }
    pending.current = true;
    setUi({ kind: "loading" });
    let imageDataUrl: string | undefined;
    try {
      imageDataUrl = await fileToImageDataUrl(picked.file);
      const result = await adviseHud({ data: { imageDataUrl } });
      setUi(resultToUi(result));
    } catch {
      setUi(networkFailureUi());
    } finally {
      imageDataUrl = undefined;
      pending.current = false;
    }
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = filesFromDataTransfer(event.clipboardData);
      if (files.length === 0) return;
      event.preventDefault();
      void ingest(files);
    };
    const target: Window | HTMLElement | null =
      listen === "window" ? window : rootRef.current;
    if (!target) return;
    target.addEventListener("paste", onPaste as EventListener);
    return () => target.removeEventListener("paste", onPaste as EventListener);
  }, [ingest, listen]);

  return (
    <section
      ref={rootRef}
      tabIndex={listen === "self" ? 0 : undefined}
      data-hud-paste="advisor"
      data-hud-state={ui.kind}
      aria-label="Captura del HUD"
      onDragEnter={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        void ingest(filesFromDataTransfer(event.dataTransfer));
      }}
      className={cn(
        "mt-4 rounded-xl bg-card p-4 text-card-foreground shadow-border outline-none sm:p-5",
        dragOver && "ring-2 ring-ring",
      )}
    >
      {ui.kind === "loading" ? (
        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <LoaderCircle className="size-4 animate-spin" />
          {HUD_LOADING_COPY}
        </p>
      ) : null}

      {ui.kind === "success" ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-3">
          <p
            data-hud-pulse={ui.pulse}
            className={cn(
              "inline-flex w-fit min-h-11 items-center rounded-md px-3 text-xs font-medium tracking-wide uppercase",
              PULSE_CLASS[ui.pulse],
            )}
          >
            {HUD_PULSE_LABEL[ui.pulse]}
          </p>
          <ol className="flex flex-col gap-2">
            {ui.sentences.map((sentence, index) => (
              <li
                key={`${index}-${sentence}`}
                data-hud-line={index}
                className={
                  index === 0
                    ? "font-display text-xl leading-snug font-semibold tracking-tight sm:text-2xl"
                    : "text-sm leading-relaxed text-muted-foreground"
                }
              >
                {sentence}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {ui.kind === "error" ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          <p data-hud-error="true" className="text-sm text-destructive">
            {ui.message}
          </p>
          <p className="text-sm text-muted-foreground">{HUD_RETRY_COPY}</p>
        </div>
      ) : null}

      {ui.kind === "idle" ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{HUD_IDLE_COPY}</p>
      ) : null}
    </section>
  );
}
