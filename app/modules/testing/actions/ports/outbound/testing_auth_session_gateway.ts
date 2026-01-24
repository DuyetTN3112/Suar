import type {
  TestingSessionTokenPair,
  VerifiedTestingAccessToken,
} from '#modules/testing/actions/dtos/testing_auth_session'

export interface TestingAuthSessionGateway {
  issueForUserId(userId: string, organizationId: string | null): Promise<TestingSessionTokenPair>

  refresh(refreshToken: string, requestedOrganizationId?: string): Promise<TestingSessionTokenPair>

  verifyAccessToken(accessToken: string): Promise<VerifiedTestingAccessToken | null>
}
