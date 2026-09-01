import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-xl bg-card p-4 text-card-foreground shadow-border sm:p-6", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header className={cn("flex items-start gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("font-display text-2xl leading-tight font-medium tracking-tight", className)}
      {...props}
    />
  );
}

export function CardKicker({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-xs font-medium tracking-wide text-mist uppercase", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />
  );
}
