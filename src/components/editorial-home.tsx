import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Database, Factory, ScanLine, Ship, Wheat } from "lucide-react";
import { HarborNavigation } from "@/components/harbor-navigation";
import { Button } from "@/components/ui/button";
import { homePriorities, type HomePriority } from "@/lib/home-priorities";
import { editorialCopy } from "@/lib/editorial-copy";
import { fill, LOCALE_META, type Locale } from "@/lib/i18n";
import { useHarbor } from "@/lib/store";
import { resumeLiveReader, useLiveReader } from "@/lib/live-reader";

function age(iso: string | undefined, locale: Locale, now: number) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return editorialCopy[locale].unknownTime;
  const minutes = Math.round((Date.parse(iso) - now) / 60_000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  return Math.abs(minutes) < 60
    ? formatter.format(minutes, "minute")
    : Math.abs(minutes) < 1440
      ? formatter.format(Math.round(minutes / 60), "hour")
      : formatter.format(Math.round(minutes / 1440), "day");
}

export function EditorialHome() {
  const snapshot = useHarbor((s) => s.liveSnapshot);
  const enabled = useHarbor((s) => s.liveEnabled);
  const locale = useHarbor((s) => s.locale);
  const fileName = useHarbor((s) => s.liveFileName);
  const t = editorialCopy[locale];
  const [now, setNow] = useState(() => Date.now());
  const reading = useLiveReader((s) => s.status);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(clock);
  }, []);
  useEffect(() => {
    document.documentElement.lang = LOCALE_META[locale].html;
  }, [locale]);
  async function refresh() {
    if (busy) return;
    setBusy(true);
    try {
      await resumeLiveReader();
    } finally {
      setBusy(false);
    }
  }

  const model = homePriorities(snapshot, now, enabled && reading !== "stopped");
  const [lead, ...rest] = model.priorities;
  const readiness = model.readiness;
  const guidance = {
    off: [t.off, t.offBody],
    historical: [t.historicalTitle, t.historicalBody],
    production: [t.productionTitle, t.productionBody],
    finance: [t.financeTitle, t.financeBody],
    catalog: [t.catalogTitle, t.catalogBody],
    ready: [t.readyTitle, t.readyBody],
  }[readiness];
  const demo =
    fileName === "editorial-demo.json" ||
    fileName === "fixture.json" ||
    Boolean(snapshot?.sessionName?.startsWith("Editorial demonstration"));
  return (
    <div className="editorial-home" data-visual="editorial">
      <div className="editorial-page">
        <a className="editorial-skip" href="#main-content">
          {t.skip}
        </a>
        <HarborNavigation />
        <main id="main-content">
          <section className="editorial-masthead" aria-labelledby="harbor-title">
            <div>
              <p className="editorial-kicker">{demo ? t.demo : t.kicker}</p>
              <h1 id="harbor-title">{t.title}</h1>
              <p className="editorial-intro">{t.intro}</p>
            </div>
            <img
              src="/images/editorial-lighthouse.png"
              width="1536"
              height="1024"
              alt=""
              className="editorial-lighthouse"
            />
          </section>
          <section className="editorial-readings" aria-label={t.sources}>
            <div className="editorial-source-items">
              <span>
                <Database size={18} aria-hidden="true" />
                {t.save}: {snapshot ? age(snapshot.savedAt, locale, now) : t.noRead}
              </span>
              <span>
                <ScanLine size={18} aria-hidden="true" />
                {t.ocr}:{" "}
                {snapshot?.connection?.native
                  ? age(snapshot.connection.native.observedAt, locale, now)
                  : t.noRead}
              </span>
              {model.island && (
                <span>
                  {t.island}: {model.island}
                </span>
              )}
            </div>
            <div className="editorial-reader-actions">
              <span role="status">{t[reading]}</span>
              {snapshot && (
                <Button variant="ghost" disabled={busy} onClick={() => void refresh()}>
                  {t.refresh}
                </Button>
              )}
              <Link to="/conectar">
                {t.connect}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            {reading === "stopped" && (
              <p className="editorial-muted" role="alert">
                {t.refreshFailed}
              </p>
            )}
          </section>
          <div className="editorial-columns">
            <section aria-label={t.first} className="editorial-priorities">
              <p className="editorial-kicker">{t.first}</p>
              {lead ? (
                <Priority item={lead} primary locale={locale} now={now} />
              ) : (
                <article className="editorial-priority">
                  <BookOpen
                    className="editorial-object-icon"
                    aria-hidden="true"
                    strokeWidth={1.1}
                  />
                  <div>
                    <h2>{snapshot ? t.clearTitle : t.emptyTitle}</h2>
                    <p>{snapshot ? t.clearBody : t.emptyBody}</p>
                    {snapshot && !model.hasRoutes && (
                      <p className="editorial-muted">{t.missingRoutes}</p>
                    )}
                    <Link className="editorial-cta" to={snapshot ? "/rutas" : "/conectar"}>
                      {snapshot ? t.viewRoute : t.connect}
                      <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              )}
              {rest.map((item) => (
                <div key={item.key} className="editorial-secondary">
                  <p className="editorial-kicker">{t.also}</p>
                  <Priority item={item} locale={locale} now={now} />
                </div>
              ))}
            </section>
            <aside className="editorial-production" aria-label={t.production}>
              <p className="editorial-kicker">{t.productionKicker}</p>
              <Factory className="editorial-factory-icon" strokeWidth={1} aria-hidden="true" />
              <h2>{guidance[0]}</h2>
              <p>{guidance[1]}</p>
              {model.island && (
                <p className="editorial-muted">
                  {t.island}: {model.island}
                </p>
              )}
              <Link
                className="editorial-text-link"
                to={readiness === "off" ? "/instalar" : "/taller"}
                hash={readiness === "off" ? undefined : "native-production"}
              >
                {readiness === "off" ? t.install : t.viewProduction}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <details className="editorial-scope">
                <summary>{t.scope}</summary>
                <p>{t.scopeBody}</p>
              </details>
            </aside>
          </div>
          <section className="editorial-diary">
            <div>
              <p className="editorial-kicker">{t.diaryKicker}</p>
              <h2>{t.diaryTitle}</h2>
              <p>{t.diaryBody}</p>
              <Link to="/diario" className="editorial-text-link">
                {t.openDiary}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <img
              src="/images/editorial-harbor.png"
              width="2172"
              height="724"
              alt=""
              loading="lazy"
            />
          </section>
        </main>
        <footer className="editorial-footer">{t.footer}</footer>
      </div>
    </div>
  );
}

