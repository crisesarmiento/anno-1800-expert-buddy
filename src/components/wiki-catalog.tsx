import { Link } from "@tanstack/react-router";
import { Anchor } from "lucide-react";
import { IconWell } from "@/components/harbor-card";
import { LanguageSelect } from "@/components/language-select";
import {
  catalogLinks,
  wikiCatalogBuildings,
  wikiCatalogHubs,
  wikiHref,
} from "@/lib/data/wiki-catalog";
import { useT } from "@/lib/use-t";

export function WikiCatalogPage() {
  const t = useT();

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <IconWell>
            <Anchor className="size-5" strokeWidth={1.75} />
          </IconWell>
          <div className="min-w-0">
            <p className="font-display text-lg leading-none font-semibold tracking-tight">
              Anno 1800 Buddy
            </p>
            <p className="mt-1 text-xs text-mist">{t.wikiCatalog.kicker}</p>
          </div>
          <LanguageSelect className="ml-auto" />
          <Link to="/" className="inline-flex h-11 items-center text-sm text-primary">
            {t.deskShort}
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t.wikiCatalog.kicker}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {t.wikiCatalog.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{t.wikiCatalog.hint}</p>
        </div>
        <CatalogGroup heading={t.wikiCatalog.hubs} entries={wikiCatalogHubs} />
        <CatalogGroup heading={t.wikiCatalog.buildings} entries={wikiCatalogBuildings} />
      </main>
    </div>
  );
}

function CatalogGroup({
  heading,
  entries,
}: {
  heading: string;
  entries: typeof wikiCatalogHubs;
}) {
  const t = useT();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{heading}</h2>
      <ul className="divide-y divide-border rounded-md border border-border bg-card">
        {entries.map((entry) => {
          const [primary, ...rest] = catalogLinks(entry);
          return (
            <li key={entry.id} className="flex flex-col gap-2 px-4 py-3">
              <a
                href={wikiHref(primary.page)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center text-sm text-primary"
              >
                {entry.title}
              </a>
              {rest.length > 0 ? (
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{t.wikiCatalog.also}</span>
                  {rest.map((link) => (
                    <a
                      key={link.page}
                      href={wikiHref(link.page)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center text-primary"
                    >
                      {link.title}
                    </a>
                  ))}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
