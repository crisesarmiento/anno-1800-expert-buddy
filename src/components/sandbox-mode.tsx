import { Link } from "@tanstack/react-router";
import { Anchor } from "lucide-react";
import { IconWell } from "@/components/harbor-card";
import { LanguageSelect } from "@/components/language-select";
import { InkSeal } from "@/components/stamps";
import { cn } from "@/lib/utils";
import {
  SANDBOX_COPY,
  SANDBOX_TIPS,
  sandboxTallerLink,
  tipsForMode,
} from "@/lib/sandbox-mode";

export function SandboxModeChip({ className }: { className?: string }) {
  return (
    <Link
      to="/sandbox"
      data-sandbox-chip=""
      className={cn(
        "inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-ink/35 bg-card px-3 py-1.5 text-sm text-ink hover:border-ink",
        className,
      )}
    >
      <InkSeal kind="anchor" tone="ink" className="size-7" />
      <span className="font-display">{SANDBOX_COPY.chip}</span>
    </Link>
  );
}

export function SandboxModePage() {
  const taller = sandboxTallerLink();
  const tips = tipsForMode(SANDBOX_TIPS, "sandbox");

  return (
    <div className="min-h-dvh bg-background" data-sandbox-mode="" data-visual="diario">
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <IconWell>
            <Anchor className="size-5" strokeWidth={1.75} />
          </IconWell>
          <div className="min-w-0">
            <p className="font-display text-lg leading-none font-semibold tracking-tight">
              Anno 1800 Buddy
            </p>
            <p className="mt-1 text-xs text-mist">{SANDBOX_COPY.kicker}</p>
          </div>
          <LanguageSelect className="ml-auto" />
          <Link to="/" className="inline-flex h-11 items-center text-sm text-primary">
            {SANDBOX_COPY.back}
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6 sm:px-6">
        <article className="hero-orla rounded-xl bg-card p-5 text-card-foreground sm:p-7">
          <p className="text-xs font-medium tracking-wide text-mist uppercase">
            {SANDBOX_COPY.kicker}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {SANDBOX_COPY.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed">{SANDBOX_COPY.hint}</p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{SANDBOX_COPY.now}</p>
          <a
            data-sandbox-taller=""
            href={taller.href}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            {taller.label}
          </a>
        </article>
        <ul data-sandbox-tips="" className="flex flex-col gap-3">
          {tips.map((tip) => (
            <li key={tip.id} className="rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed">
              {tip.text}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
