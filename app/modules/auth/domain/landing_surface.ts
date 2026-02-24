export const AUTH_LANDING_SURFACES = {
  SYSTEM_ADMINISTRATION: 'system_administration',
  ORGANIZATION_ADMINISTRATION: 'organization_administration',
  ORGANIZATION_WORKSPACE: 'organization_workspace',
  ORGANIZATION_SELECTION: 'organization_selection',
} as const

export type AuthLandingSurface =
  (typeof AUTH_LANDING_SURFACES)[keyof typeof AUTH_LANDING_SURFACES]

export interface AuthLandingPolicyInput {
  hasSystemAdministrationAccess: boolean
  currentOrganizationId: string | null
  currentOrganizationRole: string | null
}

/**
 * Select a semantic landing surface without coupling Auth domain policy to HTTP paths.
 */
export function resolveAuthLandingSurface({
  hasSystemAdministrationAccess,
  currentOrganizationId,
  currentOrganizationRole,
}: AuthLandingPolicyInput): AuthLandingSurface {
  if (hasSystemAdministrationAccess) {
    return AUTH_LANDING_SURFACES.SYSTEM_ADMINISTRATION
  }

  if (
    currentOrganizationId &&
    (currentOrganizationRole === 'org_owner' || currentOrganizationRole === 'org_admin')
  ) {
    return AUTH_LANDING_SURFACES.ORGANIZATION_ADMINISTRATION
  }

  if (currentOrganizationId && currentOrganizationRole) {
    return AUTH_LANDING_SURFACES.ORGANIZATION_WORKSPACE
  }

  return AUTH_LANDING_SURFACES.ORGANIZATION_SELECTION
}
