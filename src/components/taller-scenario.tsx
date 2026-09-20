import { useMemo, useState } from "react";
import { HarborCard } from "@/components/harbor-card";
import { fill, type UiDict } from "@/lib/i18n";
import { playerIslandsFromSave } from "@/lib/live/evidence";
import { islandKey } from "@/lib/live/island-key";
import {
  compareScenarios,
  goodsOnSnapshot,
  neededTMin,
  observeScenario,
  verifiedSurplusTMin,
} from "@/lib/scenario";
import type {
  AlternativeKind,
  MissingDatum,
  ScenarioAlternative,
  ScenarioIsland,
  ScenarioVerdict,
  VerdictReason,
} from "@/lib/scenario";
import { liveGoodToCatalog } from "@/lib/sim/catalog-figures";
import { chainByGood, goodNameEs } from "@/lib/sim";
import type { GoodId } from "@/lib/sim/types";
import { useHarbor } from "@/lib/store";
import { inferredDeliveryTMin } from "@/lib/trade-route-logistics";
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
    inputs: t.scenario.nextInputs,
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

function tmin(value: number | null, t: UiDict) {
  if (value == null) return t.scenario.unknownAmount;
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value)}`;
}

function verdictLine(t: UiDict, verdict: ScenarioVerdict, islands: ScenarioIsland[]) {
  if (verdict.kind === "pick") {
    const originName = verdict.originId
      ? (islands.find((row) => row.id === verdict.originId)?.name ?? verdict.originId)
      : null;
    const label = originName ? `${kindLabel(t, verdict.winner)} (${originName})` : kindLabel(t, verdict.winner);
    return fill(t.scenario.verdictPick, label);
  }
  if (verdict.kind === "already-covered") return t.scenario.alreadyCovered;
  if (verdict.kind === "none-viable") return t.scenario.verdictNone;
  return t.scenario.verdictMissing;
}

function verdictReasonLabel(t: UiDict, reason: VerdictReason) {
  if (reason === "only-viable") return t.scenario.verdictReasonOnly;
  return t.scenario.verdictReasonCost;
}

function balanceLabel(t: UiDict, island: ScenarioIsland, isConsumer: boolean) {
  if (isConsumer) {
    const need = neededTMin(island);
    if (need == null) return t.scenario.balanceUnknown;
    if (need === 0) return t.scenario.balanceCovered;
    return fill(t.scenario.balanceDeficit, tmin(need, t));
  }
  const surplus = verifiedSurplusTMin(island);
  if (surplus == null) return t.scenario.balanceUnknown;
  return fill(t.scenario.balanceSurplus, tmin(surplus, t));
}

function exportLabel(t: UiDict, island: ScenarioIsland) {
  if (island.reservedExportTMin != null) return fill(t.scenario.exportKnown, tmin(island.reservedExportTMin, t));
  if (island.hasOtherConsumers === true) return t.scenario.exportOtherUnknown;
  if (island.hasOtherConsumers === false) return t.scenario.exportNone;
  return t.scenario.exportUnknown;
}

function routeLabel(t: UiDict, island: ScenarioIsland) {
  if (island.routeToConsumerOk === true) return t.scenario.routeReady;
  if (island.routeToConsumerOk === false) return t.scenario.routeNotReady;
  return t.scenario.routeUnknown;
}

function materialsLine(t: UiDict, materials: Partial<Record<GoodId, number>>) {
  const entries = Object.entries(materials).filter(([, amount]) => (amount ?? 0) > 0) as Array<
    [GoodId, number]
  >;
  if (!entries.length) return null;
  return entries.map(([goodId, amount]) => `${goodNameEs(goodId)}: ${tmin(amount, t)} t/min`).join(" · ");
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

function AlternativeCard({
  t,
  alt,
  islands,
}: {
  t: UiDict;
  alt: ScenarioAlternative;
  islands: ScenarioIsland[];
}) {
  const materials = materialsLine(t, alt.materialsNeeded);
  const origin = alt.originId ? islands.find((row) => row.id === alt.originId) : null;
  return (
    <li
      data-taller-scenario-alt={alt.kind}
      data-taller-scenario-origin={alt.originId ?? ""}
      data-taller-scenario-viability={alt.viability}
      className="rounded-lg border border-border p-4"
    >
      <p className="font-medium">
        {kindLabel(t, alt.kind)}
        <span className="ml-2 text-sm font-normal text-muted-foreground">{viabilityLabel(t, alt)}</span>
      </p>
      {origin ? (
        <p className="mt-1 text-sm text-muted-foreground">{fill(t.scenario.origin, origin.name)}</p>
      ) : null}
      {origin ? (
        <p className="text-xs text-muted-foreground">
          {t.scenario.tableExport}: {exportLabel(t, origin)}
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
      {materials ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {t.scenario.materialsLabel}: {materials}
        </p>
      ) : null}
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
  );
}

export function TallerScenarioCard() {
  const snapshot = useHarbor((state) => state.liveSnapshot);
  const t = useT();
  const islands = playerIslandsFromSave(snapshot);
  const seenGoods = goodsOnSnapshot(snapshot);
  const goods = (seenGoods.length ? seenGoods : PICKABLE).filter((id) => chainByGood(id));
  const [islandId, setIslandId] = useState("");
  const [goodId, setGoodId] = useState<GoodId | "">("");
  const [transportText, setTransportText] = useState("");
  const resolvedIsland = islands.some((row) => islandKey(row.regionId, row.areaId) === islandId)
    ? islandId
    : islands[0]
      ? islandKey(islands[0].regionId, islands[0].areaId)
      : "";
  const resolvedGood = (goods as string[]).includes(goodId) ? goodId : (goods[0] ?? "");

  const transportTMin = useMemo(() => {
    const raw = transportText.trim().replace(",", ".");
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return null;
    return value;
  }, [transportText]);

  const observedTransport = useMemo(() => {
    const island = islands.find((row) => islandKey(row.regionId, row.areaId) === resolvedIsland);
    if (!island || !resolvedGood) return null;
    let best: number | null = null;
    for (const route of snapshot?.telemetry?.routes ?? []) {
      if ((route.ownerId ?? 0) !== 0) continue;
      const hasIsland = route.stops.some((stop) => stop.areaId === island.areaId);
      const hasGood = route.stops.some((stop) =>
        stop.goods.some((good) => liveGoodToCatalog(good.id) === resolvedGood),
      );
      if (!hasIsland || !hasGood) continue;
      const guid = route.stops
        .flatMap((stop) => stop.goods)
        .find((good) => liveGoodToCatalog(good.id) === resolvedGood)?.guid;
      const tmin = inferredDeliveryTMin(route.delivery, { areaId: island.areaId, guid });
      if (tmin == null) continue;
      best = best == null ? tmin : Math.max(best, tmin);
    }
    return best;
  }, [islands, resolvedIsland, resolvedGood, snapshot]);

  const input = useMemo(() => {
    if (!resolvedIsland || !resolvedGood) return null;
    return observeScenario({
      snapshot,
      consumerId: resolvedIsland,
      goodId: resolvedGood as GoodId,
      transportTMin,
    });
  }, [snapshot, resolvedIsland, resolvedGood, transportTMin]);

  const result = useMemo(() => (input ? compareScenarios(input) : null), [input]);

  const localAlts = result?.alternatives.filter(
    (alt) => alt.kind === "expand-local" || alt.kind === "build-local-chain",
  );
  const originIds = result
    ? [
        ...new Set(
          result.alternatives
            .filter((alt) => alt.kind === "transport-surplus" && alt.originId)
            .map((alt) => alt.originId!),
        ),
      ]
    : [];
  const noOriginAlts = result
    ? result.alternatives.filter(
        (alt) =>
          (alt.kind === "transport-surplus" || alt.kind === "expand-origin-and-transport") && !alt.originId,
      )
    : [];

  return (
    <div id="produce-or-import" data-taller-scenario="">
      <HarborCard kicker={t.scenario.kicker} title={t.scenario.title} hint={t.scenario.hint}>
        {islands.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{t.scenario.emptyIslands}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <label className="flex min-h-11 flex-col gap-1 text-sm">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t.scenario.transportManual}
                </span>
                <input
                  data-taller-scenario-transport=""
                  type="number"
                  min={0}
                  step="0.1"
                  inputMode="decimal"
                  className="min-h-11 rounded-md border border-border bg-card px-3 text-foreground"
                  value={transportText}
                  onChange={(event) => setTransportText(event.target.value)}
                />
              </label>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{t.scenario.transportManualHint}</p>
            {observedTransport != null ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {fill(t.scenario.observedTransport, observedTransport)}
              </p>
            ) : null}
            {result && input ? (
              <div className="flex flex-col gap-4">
                <p data-taller-scenario-verdict={result.verdict.kind} className="text-lg leading-relaxed">
                  {verdictLine(t, result.verdict, input.islands)}
                </p>
                {result.verdict.kind === "pick" ? (
                  <p data-taller-scenario-verdict-reason={result.verdict.reason} className="text-xs text-muted-foreground">
                    {verdictReasonLabel(t, result.verdict.reason)}
                  </p>
                ) : null}
                {result.verdict.kind === "insufficient-data" ? (
                  <p data-taller-scenario-next="" className="text-sm leading-relaxed">
                    {fill(t.scenario.nextDatum, missingLabel(t, result.verdict.nextDatum))}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">{t.scenario.inferred}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.scenario.stockNotSurplus}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.scenario.noCut}</p>

                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t.scenario.tableTitle}
                  </p>
                  <div className="mt-2 overflow-x-auto">
                    <table data-taller-scenario-table="" className="w-full min-w-[760px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                          <th className="py-2 pr-3 font-medium">{t.scenario.tableIsland}</th>
                          <th className="py-2 pr-3 font-medium">{t.scenario.tableStock}</th>
                          <th className="py-2 pr-3 font-medium">{t.scenario.tableProduction}</th>
                          <th className="py-2 pr-3 font-medium">{t.scenario.tableConsumption}</th>
                          <th className="py-2 pr-3 font-medium">{t.scenario.tableBalance}</th>
                          <th className="py-2 pr-3 font-medium">{t.scenario.tableExport}</th>
                          <th className="py-2 pr-3 font-medium">{t.scenario.tableTransport}</th>
                          <th className="py-2 pr-3 font-medium">{t.scenario.tableRoute}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {input.islands.map((row) => {
                          const isConsumer = row.id === input.consumerId;
                          return (
                            <tr
                              key={row.id}
                              data-taller-scenario-table-row={row.id}
                              className="border-b border-border/60"
                            >
                              <td className="py-2 pr-3 font-medium">{row.name}</td>
                              <td className="py-2 pr-3">{row.stockAmount ?? t.scenario.unknownAmount}</td>
                              <td className="py-2 pr-3">{tmin(row.capacityTMin, t)}</td>
                              <td className="py-2 pr-3">{tmin(row.demandTMin, t)}</td>
                              <td className="py-2 pr-3">{balanceLabel(t, row, isConsumer)}</td>
                              <td className="py-2 pr-3">{exportLabel(t, row)}</td>
                              <td className="py-2 pr-3">
                                {isConsumer ? "—" : tmin(row.transportToConsumerTMin, t)}
                              </td>
                              <td className="py-2 pr-3">
                                {isConsumer ? t.scenario.routeSelf : routeLabel(t, row)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t.scenario.groupLocal}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {localAlts?.map((alt) => <AlternativeCard key={alt.kind} t={t} alt={alt} islands={input.islands} />)}
                  </ul>
                </div>

                {originIds.map((originId) => {
                  const originAlts = result.alternatives.filter((alt) => alt.originId === originId);
                  const originName = input.islands.find((row) => row.id === originId)?.name ?? originId;
                  return (
                    <div key={originId} className="flex flex-col gap-3">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t.scenario.groupOrigin}: {originName}
                      </p>
                      <ul className="flex flex-col gap-3">
                        {originAlts.map((alt) => (
                          <AlternativeCard key={`${alt.kind}-${originId}`} t={t} alt={alt} islands={input.islands} />
                        ))}
                      </ul>
                    </div>
                  );
                })}

                {noOriginAlts.length ? (
                  <ul className="flex flex-col gap-3">
                    {noOriginAlts.map((alt) => (
                      <AlternativeCard key={alt.kind} t={t} alt={alt} islands={input.islands} />
                    ))}
                  </ul>
                ) : null}
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
