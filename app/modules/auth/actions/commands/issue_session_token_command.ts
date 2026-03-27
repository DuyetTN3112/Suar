import type { IssuedSessionTokenPair } from '#modules/auth/actions/dtos/session_token'
import type { AuthOrganizationMembershipReader } from '#modules/auth/actions/ports/outbound/auth_organization_membership_reader'
import type { AuthSessionIdentity } from '#modules/auth/actions/ports/outbound/auth_session_identity_reader'
import type {
  AuthSessionTokenClaims,
  AuthSessionTokenStore,
} from '#modules/auth/actions/ports/outbound/auth_session_token_store'
import type { AuthSystemAccessReader } from '#modules/auth/actions/ports/outbound/auth_system_access_reader'
import { resolveSessionOrganizationBinding } from '#modules/auth/domain/session_access_policy'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'

export class IssueSessionTokenCommand {
  constructor(
    private readonly store: AuthSessionTokenStore,
    private readonly organizationMembership: AuthOrganizationMembershipReader,
    private readonly systemAccess: AuthSystemAccessReader
  ) {}

  async execute(
    user: AuthSessionIdentity,
    organizationId?: string | null
  ): Promise<IssuedSessionTokenPair> {
    const resolvedOrganizationId = await this.requireOrganizationBinding(
      user,
      organizationId ?? user.current_organization_id
    )
    return this.store.issue(this.toClaims(user, resolvedOrganizationId))
  }

  private async requireOrganizationBinding(
    user: AuthSessionIdentity,
    requestedOrganizationId: string | null | undefined
  ): Promise<string | null> {
    const hasSystemAdministrationAccess = await this.systemAccess.canAccessSystemAdministration(
      user.system_role
    )
    const approvedOrganizationRole =
      requestedOrganizationId && !hasSystemAdministrationAccess
        ? await this.organizationMembership.findApprovedRole(requestedOrganizationId, user.id)
        : null
    const decision = resolveSessionOrganizationBinding({
      requestedOrganizationId,
      hasSystemAdministrationAccess,
      approvedOrganizationRole,
    })
    if (!decision.allowed) {
      throw new UnauthorizedException(
        'User is not an approved member of the requested organization'
      )
    }
    return decision.organizationId
  }

  private toClaims(
    user: AuthSessionIdentity,
    organizationId: string | null
  ): AuthSessionTokenClaims {
    return {
      userId: user.id,
      email: user.email,
      systemRole: user.system_role,
      organizationId,
    }
  }
}
