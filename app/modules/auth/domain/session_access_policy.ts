export interface AuthSessionIdentityState {
  status: string
  deletedAt: unknown
}

export const AUTH_SESSION_TOKEN_LIFETIMES = {
  accessSeconds: 60 * 15,
  refreshSeconds: 60 * 60 * 24 * 7,
} as const

export function isActiveAuthSessionIdentity(identity: AuthSessionIdentityState | null): boolean {
  return identity?.status === 'active' && identity.deletedAt === null
}

export type SessionOrganizationBindingDecision =
  | { allowed: true; organizationId: string | null }
  | { allowed: false; reason: 'organization_membership_required' }

export function resolveSessionOrganizationBinding(input: {
  requestedOrganizationId: string | null | undefined
  hasSystemAdministrationAccess: boolean
  approvedOrganizationRole: string | null
}): SessionOrganizationBindingDecision {
  if (!input.requestedOrganizationId || input.hasSystemAdministrationAccess) {
    return { allowed: true, organizationId: null }
  }

  if (!input.approvedOrganizationRole) {
    return { allowed: false, reason: 'organization_membership_required' }
  }

  return { allowed: true, organizationId: input.requestedOrganizationId }
}
