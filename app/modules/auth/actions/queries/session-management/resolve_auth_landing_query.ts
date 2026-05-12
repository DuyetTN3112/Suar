import { BaseQuery } from '#modules/auth/actions/base_query'
import type { AuthOrganizationMembershipReader } from '#modules/auth/actions/ports/outbound/auth_organization_membership_reader'
import type { AuthSystemAccessReader } from '#modules/auth/actions/ports/outbound/auth_system_access_reader'
import {
  AUTH_LANDING_SURFACES,
  resolveAuthLandingSurface,
  type AuthLandingSurface,
} from '#modules/auth/domain/session-management/landing_surface'

const LANDING_PATH_BY_SURFACE: Record<AuthLandingSurface, string> = {
  [AUTH_LANDING_SURFACES.SYSTEM_ADMINISTRATION]: '/admin',
  [AUTH_LANDING_SURFACES.ORGANIZATION_ADMINISTRATION]: '/org',
  [AUTH_LANDING_SURFACES.ORGANIZATION_WORKSPACE]: '/dashboard',
  [AUTH_LANDING_SURFACES.ORGANIZATION_SELECTION]: '/organizations',
}

export interface ResolveAuthLandingInput {
  id: string
  systemRole: string | null
  currentOrganizationId: string | null
}

export class ResolveAuthLandingQuery extends BaseQuery {
  constructor(
    private readonly systemAccess: AuthSystemAccessReader,
    private readonly organizationMembership: AuthOrganizationMembershipReader
  ) {
    super()
  }

  async executeAndWrap(identity: ResolveAuthLandingInput) {
    return this.wrap(() => this.execute(identity))
  }

  async execute(identity: ResolveAuthLandingInput): Promise<string> {
    const hasSystemAdministrationAccess =
      await this.systemAccess.canAccessSystemAdministration(identity.systemRole)
    const currentOrganizationRole =
      !hasSystemAdministrationAccess && identity.currentOrganizationId
        ? await this.organizationMembership.findApprovedRole(
            identity.currentOrganizationId,
            identity.id
          )
        : null
    const surface = resolveAuthLandingSurface({
      hasSystemAdministrationAccess,
      currentOrganizationId: identity.currentOrganizationId,
      currentOrganizationRole,
    })

    return LANDING_PATH_BY_SURFACE[surface]
  }
}
