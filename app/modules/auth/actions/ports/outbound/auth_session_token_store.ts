export interface AuthSessionTokenClaims {
  userId: string
  email: string | null
  systemRole: string
  organizationId: string | null
}

export interface StoredAuthSessionTokenPayload extends AuthSessionTokenClaims {
  sessionId: string
}

export interface AuthRefreshTokenRecord {
  payload: StoredAuthSessionTokenPayload
  rotationProof: string
}

export interface IssuedAuthSessionTokenPair {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  refreshExpiresInSeconds: number
  organizationId: string | null
  systemRole: string
}

export abstract class AuthSessionTokenStore {
  abstract issue(claims: AuthSessionTokenClaims): Promise<IssuedAuthSessionTokenPair>
  abstract readAccess(accessToken: string): Promise<StoredAuthSessionTokenPayload | null>
  abstract readRefresh(refreshToken: string): Promise<AuthRefreshTokenRecord | null>
  abstract rotate(
    consumedRefreshToken: string,
    record: AuthRefreshTokenRecord,
    claims: AuthSessionTokenClaims
  ): Promise<IssuedAuthSessionTokenPair | null>
  abstract revokeAccess(accessToken: string): Promise<void>
  abstract revokeRefresh(refreshToken: string): Promise<void>
}
