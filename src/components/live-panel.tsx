import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileJson, Upload } from "lucide-react";
import { ConnectGuide } from "@/components/connect-guide";
import { HarborCard } from "@/components/harbor-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import fixture from "@/lib/live/fixture.json";
import {
  downloadLiveSnapshot,
  ingestLiveFile,
  ingestLiveJsonText,
  snapshotFromSession,
  type LiveSnapshot,
} from "@/lib/live";
import { isLiveLocked, useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

function asSnapshot(value: unknown): LiveSnapshot {
  return value as LiveSnapshot;
}

export function applyLiveExample(
  locale: string,
  applyLiveSnapshot: (snapshot: LiveSnapshot, fileName?: string | null) => void,
  setLiveBanner: (text: string | null, failed?: boolean) => void,
) {
  const result = ingestLiveJsonText(JSON.stringify(asSnapshot(fixture)), locale);
  if (!result.ok) {
    setLiveBanner(result.message, true);
    return;
  }
  applyLiveSnapshot(result.snapshot, "fixture.json");
}

export function TryLiveExample({ featured = false }: { featured?: boolean }) {
  const applyLiveSnapshot = useHarbor((s) => s.applyLiveSnapshot);
  const setLiveBanner = useHarbor((s) => s.setLiveBanner);
  const locale = useHarbor((s) => s.locale);
  const t = useT();

  return (
    <Button
      type="button"
      data-welcome-example=""
      variant={featured ? "default" : "secondary"}
      size={featured ? "lg" : "sm"}
      className={featured ? "h-12 min-h-12 w-full text-base sm:w-auto" : undefined}
      onClick={() => applyLiveExample(locale, applyLiveSnapshot, setLiveBanner)}
    >
      {t.live.example}
    </Button>
  );
}

export function PowerUpSection() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <details
      data-power-up="conectar"
      data-live-section=""
      className="rounded-xl bg-card p-4 shadow-border sm:p-6"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer">
        <p className="text-xs font-medium tracking-wide text-mist uppercase">{t.power.kicker}</p>
        <h2 className="mt-1 font-display text-2xl font-medium tracking-tight">{t.power.title}</h2>
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.power.hint}</p>
      <div className="mt-4">
        <LivePanel />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{t.welcome.windows}</p>
    </details>
  );
}

