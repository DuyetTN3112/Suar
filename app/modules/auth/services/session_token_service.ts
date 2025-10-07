import { createHash, randomBytes, randomUUID } from 'node:crypto'

import redis from '@adonisjs/redis/services/main'

import { canAccessSystemAdministration } from '#modules/authorization/public_contracts/system_admin_access'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

const ACCESS_TOKEN_TTL_SECONDS = 60 * 15
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
const ACCESS_KEY_PREFIX = 'auth:access'
const REFRESH_KEY_PREFIX = 'auth:refresh'

interface TokenSessionPayload {
  sessionId: string
  userId: string
  email: string | null
  systemRole: string
  organizationId: string | null
}

export interface IssuedSessionTokenPair {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  refreshExpiresInSeconds: number
  organizationId: string | null
  systemRole: string
}

type SessionTokenUser = NonNullable<Awaited<ReturnType<typeof userPublicApi.findById>>>

export interface VerifiedSessionAccessToken extends TokenSessionPayload {
  user: SessionTokenUser
}

export class SessionTokenService {
  async issueForUser(
    user: SessionTokenUser,
    organizationId?: string | null
  ): Promise<IssuedSessionTokenPair> {
    const resolvedOrganizationId = await this.resolveOrganizationId(user, organizationId ?? user.current_organization_id)
    return this.persistNewPair({
      sessionId: randomUUID(),
      userId: user.id,
      email: user.email,
      systemRole: user.system_role,
      organizationId: resolvedOrganizationId,
    })
  }

  async refresh(
    refreshToken: string,
    requestedOrganizationId?: string | null
  ): Promise<IssuedSessionTokenPair> {
    const refreshPayload = await this.readRefreshPayload(refreshToken)
    if (!refreshPayload) {
      throw new UnauthorizedException('Refresh token is invalid or expired')
    }

    const user = await userPublicApi.findById(refreshPayload.userId)
    if (user?.deleted_at !== null || user.status !== 'active') {
      await this.revokeRefresh(refreshToken)
      throw new UnauthorizedException('User is no longer active')
    }

    const resolvedOrganizationId = await this.resolveOrganizationId(
      user,
      requestedOrganizationId ?? refreshPayload.organizationId
    )

    await this.revokeRefresh(refreshToken)

    return this.persistNewPair({
      sessionId: randomUUID(),
      userId: user.id,
      email: user.email,
      systemRole: user.system_role,
      organizationId: resolvedOrganizationId,
    })
  }

  async verifyAccessToken(accessToken: string): Promise<VerifiedSessionAccessToken | null> {
    const payload = await this.readAccessPayload(accessToken)
    if (!payload) {
      return null
    }

    const user = await userPublicApi.findById(payload.userId)
    if (user?.deleted_at !== null || user.status !== 'active') {
      await this.revokeAccess(accessToken)
      return null
    }

    if (payload.organizationId) {
      const systemAccess = await canAccessSystemAdministration(user.system_role)
      const hasSystemAccess = systemAccess.allowed
      if (!hasSystemAccess) {
        const membership = await organizationPublicApi.findApprovedMembership(payload.organizationId, user.id)
        if (!membership) {
          await this.revokeAccess(accessToken)
          return null
        }
      }
    }

    return {
      ...payload,
      user,
    }
  }

  private async persistNewPair(payload: TokenSessionPayload): Promise<IssuedSessionTokenPair> {
    const accessToken = this.generateToken()
    const refreshToken = this.generateToken()

    await redis.setex(this.accessKey(accessToken), ACCESS_TOKEN_TTL_SECONDS, JSON.stringify(payload))
    await redis.setex(this.refreshKey(refreshToken), REFRESH_TOKEN_TTL_SECONDS, JSON.stringify(payload))

    return {
      accessToken,
      refreshToken,
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      refreshExpiresInSeconds: REFRESH_TOKEN_TTL_SECONDS,
      organizationId: payload.organizationId,
      systemRole: payload.systemRole,
    }
  }

  private async resolveOrganizationId(
    user: SessionTokenUser,
    organizationId: string | null | undefined
  ): Promise<string | null> {
    if (!organizationId) {
      return null
    }

    const decision = await canAccessSystemAdministration(user.system_role)
    const hasSystemAccess = decision.allowed
    if (hasSystemAccess) {
      return null
    }

    const membership = await organizationPublicApi.findApprovedMembership(organizationId, user.id)
    if (!membership) {
      throw new UnauthorizedException('User is not an approved member of the requested organization')
    }

    return organizationId
  }

  private async readAccessPayload(accessToken: string): Promise<TokenSessionPayload | null> {
    const raw = await redis.get(this.accessKey(accessToken))
    return this.parsePayload(raw)
  }

  private async readRefreshPayload(refreshToken: string): Promise<TokenSessionPayload | null> {
    const raw = await redis.get(this.refreshKey(refreshToken))
    return this.parsePayload(raw)
  }

  private parsePayload(raw: string | null): TokenSessionPayload | null {
    if (!raw) {
      return null
    }

    try {
      return JSON.parse(raw) as TokenSessionPayload
    } catch {
      return null
    }
  }

  private async revokeAccess(accessToken: string): Promise<void> {
    await redis.del(this.accessKey(accessToken))
  }

  private async revokeRefresh(refreshToken: string): Promise<void> {
    await redis.del(this.refreshKey(refreshToken))
  }

  private accessKey(accessToken: string): string {
    return `${ACCESS_KEY_PREFIX}:${this.hashToken(accessToken)}`
  }

  private refreshKey(refreshToken: string): string {
    return `${REFRESH_KEY_PREFIX}:${this.hashToken(refreshToken)}`
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private generateToken(): string {
    return randomBytes(32).toString('base64url')
  }
}

export const sessionTokenService = new SessionTokenService()
