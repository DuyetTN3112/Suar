import { BaseCommand } from '#modules/testing/actions/base_command'
import type { TestingSessionTokenPair } from '#modules/testing/actions/dtos/testing_auth_session'
import type { TestingAuthSessionGateway } from '#modules/testing/actions/ports/outbound/testing_auth_session_gateway'

export class RefreshTestingAuthTokenCommand extends BaseCommand<
  [refreshToken: string, requestedOrganizationId?: string],
  TestingSessionTokenPair
> {
  constructor(private readonly sessions: TestingAuthSessionGateway) {
    super()
  }

  execute(
    refreshToken: string,
    requestedOrganizationId?: string
  ): Promise<TestingSessionTokenPair> {
    return this.sessions.refresh(refreshToken, requestedOrganizationId)
  }
}

export default RefreshTestingAuthTokenCommand
