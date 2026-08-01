import type { IssuedSessionTokenPair } from '#modules/auth/actions/dtos/session_token'
import type { AuthOrganizationMembershipReader } from '#modules/auth/actions/ports/outbound/auth_organization_membership_reader'
import type {
  AuthSessionIdentity,
  AuthSessionIdentityReader,
} from '#modules/auth/actions/ports/outbound/auth_session_identity_reader'
import type {
  AuthSessionTokenClaims,
  AuthSessionTokenStore,
} from '#modules/auth/actions/ports/outbound/auth_session_token_store'
import type { AuthSystemAccessReader } from '#modules/auth/actions/ports/outbound/auth_system_access_reader'
import {
  isActiveAuthSessionIdentity,
  resolveSessionOrganizationBinding,
} from '#modules/auth/domain/session_access_policy'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'

export class RefreshSessionTokenCommand {
  constructor(
    private readonly store: AuthSessionTokenStore,
    private readonly identityReader: AuthSessionIdentityReader,
    private readonly organizationMembership: AuthOrganizationMembershipReader,
    private readonly systemAccess: AuthSystemAccessReader
  ) {}

  async execute(
    refreshToken: string,
    requestedOrganizationId?: string | null
  ): Promise<IssuedSessionTokenPair> {
    const refreshRecord = await this.store.readRefresh(refreshToken)
    if (!refreshRecord) {
      throw new UnauthorizedException('Refresh token is invalid or expired')
    }

    const user = await this.identityReader.findById(refreshRecord.payload.userId)
    if (
      !user ||
      !isActiveAuthSessionIdentity({ status: user.status, deletedAt: user.deleted_at })
    ) {
      await this.store.revokeRefresh(refreshToken)
      throw new UnauthorizedException('User is no longer active')
    }

    const organizationId = await this.requireOrganizationBinding(
      user,
      requestedOrganizationId ?? refreshRecord.payload.organizationId
    )
    const rotated = await this.store.rotate(
      refreshToken,
      refreshRecord,
      this.toClaims(user, organizationId)
    )
    if (!rotated) {
      throw new UnauthorizedException('Refresh token is invalid or has already been used')
    }

    return rotated
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
