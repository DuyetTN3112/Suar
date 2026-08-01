import type { TestingSessionTokenPair } from '#modules/testing/actions/dtos/testing_auth_session'
import type { TestingAuthSessionGateway } from '#modules/testing/actions/ports/outbound/testing_auth_session_gateway'

export class RefreshTestingAuthTokenCommand {
  constructor(private readonly sessions: TestingAuthSessionGateway) {}

  execute(
    refreshToken: string,
    requestedOrganizationId?: string
  ): Promise<TestingSessionTokenPair> {
    return this.sessions.refresh(refreshToken, requestedOrganizationId)
  }
}
