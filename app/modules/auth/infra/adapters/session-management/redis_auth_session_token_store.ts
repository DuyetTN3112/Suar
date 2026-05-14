import { createHash, randomBytes, randomUUID } from 'node:crypto'

import {
  AuthSessionTokenStore,
  type AuthRefreshTokenRecord,
  type AuthSessionTokenClaims,
  type IssuedAuthSessionTokenPair,
  type StoredAuthSessionTokenPayload,
} from '#modules/auth/actions/ports/outbound/auth_session_token_store'
import { AUTH_SESSION_TOKEN_LIFETIMES } from '#modules/auth/domain/session-management/session_access_policy'
import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'

const ACCESS_KEY_PREFIX = 'auth:access'
const REFRESH_KEY_PREFIX = 'auth:refresh'
const ROTATE_TOKEN_PAIR_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current ~= ARGV[1] then
  return 0
end

redis.call('DEL', KEYS[1])
redis.call('SETEX', KEYS[2], ARGV[2], ARGV[4])
redis.call('SETEX', KEYS[3], ARGV[3], ARGV[4])
return 1
`

interface RedisSessionTokenTransaction {
  setex(key: string, ttlSeconds: number, value: string): RedisSessionTokenTransaction
  exec(): Promise<Array<[Error | null, unknown]> | null>
}

export interface RedisSessionTokenClient {
  multi(): RedisSessionTokenTransaction
  eval(script: string, numberOfKeys: number, ...arguments_: string[]): Promise<unknown>
  get(key: string): Promise<string | null>
  del(key: string): Promise<unknown>
}

type RedisSessionTokenClientProvider = () => RedisSessionTokenClient

export class RedisAuthSessionTokenStore extends AuthSessionTokenStore {
  private readonly resolveRedis: RedisSessionTokenClientProvider

  constructor(
    redis: RedisSessionTokenClient | RedisSessionTokenClientProvider
  ) {
    super()
    this.resolveRedis = typeof redis === 'function' ? redis : () => redis
  }

  async issue(claims: AuthSessionTokenClaims): Promise<IssuedAuthSessionTokenPair> {
    const payload = this.buildPayload(claims)
    const accessToken = this.generateToken()
    const refreshToken = this.generateToken()
    const serializedPayload = JSON.stringify(payload)

    try {
      const transaction = this.resolveRedis().multi()
      transaction.setex(
        this.accessKey(accessToken),
        AUTH_SESSION_TOKEN_LIFETIMES.accessSeconds,
        serializedPayload
      )
      transaction.setex(
        this.refreshKey(refreshToken),
        AUTH_SESSION_TOKEN_LIFETIMES.refreshSeconds,
        serializedPayload
      )

      const results = await transaction.exec()
      const failedCommand = results?.find(([commandError]) => commandError !== null)
      if (!results || failedCommand?.[0]) {
        throw new DependencyUnavailableException('redis', 'session_token_pair_write', {
          ...(failedCommand?.[0] === undefined ? {} : { cause: failedCommand[0] }),
        })
      }
    } catch (cause) {
      if (cause instanceof DependencyUnavailableException) {
        throw cause
      }
      throw new DependencyUnavailableException('redis', 'session_token_pair_write', {
        cause,
      })
    }

    return this.toIssuedPair(accessToken, refreshToken, payload)
  }

  async readAccess(accessToken: string): Promise<StoredAuthSessionTokenPayload | null> {
    try {
      return this.parsePayload(await this.resolveRedis().get(this.accessKey(accessToken)))
    } catch (cause) {
      throw new DependencyUnavailableException('redis', 'session_access_read', {
        cause,
      })
    }
  }

  async readRefresh(refreshToken: string): Promise<AuthRefreshTokenRecord | null> {
    try {
      const rotationProof = await this.resolveRedis().get(this.refreshKey(refreshToken))
      const payload = this.parsePayload(rotationProof)
      return rotationProof && payload ? { payload, rotationProof } : null
    } catch (cause) {
      throw new DependencyUnavailableException('redis', 'session_refresh_read', {
        cause,
      })
    }
  }

  async rotate(
    consumedRefreshToken: string,
    record: AuthRefreshTokenRecord,
    claims: AuthSessionTokenClaims
  ): Promise<IssuedAuthSessionTokenPair | null> {
    const payload = this.buildPayload(claims)
    const accessToken = this.generateToken()
    const refreshToken = this.generateToken()
    let rotated: unknown

    try {
      rotated = await this.resolveRedis().eval(
        ROTATE_TOKEN_PAIR_SCRIPT,
        3,
        this.refreshKey(consumedRefreshToken),
        this.accessKey(accessToken),
        this.refreshKey(refreshToken),
        record.rotationProof,
        String(AUTH_SESSION_TOKEN_LIFETIMES.accessSeconds),
        String(AUTH_SESSION_TOKEN_LIFETIMES.refreshSeconds),
        JSON.stringify(payload)
      )
    } catch (cause) {
      throw new DependencyUnavailableException('redis', 'session_token_pair_rotate', {
        cause,
      })
    }

    return Number(rotated) === 1
      ? this.toIssuedPair(accessToken, refreshToken, payload)
      : null
  }

  async revokeAccess(accessToken: string): Promise<void> {
    try {
      await this.resolveRedis().del(this.accessKey(accessToken))
    } catch (cause) {
      throw new DependencyUnavailableException('redis', 'session_access_revoke', {
        cause,
      })
    }
  }

  async revokeRefresh(refreshToken: string): Promise<void> {
    try {
      await this.resolveRedis().del(this.refreshKey(refreshToken))
    } catch (cause) {
      throw new DependencyUnavailableException('redis', 'session_refresh_revoke', {
        cause,
      })
    }
  }

  private buildPayload(claims: AuthSessionTokenClaims): StoredAuthSessionTokenPayload {
    return {
      sessionId: randomUUID(),
      ...claims,
    }
  }

  private toIssuedPair(
    accessToken: string,
    refreshToken: string,
    payload: StoredAuthSessionTokenPayload
  ): IssuedAuthSessionTokenPair {
    return {
      accessToken,
      refreshToken,
      expiresInSeconds: AUTH_SESSION_TOKEN_LIFETIMES.accessSeconds,
      refreshExpiresInSeconds: AUTH_SESSION_TOKEN_LIFETIMES.refreshSeconds,
      organizationId: payload.organizationId,
      systemRole: payload.systemRole,
    }
  }

  private parsePayload(raw: string | null): StoredAuthSessionTokenPayload | null {
    if (!raw) {
      return null
    }

    try {
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null
      }

      const candidate = parsed as Record<string, unknown>
      if (
        typeof candidate['sessionId'] !== 'string' ||
        typeof candidate['userId'] !== 'string' ||
        (candidate['email'] !== null && typeof candidate['email'] !== 'string') ||
        typeof candidate['systemRole'] !== 'string' ||
        (candidate['organizationId'] !== null && typeof candidate['organizationId'] !== 'string')
      ) {
        return null
      }

      return candidate as unknown as StoredAuthSessionTokenPayload
    } catch {
      return null
    }
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
