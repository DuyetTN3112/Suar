import type { VerifiedSessionAccessToken } from '#modules/auth/actions/dtos/session_token'
import type { AuthOrganizationMembershipReader } from '#modules/auth/actions/ports/outbound/auth_organization_membership_reader'
import type { AuthSessionIdentityReader } from '#modules/auth/actions/ports/outbound/auth_session_identity_reader'
import type { AuthSessionTokenStore } from '#modules/auth/actions/ports/outbound/auth_session_token_store'
import type { AuthSystemAccessReader } from '#modules/auth/actions/ports/outbound/auth_system_access_reader'
import {
  isActiveAuthSessionIdentity,
  resolveSessionOrganizationBinding,
} from '#modules/auth/domain/session_access_policy'

export class VerifySessionAccessTokenQuery {
  constructor(
    private readonly store: AuthSessionTokenStore,
    private readonly identityReader: AuthSessionIdentityReader,
    private readonly organizationMembership: AuthOrganizationMembershipReader,
    private readonly systemAccess: AuthSystemAccessReader
  ) {}

  async execute(accessToken: string): Promise<VerifiedSessionAccessToken | null> {
    const payload = await this.store.readAccess(accessToken)
    if (!payload) {
      return null
    }

    const user = await this.identityReader.findById(payload.userId)
    if (
      !user ||
      !isActiveAuthSessionIdentity({ status: user.status, deletedAt: user.deleted_at })
    ) {
      await this.store.revokeAccess(accessToken)
      return null
    }

    const organizationId = await this.resolveVerifiedOrganizationBinding(user, payload.organizationId)
    if (organizationId === undefined) {
      await this.store.revokeAccess(accessToken)
      return null
    }

    return {
      ...payload,
      organizationId,
      user,
    }
  }

  private async resolveVerifiedOrganizationBinding(
    user: NonNullable<Awaited<ReturnType<AuthSessionIdentityReader['findById']>>>,
    requestedOrganizationId: string | null
  ): Promise<string | null | undefined> {
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
    return decision.allowed ? decision.organizationId : undefined
  }
}
