import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HarborCard } from "@/components/harbor-card";
import { Button } from "@/components/ui/button";
import {
  SHIP_CATALOG,
  compareNewBuild,
  coverageFromSnapshot,
  effectiveRole,
  fleetAdvice,
  rolesForCampaign,
  surplusLabel,
  type FleetManualRole,
} from "@/lib/fleet";
import { fill } from "@/lib/i18n";
import { playerIslandsFromSave } from "@/lib/live/evidence.ts";
import { islandKey } from "@/lib/live/island-key.ts";
import { useHarbor } from "@/lib/store";
import { useT } from "@/lib/use-t";

const ROLES: FleetManualRole[] = ["unknown", "escort", "defense", "trade", "idle"];

function honestyLabel(
  t: ReturnType<typeof useT>["fleet"],
  value: "confirmed" | "observed" | "inferred" | null,
) {
  if (value === "confirmed") return t.confirmed;
  if (value === "observed") return t.observed;
  if (value === "inferred") return t.inferred;
  return null;
}

function roleLabel(t: ReturnType<typeof useT>["fleet"], role: FleetManualRole) {
  if (role === "escort") return t.roleEscort;
  if (role === "defense") return t.roleDefense;
  if (role === "trade") return t.roleTrade;
  if (role === "idle") return t.roleIdle;
  return t.roleUnknown;
}