function Priority({
  item,
  primary = false,
  locale,
  now,
}: {
  item: HomePriority;
  primary?: boolean;
  locale: Locale;
  now: number;
}) {
  const t = editorialCopy[locale];
  const production = item.kind === "production";
  const title =
    item.kind === "route"
      ? fill(t.routeTitle, item.route.name)
      : item.kind === "stock"
        ? fill(t.stockTitle, item.name)
        : fill(item.advice.status === "falta" ? t.missing : t.surplus, item.advice.name);
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const body =
    item.kind === "route"
      ? t[item.issue]
      : item.kind === "stock"
        ? `${format.format(item.before)} → ${format.format(item.after)} · ${t.stockLimit}`
        : fill(
            t.productionNumbers,
            format.format(item.advice.capacityTMin),
            format.format(item.advice.requiredTMin),
          );
  const scope =
    item.kind === "route"
      ? item.route.name
      : item.kind === "stock"
        ? t.global
        : item.advice.islandName;
  const observed = production ? item.advice.observedAt : item.observedAt;
  const Icon = item.kind === "route" ? Ship : production ? Factory : Wheat;
  return (
    <article className="editorial-priority" data-priority={item.kind}>
      <Icon className="editorial-object-icon" strokeWidth={1.1} aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p className={primary ? "editorial-lead-copy" : undefined}>{body}</p>
        <p className="editorial-evidence">
          {item.kind === "route" ? t.confirmed : production ? t.inferred : t.observed} · {scope} ·{" "}
          {age(observed, locale, now)}
        </p>
        {production && (
          <>
            <p className="editorial-evidence">
              {t.finance}: {age(item.advice.buildingCountObservedAt, locale, now)}
            </p>
            <p className="editorial-muted">{t.productionLimit}</p>
          </>
        )}
        {item.kind === "stock" && (
          <p className="editorial-evidence">
            {age(item.previousSavedAt, locale, now)} → {age(item.observedAt, locale, now)}
          </p>
        )}
        <Link
          to={production ? "/taller" : "/rutas"}
          hash={item.anchor}
          className={primary ? "editorial-cta" : "editorial-text-link"}
        >
          {production ? t.viewProduction : item.kind === "route" ? t.viewRoute : t.evidence}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
