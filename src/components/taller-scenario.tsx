import { useMemo, useState } from "react";
import { HarborCard } from "@/components/harbor-card";
import { fill, type UiDict } from "@/lib/i18n";
import { playerIslandsFromSave } from "@/lib/live/evidence";
import { islandKey } from "@/lib/live/island-key";
import { compareScenarios, goodsOnSnapshot, observeScenario } from "@/lib/scenario";
import type { AlternativeKind, MissingDatum, ScenarioAlternative, ScenarioVerdict } from "@/lib/scenario";
import { chainByGood, goodNameEs } from "@/lib/sim";
import type { GoodId } from "@/lib/sim/types";
import { useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";

function kindLabel(t: UiDict, kind: AlternativeKind) {
  if (kind === "expand-local") return t.scenario.expandLocal;
  if (kind === "build-local-chain") return t.scenario.localChain;
  if (kind === "transport-surplus") return t.scenario.transport;
  return t.scenario.expandOrigin;
}

function missingLabel(t: UiDict, key: MissingDatum) {
  const map: Record<MissingDatum, string> = {
    "consumer-demand": t.scenario.nextDemand,
    "consumer-capacity": t.scenario.nextCapacity,
    fertility: t.scenario.nextFertility,
    resource: t.scenario.nextResource,
    workforce: t.scenario.nextWorkforce,
    "origin-demand": t.scenario.nextSurplus,
    "origin-capacity": t.scenario.nextSurplus,
    "transport-capacity": t.scenario.nextTransport,
    investment: t.scenario.nextInvestment,
    "paused-count": t.scenario.nextPaused,
  };
  return map[key];
}

function viabilityLabel(t: UiDict, alt: ScenarioAlternative) {
  if (alt.viability === "viable") return t.scenario.viable;
  if (alt.viability === "impossible") return t.scenario.impossible;
  return t.scenario.unknown;
}

function money(value: number | null, t: UiDict) {
  if (value == null) return t.scenario.unknownAmount;
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)} ${t.scenario.coinsUnit}`;
}

function verdictLine(t: UiDict, verdict: ScenarioVerdict) {
  if (verdict.kind === "pick") return fill(t.scenario.verdictPick, kindLabel(t, verdict.winner));
  if (verdict.kind === "already-covered") return t.scenario.alreadyCovered;
  if (verdict.kind === "none-viable") return t.scenario.verdictNone;
  return t.scenario.verdictMissing;
}

const PICKABLE: GoodId[] = [
  "timber",
  "fish",
  "work-clothes",
  "schnapps",
  "sausages",
  "bread",
  "bricks",
  "steel-beams",
  "soap",
  "sails",
  "weapons",
  "fried-plantains",
  "ponchos",
  "rum",
];

export function TallerScenarioCard() {
  const snapshot = useHarbor((state) => state.liveSnapshot);
  const t = useT();
  const islands = playerIslandsFromSave(snapshot);
  const seenGoods = goodsOnSnapshot(snapshot);
  const goods = (seenGoods.length ? seenGoods : PICKABLE).filter((id) => chainByGood(id));
  const [islandId, setIslandId] = useState("");
  const [goodId, setGoodId] = useState<GoodId | "">("");
  const resolvedIsland = islands.some((row) => islandKey(row.regionId, row.areaId) === islandId)
    ? islandId
    : islands[0]
      ? islandKey(islands[0].regionId, islands[0].areaId)
      : "";
  const resolvedGood = (goods as string[]).includes(goodId) ? goodId : (goods[0] ?? "");

  const result = useMemo(() => {
    if (!resolvedIsland || !resolvedGood) return null;
    const input = observeScenario({
      snapshot,
      consumerId: resolvedIsland,
      goodId: resolvedGood as GoodId,
    });
    return compareScenarios(input);
  }, [snapshot, resolvedIsland, resolvedGood]);

  return (
    <div id="produce-or-import" data-taller-scenario="">
      <HarborCard kicker={t.scenario.kicker} title={t.scenario.title} hint={t.scenario.hint}>
        {islands.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{t.scenario.emptyIslands}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex min-h-11 flex-col gap-1 text-sm">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t.scenario.pickIsland}
                </span>
                <select
                  data-taller-scenario-island=""
                  className="min-h-11 rounded-md border border-border bg-card px-3 text-foreground"
                  value={resolvedIsland}
                  onChange={(event) => setIslandId(event.target.value)}
                >
                  {islands.map((island) => (
                    <option key={islandKey(island.regionId, island.areaId)} value={islandKey(island.regionId, island.areaId)}>
                      {island.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-11 flex-col gap-1 text-sm">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t.scenario.pickGood}
                </span>
                <select
                  data-taller-scenario-good=""
                  className="min-h-11 rounded-md border border-border bg-card px-3 text-foreground"
                  value={resolvedGood}
                  onChange={(event) => setGoodId(event.target.value as GoodId)}
                >
                  {goods.map((id) => (
                    <option key={id} value={id}>
                      {goodNameEs(id)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {result ? (
              <div className="flex flex-col gap-4">
                <p data-taller-scenario-verdict={result.verdict.kind} className="text-lg leading-relaxed">
                  {verdictLine(t, result.verdict)}
                </p>
                {result.verdict.kind === "insufficient-data" ? (
                  <p data-taller-scenario-next="" className="text-sm leading-relaxed">
                    {fill(t.scenario.nextDatum, missingLabel(t, result.verdict.nextDatum))}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">{t.scenario.inferred}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.scenario.stockNotSurplus}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.scenario.noCut}</p>
                <ul className="flex flex-col gap-3">
                  {result.alternatives.map((alt) => (
                    <li
                      key={alt.kind}
                      data-taller-scenario-alt={alt.kind}
                      data-taller-scenario-viability={alt.viability}
                      className="rounded-lg border border-border p-4"
                    >
                      <p className="font-medium">
                        {kindLabel(t, alt.kind)}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {viabilityLabel(t, alt)}
                        </span>
                      </p>
                      {alt.originId ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {fill(
                            t.scenario.origin,
                            islands.find((row) => islandKey(row.regionId, row.areaId) === alt.originId)?.name ??
                              alt.originId,
                          )}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm">
                        {t.scenario.investment}: {money(alt.investment.coins, t)}
                      </p>
                      <p className="text-sm">
                        {t.scenario.recurrent}:{" "}
                        {alt.recurrentMaintenance == null
                          ? t.scenario.unknownAmount
                          : money(alt.recurrentMaintenance, t) + t.scenario.perMin}
                      </p>
                      {alt.missing.length ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t.scenario.missing}: {alt.missing.map((key) => missingLabel(t, key)).join(" · ")}
                        </p>
                      ) : null}
                      {alt.assumptions.length ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.scenario.assumptions}: {alt.assumptions.join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.scenario.emptyGood}</p>
            )}
          </div>
        )}
      </HarborCard>
    </div>
  );
}
