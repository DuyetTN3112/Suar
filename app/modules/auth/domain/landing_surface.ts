import type { OrgRole } from '#modules/organizations/public_contracts/organization_access'

export interface LandingSurfaceInput {
  systemRole: string | null | undefined
  currentOrganizationId: string | null | undefined
  currentOrganizationRole: OrgRole | null
}

export function resolveLandingPath({
  systemRole,
  currentOrganizationId,
  currentOrganizationRole,
}: LandingSurfaceInput): string {
  if (systemRole === 'superadmin' || systemRole === 'system_admin') {
    return '/admin'
  }

  if (
    currentOrganizationId &&
    (currentOrganizationRole === 'org_owner' || currentOrganizationRole === 'org_admin')
  ) {
    return '/org'
  }

  if (currentOrganizationId && currentOrganizationRole) {
    return '/dashboard'
  }

  return '/organizations'
}
