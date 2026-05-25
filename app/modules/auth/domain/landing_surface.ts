import { canAccessOrganizationAdminShell } from '#modules/organizations/domain/org_permission_policy'
import type { OrgRole } from '#modules/organizations/domain/org_types'

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

  if (canAccessOrganizationAdminShell(currentOrganizationRole).allowed) {
    return '/org'
  }

  if (currentOrganizationId) {
    return '/tasks'
  }

  return '/organizations'
}
