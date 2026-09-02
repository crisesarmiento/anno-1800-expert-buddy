import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Anchor, Building2, Coins, Handshake, Home } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HarborCard, IconWell } from "@/components/harbor-card";
import { LanguageSelect } from "@/components/language-select";
import { Badge } from "@/components/ui/badge";
import { buildDashboard } from "@/lib/dash";
import { useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  background: "#1e1a14",
  border: "1px solid #3c3428",
  color: "#f3e6cf",
  borderRadius: 8,
  fontSize: 12,
};

export function HarborDash() {
  const t = useT();
  const missionId = useHarbor((s) => s.missionId);
  const pulse = useHarbor((s) => s.pulse);
  const snapshot = useHarbor((s) => s.liveSnapshot);
  const samples = useHarbor((s) => s.samples);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const model = useMemo(
    () => buildDashboard({ missionId, pulse, snapshot, samples, t }),
    [missionId, pulse, snapshot, samples, t],
  );

  const buildingChart = model.buildings.map((row) => ({
    name: row.name,
    [t.dash.found]: row.found ? 1 : 0,
    [t.dash.missing]: row.found ? 0 : 1,
  }));

  const chainChart = model.chains.map((row) => ({
    name: row.title,
    [t.dash.found]: row.found,
    total: row.total,
  }));

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <IconWell>
            <Anchor className="size-5" strokeWidth={1.75} />
          </IconWell>
          <div className="min-w-0">
            <p className="font-display text-lg leading-none font-semibold tracking-tight">Anno 1800 Buddy</p>
            <p className="mt-1 truncate text-xs text-mist">{t.dash.kicker}</p>
          </div>
          <LanguageSelect className="ml-auto" />
          <Link to="/" className="inline-flex h-11 items-center text-sm text-primary">
            {t.dash.back}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div>
          <p className="text-xs font-medium tracking-wide text-mist uppercase">{t.dash.kicker}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.dash.title}</h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">{t.dash.hint}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard icon={<Coins className="size-4" />} label={t.dash.coins} value={labelCoins(model.coins, t)} />
          <StatCard icon={<Home className="size-4" />} label={t.dash.houses} value={labelHouses(model.houses, t)} />
        </div>

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{t.dash.mission}: </span>
          {model.chapterTitle ? `${model.chapterTitle} · ` : ""}
          {model.missionTitle}
        </p>

        {ready && buildingChart.length > 0 ? (
          <HarborCard kicker={t.dash.buildings} title={t.dash.presence} stamp="cottage">
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={buildingChart} layout="vertical" margin={{ left: 16, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3c3428" />
                  <XAxis type="number" hide domain={[0, 1]} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#b7a78e", fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey={t.dash.found} stackId="a" fill="#7ea37c" radius={4} />
                  <Bar dataKey={t.dash.missing} stackId="a" fill="#c9a36a" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </HarborCard>
        ) : null}

        {ready ? (
          <HarborCard kicker={t.dash.chains} title={t.chain.title} stamp="mill">
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={chainChart} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3c3428" />
                  <XAxis dataKey="name" tick={{ fill: "#b7a78e", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#b7a78e", fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey={t.dash.found} fill="#c9a36a" radius={6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </HarborCard>
        ) : null}

        {ready && model.history.length > 1 ? (
          <HarborCard kicker={t.dash.history} title={t.pulse.title} stamp="crate">
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <LineChart data={model.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3c3428" />
                  <XAxis dataKey="label" tick={{ fill: "#b7a78e", fontSize: 11 }} />
                  <YAxis domain={[-1, 1]} tick={{ fill: "#b7a78e", fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="coins" name={t.dash.coins} stroke="#c9a36a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="houses" name={t.dash.houses} stroke="#7ea37c" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </HarborCard>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <HarborCard kicker={t.dash.diplomacy} title={t.session.manners} stamp="bell">
            {model.people.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {model.people.map((person) => (
                  <li key={person.id} className="flex items-center justify-between gap-2">
                    <span>{person.name}</span>
                    <Badge>{t.dash.found}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t.dash.none}</p>
            )}
          </HarborCard>
          <HarborCard kicker={t.dash.islands} title={t.dash.seen} stamp="leaf">
            {model.islands.length ? (
              <ul className="flex flex-wrap gap-2">
                {model.islands.map((island) => (
                  <Badge key={island.id} variant="outline">
                    {island.name}
                  </Badge>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t.dash.none}</p>
            )}
            {model.hints.length ? (
              <p className="mt-4 text-xs text-muted-foreground">{model.hints.join(" · ")}</p>
            ) : null}
            {model.extras.length ? (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t.dash.extra}: </span>
                {model.extras.map((item) => item.name).join(", ")}
              </p>
            ) : null}
          </HarborCard>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-border">
      <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-mist uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-medium tracking-tight">{value}</p>
    </div>
  );
}

function labelCoins(value: string, t: ReturnType<typeof useT>) {
  if (value === "up") return t.pulse.up;
  if (value === "down") return t.pulse.down;
  return t.pulse.unknown;
}

function labelHouses(value: string, t: ReturnType<typeof useT>) {
  if (value === "ok") return t.pulse.ok;
  if (value === "yellow") return t.pulse.yellow;
  if (value === "empty") return t.pulse.empty;
  return t.pulse.unknown;
}
