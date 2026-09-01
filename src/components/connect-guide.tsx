import { Link } from "@tanstack/react-router";
import { HarborCard } from "@/components/harbor-card";
import { useT } from "@/lib/use-t";

export function ConnectGuide({ embedded = false }: { embedded?: boolean }) {
  const t = useT();
  const steps = [t.connect.s1, t.connect.s2, t.connect.s3, t.connect.s4, t.connect.s5, t.connect.s6];

  return (
    <HarborCard kicker={t.connect.kicker} title={t.connect.title} stamp="sail" hint={t.connect.hint}>
      <ol className="flex flex-col gap-3 text-sm leading-relaxed">
        {steps.map((step, index) => (
          <li key={step}>
            <span className="font-medium text-foreground">{index + 1}. </span>
            {step}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.connect.watcher}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.connect.export}</p>
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
