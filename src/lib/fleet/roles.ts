import type { FleetManualRole, FleetRoleMap } from "./types.ts";

export type FleetRolesByCampaign = Record<string, FleetRoleMap>;

export function campaignRoleScope(campaignId: string | null | undefined): string {
  const id = campaignId?.trim();
  return id ? id : "unscoped";
}

export function rolesForCampaign(
  byCampaign: FleetRolesByCampaign | undefined,
  campaignId: string | null | undefined,
): FleetRoleMap {
  const scope = campaignRoleScope(campaignId);
  return byCampaign?.[scope] ?? {};
}

export function setRoleOnCampaign(
  byCampaign: FleetRolesByCampaign,
  campaignId: string | null | undefined,
  shipKey: string,
  role: FleetManualRole,
): FleetRolesByCampaign {
  const scope = campaignRoleScope(campaignId);
  const current = byCampaign[scope] ?? {};
  return {
    ...byCampaign,
    [scope]: { ...current, [shipKey]: role },
  };
}
