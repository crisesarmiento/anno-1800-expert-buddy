import { useId, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

function asSnapshot(value: unknown): LiveSnapshot {
  return value as LiveSnapshot;
}

export function LivePanel() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [paste, setPaste] = useState("");
  const [help, setHelp] = useState(false);

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

  async function onFile(file: File | undefined) {
    if (!file) return;
    const result = await ingestLiveFile(file);
    if (!result.ok) {
      setLiveBanner(result.message, true);
      return;
    }
    applyLiveSnapshot(result.snapshot, file.name);
  }

  function onPaste() {
    const result = ingestLiveJsonText(paste);
    if (!result.ok) {
      setLiveBanner(result.message, true);
      return;
    }
    applyLiveSnapshot(result.snapshot, "pegado.json");
  }

  function onExample() {
    const result = ingestLiveJsonText(JSON.stringify(asSnapshot(fixture)));
    if (!result.ok) {
      setLiveBanner(result.message, true);
      return;
    }
    applyLiveSnapshot(result.snapshot, "fixture.json");
  }

  function onExport() {
    const snapshot = liveSnapshot ?? snapshotFromSession({ missionId, completed, pulse });
    downloadLiveSnapshot(snapshot);
  }

  return (
    <HarborCard
      kicker="Partida en vivo"
      title="Soltá el diario. Yo salto."
      stamp="crate"
      hint="El navegador no lee Documentos\Anno 1800 solo. Arrastrá harbor-live.json. Si matchea, no hace falta Completar ni tocar el riel."
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
        <p className="text-sm">Soltá harbor-live.json acá</p>
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
          Elegir archivo
        </Button>
      </div>

      <label className="mt-4 flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          O pegá el JSON
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
          Leer este JSON
        </Button>
        <Button type="button" variant="secondary" onClick={onExample}>
          Probar con ejemplo
        </Button>
        <Button type="button" variant="outline" onClick={onExport}>
          Exportar dónde estoy
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
            {locked ? " · el diario manda" : " · sin match, elegí a mano"}
          </span>
          <button
            type="button"
            className="inline-flex h-11 items-center text-foreground"
            onClick={() => setLiveEnabled(!liveEnabled)}
          >
            {liveEnabled ? "Pausar vivo" : "Reanudar vivo"}
          </button>
          <button type="button" className="inline-flex h-11 items-center" onClick={clearLive}>
            Sacar archivo
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link to="/instalar" className="inline-flex h-11 items-center text-primary">
          Instalar el mod
        </Link>
        <button
          type="button"
          className="inline-flex h-11 items-center text-muted-foreground hover:text-foreground"
          onClick={() => setHelp((value) => !value)}
        >
          {help ? "Ocultar pasos" : "Ver los 6 pasos acá"}
        </button>
      </div>
      {help ? (
        <div className="mt-3">
          <ConnectGuide embedded />
        </div>
      ) : null}
    </HarborCard>
  );
}
