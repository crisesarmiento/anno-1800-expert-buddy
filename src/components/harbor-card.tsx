import type { ReactNode } from "react";
import { Stamp } from "@/components/stamps";
import { Card, CardDescription, CardHeader, CardKicker, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function HarborCard({
  kicker,
  title,
  hint,
  stamp,
  icon,
  children,
  className,
}: {
  kicker: string;
  title: string;
  hint?: string;
  stamp?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-muted text-primary">
          {stamp ? <Stamp name={stamp} className="size-5" /> : icon}
        </span>
        <div className="min-w-0">
          <CardKicker>{kicker}</CardKicker>
          <CardTitle className="mt-0.5">{title}</CardTitle>
        </div>
      </CardHeader>
      {hint ? <CardDescription className="mt-3">{hint}</CardDescription> : null}
      {children ? <div className="mt-4 flex flex-col gap-4">{children}</div> : null}
    </Card>
  );
}

export function IconWell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-md bg-muted text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}