export function FleetViewCard() {
  const snapshot = useHarbor((s) => s.liveSnapshot);
  const campaignId = useHarbor((s) => s.historyCampaignId ?? s.manualHistoryCampaignId);
  const rolesByCampaign = useHarbor((s) => s.fleetRolesByCampaign);
  const roles = rolesForCampaign(rolesByCampaign, campaignId);
  const setFleetRole = useHarbor((s) => s.setFleetRole);
  const t = useT();
  const [hullId, setHullId] = useState("frigate");
  const advice = useMemo(() => fleetAdvice(snapshot, roles), [snapshot, roles]);
  const coverage = coverageFromSnapshot(snapshot);
  const islands = useMemo(() => playerIslandsFromSave(snapshot), [snapshot]);
  const [islandId, setIslandId] = useState("");
  const resolvedIslandId = islands.some((row) => islandKey(row.regionId, row.areaId) === islandId)
    ? islandId
    : (islands[0] ? islandKey(islands[0].regionId, islands[0].areaId) : "");
  const compare = useMemo(
    () => compareNewBuild(hullId, snapshot, resolvedIslandId || null),
    [hullId, snapshot, resolvedIslandId],
  );

  return (
    <div id="fleet" data-taller-fleet="">
      <HarborCard kicker={t.fleet.kicker} title={t.fleet.title} hint={t.fleet.hint}>
        <p className="text-sm" data-fleet-coverage="">
          {t.fleet.incomplete}
        </p>
        <p className="text-sm font-medium" data-fleet-risk="">
          {coverage.label}
        </p>
        <p className="text-sm text-muted-foreground">{t.fleet.riskHint}</p>
        <p className="text-xs text-muted-foreground">{t.fleet.noAuto}</p>

        <div data-fleet-coverage-inventory="" className="mt-2">
          <p className="text-sm font-medium">{t.fleet.coverageInventory}</p>
          <p className="text-sm tabular-nums">
            {fill(
              t.fleet.coverageInventoryLine,
              advice.roleInventory.escort,
              advice.roleInventory.defense,
              advice.roleInventory.trade,
              advice.roleInventory.idle,
              advice.roleInventory.unknown,
              advice.roleInventory.total,
            )}
          </p>
          <p className="text-xs text-muted-foreground">{t.fleet.coverageInventoryHint}</p>
        </div>

        {advice.ships.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.fleet.empty}</p>
        ) : (
          <ul className="flex flex-col gap-3" data-fleet-list="">
            {advice.ships.map((row) => {
              const role = effectiveRole(row, roles);
              const surplus = surplusLabel(row, roles);
              const typeLabel = row.ship.typeName ?? row.catalogId ?? t.fleet.typeUnknown;
              return (
                <li
                  key={row.key}
                  data-fleet-ship={row.key}
                  data-fleet-surplus={surplus}
                  className="rounded-lg border border-border p-3"
                >
                  <p className="font-medium">
                    {row.ship.name ?? typeLabel}
                    <span className="text-muted-foreground"> · {typeLabel}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {honestyLabel(t.fleet, row.honesty.identity)}
                    {row.honesty.type ? ` · ${honestyLabel(t.fleet, row.honesty.type)}` : null}
                    {row.honesty.maintenance
                      ? ` · ${t.fleet.catalog}`
                      : ` · ${t.fleet.upkeepUnknown}`}
                  </p>
                  <p className="mt-1 text-sm">
                    {t.fleet.assignment}:{" "}
                    {row.ship.assignment?.kind === "trade-route"
                      ? fill(
                          t.fleet.tradeRoute,
                          row.ship.assignment.routeName ?? String(row.ship.assignment.routeId ?? ""),
                        )
                      : t.fleet.unassigned}
                  </p>
                  <p className="text-sm">
                    {t.fleet.location}:{" "}
                    {row.ship.location?.name ??
                      (row.ship.location?.areaId != null
                        ? fill(t.fleet.area, row.ship.location.areaId)
                        : t.fleet.locationUnknown)}
                  </p>
                  {row.inferredUpkeep != null ? (
                    <p className="text-sm tabular-nums">
                      {t.fleet.upkeep}: {row.inferredUpkeep}
                    </p>
                  ) : null}
                  <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
                    <span>{t.fleet.manualRole}</span>
                    <select
                      className="min-h-11 min-w-32 rounded-md border border-border bg-background px-2"
                      value={role}
                      onChange={(event) =>
                        setFleetRole(row.key, event.target.value as FleetManualRole)
                      }
                    >
                      {ROLES.map((item) => (
                        <option key={item} value={item}>
                          {roleLabel(t.fleet, item)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {surplus === "committed" ? t.fleet.committed : t.fleet.notEvaluable}
                    {role === "escort" || role === "defense" ? ` · ${t.fleet.noSurplus}` : null}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {advice.upkeep.ownerValidated && advice.upkeep.total != null ? (
          <p className="text-sm tabular-nums" data-fleet-upkeep="">
            {fill(
              t.fleet.upkeepSplit,
              advice.upkeep.trade ?? "—",
              advice.upkeep.military ?? "—",
              advice.upkeep.total,
            )}
          </p>
        ) : null}
        {advice.upkeep.withoutUpkeep > 0 ? (
          <p className="text-xs text-muted-foreground" data-fleet-upkeep-gap="">
            {fill(t.fleet.upkeepGap, advice.upkeep.withoutUpkeep, advice.upkeep.uniqueShips)}
          </p>
        ) : null}

        <p className="text-sm">{t.fleet.noDismantle}</p>
        <p className="text-sm">{t.fleet.noCombat}</p>

        <div data-fleet-new-build="" className="flex flex-col gap-3">
          <p className="text-sm font-medium">{t.fleet.newBuild}</p>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <span>{t.fleet.pickHull}</span>
            <select
              className="min-h-11 min-w-32 rounded-md border border-border bg-background px-2"
              value={hullId}
              onChange={(event) => setHullId(event.target.value)}
            >
              {SHIP_CATALOG.filter((row) => row.purchase != null).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">{t.fleet.catalog}</p>

          <div data-fleet-buy="" className="rounded-md border border-border p-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.fleet.buySection}
            </p>
            {compare.purchaseFitsBudget === true ? (
              <p className="text-sm">{t.fleet.purchaseFits}</p>
            ) : null}
            {compare.purchaseFitsBudget === false ? (
              <p className="text-sm">{t.fleet.purchaseShort}</p>
            ) : null}
            {compare.purchaseFitsBudget == null ? (
              <p className="text-sm text-muted-foreground">{t.fleet.purchaseUnknown}</p>
            ) : null}
          </div>

          <div data-fleet-build="" className="rounded-md border border-border p-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.fleet.buildSection}
            </p>
            {islands.length > 0 ? (
              <label className="mt-1 flex min-h-11 items-center gap-2 text-sm">
                <span>{t.fleet.pickIsland}</span>
                <select
                  className="min-h-11 min-w-32 rounded-md border border-border bg-background px-2"
                  value={resolvedIslandId}
                  onChange={(event) => setIslandId(event.target.value)}
                >
                  {islands.map((island) => (
                    <option
                      key={islandKey(island.regionId, island.areaId)}
                      value={islandKey(island.regionId, island.areaId)}
                    >
                      {island.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{t.fleet.noIslandOption}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {compare.materialsScope === "island" && compare.materialsIslandName
                ? fill(t.fleet.materialsIslandScope, compare.materialsIslandName)
                : compare.materialsScope === "global"
                  ? t.fleet.materialsGlobalScope
                  : t.fleet.materialsNoIslandScope}
            </p>
            {compare.materialsCovered === true ? (
              <p className="mt-1 text-sm">{t.fleet.materialsOk}</p>
            ) : null}
            {compare.materialsCovered === false ? (
              <p className="mt-1 text-sm">{t.fleet.materialsShort}</p>
            ) : null}
            {compare.materialsCovered == null ? (
              <p className="mt-1 text-sm text-muted-foreground">{t.fleet.materialsUnknown}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">{t.fleet.reservesAside}</p>
          </div>

          <div data-fleet-sustain="" className="rounded-md border border-border p-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.fleet.sustainSection}
            </p>
            {compare.upkeep != null ? (
              <p className="text-sm tabular-nums">{fill(t.fleet.sustainUpkeep, compare.upkeep)}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t.fleet.sustainUpkeepUnknown}</p>
            )}
          </div>
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/taller" hash="economy">
            {t.economy.kicker}
          </Link>
        </Button>
      </HarborCard>
    </div>
  );
}
