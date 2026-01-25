export interface TestingSessionTokenPair {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  refreshExpiresInSeconds: number
  organizationId: string | null
  systemRole: string
}

export interface VerifiedTestingAccessToken {
  userId: string
  email: string | null
  systemRole: string
  organizationId: string | null
}
