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
  const compare = useMemo(() => compareNewBuild(hullId, snapshot), [hullId, snapshot]);

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

        <p className="text-sm">{t.fleet.noDismantle}</p>
        <p className="text-sm">{t.fleet.noCombat}</p>

        <div data-fleet-new-build="" className="flex flex-col gap-2">
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
          {compare.purchaseFitsBudget === true ? (
            <p className="text-sm">{t.fleet.purchaseFits}</p>
          ) : null}
          {compare.purchaseFitsBudget === false ? (
            <p className="text-sm">{t.fleet.purchaseShort}</p>
          ) : null}
          {compare.purchaseFitsBudget == null ? (
            <p className="text-sm text-muted-foreground">{t.fleet.purchaseUnknown}</p>
          ) : null}
          {compare.materialsCovered === true ? <p className="text-sm">{t.fleet.materialsOk}</p> : null}
          {compare.materialsCovered === false ? (
            <p className="text-sm">{t.fleet.materialsShort}</p>
          ) : null}
          {compare.materialsCovered == null ? (
            <p className="text-sm text-muted-foreground">{t.fleet.materialsUnknown}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">{t.fleet.reservesAside}</p>
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
