import { useState } from "react";
import { Stamp } from "@/components/stamps";
import { chains, chainRule } from "@/lib/data";
import { cn } from "@/lib/utils";

export function ChainBoard() {
  const [activeId, setActiveId] = useState(chains[0]?.id ?? "wood");
  const active = chains.find((chain) => chain.id === activeId) ?? chains[0];

  return (
    <section className="rounded-xl bg-card p-4 shadow-border sm:p-6">
      <p className="text-xs font-medium tracking-wide text-mist uppercase">Materia prima → fábrica</p>
      <h2 className="mt-1 font-display text-2xl font-medium tracking-tight">Uno y uno alcanza</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{chainRule}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {chains.map((chain) => (
          <button
            key={chain.id}
            type="button"
            onClick={() => setActiveId(chain.id)}
            className={cn(
              "h-11 rounded-md px-3 text-sm",
              active?.id === chain.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-secondary",
            )}
          >
            {chain.title}
          </button>
        ))}
      </div>

      {active ? (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{active.when}</p>
          <ol className="flex flex-wrap items-center gap-2">
            {active.steps.map((step, index) => (
              <li key={step.label} className="flex items-center gap-2">
                {index > 0 ? <span className="text-primary">→</span> : null}
                <span className="inline-flex h-11 items-center gap-2 rounded-md bg-muted px-3 text-sm">
                  <Stamp name={step.stamp} className="size-4 text-primary" />
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-sm leading-relaxed">{active.buddy}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Ojo: </span>
            {active.trap}
          </p>
        </div>
      ) : null}
    </section>
  );
}
