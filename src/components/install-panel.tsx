import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Download } from "lucide-react";
import { HarborCard } from "@/components/harbor-card";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

export function InstallPanel({ embedded = false }: { embedded?: boolean }) {
  const t = useT();
  const [done, setDone] = useState<number[]>([]);
  const checks = [t.install.check1, t.install.check2, t.install.check3, t.install.check4];

  function toggle(index: number) {
    setDone((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  }

  return (
    <HarborCard
      kicker={t.install.kicker}
      title={t.install.title}
      stamp="crate"
      hint={t.install.hint}
    >
      <ol className="flex flex-col gap-4">
        <li className="rounded-md bg-muted p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t.install.dlZip}
          </p>
          <p className="mt-2 text-sm leading-relaxed">{t.install.dlZipCopy}</p>
          <Button asChild className="mt-3">
            <a href="/harbor-buddy-telemetry.zip" download="harbor-buddy-telemetry.zip">
              <Download className="size-3.5" />
              {t.install.dlZipBtn}
            </a>
          </Button>
        </li>

        <li className="rounded-md bg-muted p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t.install.dlInst}
          </p>
          <p className="mt-2 text-sm leading-relaxed">{t.install.dlInstCopy}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.install.smart}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild>
              <a href="/install-harbor-buddy.bat" download="install-harbor-buddy.bat">
                <Download className="size-3.5" />
                {t.install.bat}
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href="/install-harbor-buddy.ps1" download="install-harbor-buddy.ps1">
                {t.install.ps1}
              </a>
            </Button>
          </div>
        </li>

        <li className="rounded-md bg-muted p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t.install.done}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {checks.map((item, index) => {
              const on = done.includes(index);
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    className="flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm leading-snug hover:bg-secondary"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-4 shrink-0 place-items-center rounded-xs",
                        on ? "bg-ok text-ok-foreground" : "ring-1 ring-border",
                      )}
                    >
                      {on ? <Check className="size-2.5" /> : null}
                    </span>
                    <span className={on ? "line-through opacity-70" : undefined}>{item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </li>
      </ol>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.install.fallback}</p>

      {embedded ? null : (
        <p className="mt-4">
          <Link to="/" className="inline-flex h-11 items-center text-sm text-primary">
            {t.install.back}
          </Link>
        </p>
      )}
    </HarborCard>
  );
}