export function LivePanel() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [paste, setPaste] = useState("");
  const [help, setHelp] = useState(false);
  const [watching, setWatching] = useState(false);
  const watchTimer = useRef<number | null>(null);

  const applyLiveSnapshot = useHarbor((s) => s.applyLiveSnapshot);
  const clearLive = useHarbor((s) => s.clearLive);
  const setLiveEnabled = useHarbor((s) => s.setLiveEnabled);
  const setLiveBanner = useHarbor((s) => s.setLiveBanner);
  const liveEnabled = useHarbor((s) => s.liveEnabled);
  const liveSnapshot = useHarbor((s) => s.liveSnapshot);
  const liveFileName = useHarbor((s) => s.liveFileName);
  const liveBanner = useHarbor((s) => s.liveBanner);
  const liveBannerFailed = useHarbor((s) => s.liveBannerFailed);
  const missionId = useHarbor((s) => s.missionId);
  const completed = useHarbor((s) => s.completed);
  const pulse = useHarbor((s) => s.pulse);
  const locked = useHarbor((s) => isLiveLocked(s));
  const locale = useHarbor((s) => s.locale);
  const t = useT();

  useEffect(() => {
    return () => {
      if (watchTimer.current) window.clearInterval(watchTimer.current);
    };
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const result = await ingestLiveFile(file, locale);
    if (!result.ok) {
      setLiveBanner(result.message, true);
      return;
    }
    applyLiveSnapshot(result.snapshot, file.name);
  }

  function onPaste() {
    const result = ingestLiveJsonText(paste, locale);
    if (!result.ok) {
      setLiveBanner(result.message, true);
      return;
    }
    applyLiveSnapshot(result.snapshot, "pegado.json");
  }

  function onExample() {
    applyLiveExample(locale, applyLiveSnapshot, setLiveBanner);
  }

  function onExport() {
    const snapshot = liveSnapshot ?? snapshotFromSession({ missionId, completed, pulse });
    downloadLiveSnapshot(snapshot);
  }

  async function onPin() {
    const picker = (
      window as Window & {
        showOpenFilePicker?: (options: {
          types: { description: string; accept: Record<string, string[]> }[];
        }) => Promise<FileSystemFileHandle[]>;
      }
    ).showOpenFilePicker;
    if (!picker) {
      inputRef.current?.click();
      return;
    }
    try {
      const [handle] = await picker({
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      });
      if (watchTimer.current) window.clearInterval(watchTimer.current);
      setWatching(true);
      let last = 0;
      const tick = async () => {
        try {
          const file = await handle.getFile();
          if (file.lastModified === last) return;
          last = file.lastModified;
          await onFile(file);
        } catch {
          /* ignore */
        }
      };
      await tick();
      watchTimer.current = window.setInterval(() => {
        void tick();
      }, 2500);
    } catch {
      /* cancelled */
    }
  }

  return (
    <HarborCard
      kicker={t.live.kicker}
      title={t.live.title}
      stamp="crate"
      hint={t.live.hint}
    >
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void onFile(event.dataTransfer.files[0]);
        }}
        className={cn(
          "flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-5 text-center",
          dragging ? "border-primary bg-muted" : "border-border bg-muted/60",
        )}
      >
        <Upload className="size-5 text-primary" />
        <p className="text-sm">{t.live.drop}</p>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept=".json,application/json,text/plain"
          className="sr-only"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          <FileJson className="size-3.5" />
          {t.live.choose}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void onPin()}>
          {watching ? t.live.watching : t.live.watchBtn}
        </Button>
      </div>

      <label className="mt-4 flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t.live.paste}
        </span>
        <Textarea
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          rows={4}
          spellCheck={false}
          className="font-mono text-xs"
          placeholder='{"schema":"harbor-live-v1", ...}'
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={onPaste} disabled={!paste.trim()}>
          {t.live.read}
        </Button>
        <Button type="button" variant="secondary" onClick={onExample}>
          {t.live.example}
        </Button>
        <Button type="button" variant="outline" onClick={onExport}>
          {t.live.export}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/watch-harbor-live.bat" download="watch-harbor-live.bat">
            {t.live.watcherDl}
          </a>
        </Button>
      </div>

      {liveBanner ? (
        <p
          className={cn(
            "mt-3 text-sm leading-relaxed",
            liveBannerFailed ? "text-destructive" : "text-ok",
          )}
        >
          {liveBanner}
        </p>
      ) : null}

      {liveSnapshot ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {liveFileName ?? "harbor-live.json"}
            {locked ? t.live.locked : t.live.noMatch}
          </span>
          <button
            type="button"
            className="inline-flex h-11 items-center text-foreground"
            onClick={() => setLiveEnabled(!liveEnabled)}
          >
            {liveEnabled ? t.live.pause : t.live.resume}
          </button>
          <button type="button" className="inline-flex h-11 items-center" onClick={clearLive}>
            {t.live.remove}
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link to="/instalar" className="inline-flex h-11 items-center text-primary">
          {t.installMod}
        </Link>
        <button
          type="button"
          className="inline-flex h-11 items-center text-muted-foreground hover:text-foreground"
          onClick={() => setHelp((value) => !value)}
        >
          {help ? t.live.hideSteps : t.live.showSteps}
        </button>
      </div>
      {help ? (
        <div className="mt-3">
          <ConnectGuide embedded />
        </div>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t.live.whyEmpty}</p>
    </HarborCard>
  );
}
