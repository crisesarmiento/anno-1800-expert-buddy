import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileJson, Upload } from "lucide-react";
import { ConnectGuide } from "@/components/connect-guide";
import { HarborCard } from "@/components/harbor-card";
import { InkSeal } from "@/components/stamps";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import fixture from "@/lib/live/fixture.json";
import {
  LIVE_POLL_MS,
  liveChipLabel,
  persistLiveHandle,
  readPersistedLiveHandle,
  refreshLiveHandle,
  tickLiveHandle,
  type LiveFileHandle,
} from "@/lib/live/handle-store";
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

function pickerApi() {
  return (
    window as Window & {
      showOpenFilePicker?: (options: {
        types: { description: string; accept: Record<string, string[]> }[];
      }) => Promise<FileSystemFileHandle[]>;
    }
  ).showOpenFilePicker;
}

export function PowerUpSection() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [hasHandle, setHasHandle] = useState(false);
  const watchTimer = useRef<number | null>(null);
  const lastModified = useRef(0);
  const applyLiveSnapshot = useHarbor((s) => s.applyLiveSnapshot);
  const setLiveBanner = useHarbor((s) => s.setLiveBanner);
  const locale = useHarbor((s) => s.locale);
  const steps = [t.power.s1, t.power.s2, t.power.s3];

  useEffect(() => {
    void readPersistedLiveHandle().then((handle) => {
      if (handle) setHasHandle(true);
    });
    return () => {
      if (watchTimer.current) window.clearInterval(watchTimer.current);
    };
  }, []);

  const applyFile = async (file: File, opts: { silent?: boolean } = {}) => {
    const result = await ingestLiveFile(file, locale);
    if (!result.ok) {
      if (!opts.silent) setLiveBanner(result.message, true);
      return;
    }
    applyLiveSnapshot(result.snapshot, file.name);
  };

  const startPoll = (handle: LiveFileHandle) => {
    if (watchTimer.current) window.clearInterval(watchTimer.current);
    lastModified.current = 0;
    const tick = async () => {
      try {
        lastModified.current = await tickLiveHandle(handle, lastModified.current, (file) =>
          applyFile(file, { silent: true }),
        );
      } catch {
        /* stay calm */
      }
    };
    void tick();
    watchTimer.current = window.setInterval(() => {
      void tick();
    }, LIVE_POLL_MS);
  };

  const pickLiveHandle = async () => {
    const picker = pickerApi();
    if (!picker) return undefined;
    try {
      const [handle] = await picker({
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      });
      await persistLiveHandle(handle);
      setHasHandle(true);
      return handle;
    } catch {
      return undefined;
    }
  };

  const onLiveChip = async (event: { preventDefault(): void; stopPropagation(): void }) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const existing = await readPersistedLiveHandle();
      if (existing) {
        const file = await refreshLiveHandle();
        if (file) await applyFile(file);
        startPoll(existing);
        return;
      }
      const handle = await pickLiveHandle();
      if (!handle) return;
      const file = await refreshLiveHandle();
      if (file) await applyFile(file);
      startPoll(handle);
    } catch {
      /* stay calm */
    }
  };

  return (
    <details
      data-power-up="conectar"
      data-power-up-strip=""
      data-live-section=""
      className="power-up-strip rounded-xl bg-card p-4 shadow-border sm:p-6"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-mist uppercase">{t.power.kicker}</p>
          <h2 className="mt-1 font-display text-xl font-medium tracking-tight sm:text-2xl">{t.power.title}</h2>
        </span>
        {!open ? (
          <button
            type="button"
            data-live-refresh-chip=""
            onClick={(event) => void onLiveChip(event)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/35 bg-card px-3 py-1.5 text-sm text-ink hover:border-ink"
          >
            <InkSeal kind="book" tone="ink" className="size-7" />
            <span className="font-display">{liveChipLabel(hasHandle)}</span>
          </button>
        ) : null}
        <span className="text-sm text-primary">{open ? t.power.collapse : t.power.expand}</span>
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.power.hint}</p>
      <ol className="mt-4 flex flex-col gap-2 text-sm leading-relaxed">
        {steps.map((step, index) => (
          <li key={index}>
            <span className="font-medium text-foreground">{`${index + 1}. ${step}`}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild>
          <a href="/harbor-buddy-telemetry.zip" download="harbor-buddy-telemetry.zip">
            {t.install.dlZipBtn}
          </a>
        </Button>
        <Button asChild variant="secondary">
          <a href="/install-harbor-buddy.bat" download="install-harbor-buddy.bat">
            {t.install.bat}
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="/watch-harbor-live.bat" download="watch-harbor-live.bat">
            {t.install.watchBat}
          </a>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/instalar">{t.installMod}</Link>
        </Button>
      </div>
      <div className="mt-4">
        <LivePanel
          onHandlePinned={(handle) => {
            setHasHandle(true);
            startPoll(handle);
          }}
        />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{t.welcome.windows}</p>
    </details>
  );
}

export function LivePanel({
  onHandlePinned,
}: {
  onHandlePinned?: (handle: LiveFileHandle) => void;
} = {}) {
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

  async function onFile(file: File | undefined, opts: { silent?: boolean } = {}) {
    if (!file) return;
    const result = await ingestLiveFile(file, locale);
    if (!result.ok) {
      if (!opts.silent) setLiveBanner(result.message, true);
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
    const picker = pickerApi();
    if (!picker) {
      inputRef.current?.click();
      return;
    }
    try {
      const [handle] = await picker({
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      });
      await persistLiveHandle(handle);
      setWatching(true);
      if (onHandlePinned) {
        onHandlePinned(handle);
        return;
      }
      if (watchTimer.current) window.clearInterval(watchTimer.current);
      let last = 0;
      const tick = async () => {
        try {
          last = await tickLiveHandle(handle, last, (file) => onFile(file, { silent: true }));
        } catch {
          /* ignore */
        }
      };
      await tick();
      watchTimer.current = window.setInterval(() => {
        void tick();
      }, LIVE_POLL_MS);
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
