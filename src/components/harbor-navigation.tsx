import { Link } from "@tanstack/react-router";
import { Anchor, ChevronDown } from "lucide-react";
import { LanguageSelect } from "@/components/language-select";
import { useHarbor } from "@/lib/store";
import { editorialCopy } from "@/lib/editorial-copy";

export function HarborNavigation() {
  const t = editorialCopy[useHarbor((s) => s.locale)];
  return (
    <header className="editorial-nav">
      <Link to="/" className="editorial-brand">
        <Anchor aria-hidden="true" size={34} strokeWidth={1.3} />
        <span>
          <strong>Harbor Buddy</strong>
          <small>{t.companion}</small>
        </span>
      </Link>
      <nav aria-label={t.nav} className="editorial-primary-nav">
        {(
          [
            ["/", t.home],
            ["/taller", t.production],
            ["/rutas", t.routes],
            ["/diario", t.diary],
          ] as const
        ).map(([to, label]) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            activeProps={{ "aria-current": "page" }}
          >
            {label}
          </Link>
        ))}
      </nav>
      <details className="editorial-menu">
        <summary>
          {t.more}
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className="editorial-menu-content">
          <LanguageSelect className="w-full items-stretch" />
          {(
            [
              ["/conectar", t.connect],
              ["/instalar", t.install],
              ["/tablero", t.board],
              ["/mapa", t.map],
              ["/catalogo", t.catalog],
              ["/sandbox", "Sandbox"],
            ] as const
          ).map(([to, label]) => (
            <Link
              key={to}
              to={to}
              onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
            >
              {label}
            </Link>
          ))}
        </div>
      </details>
    </header>
  );
}
