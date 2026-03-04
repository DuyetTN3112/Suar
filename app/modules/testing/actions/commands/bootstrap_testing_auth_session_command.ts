import type { VerifiedTestingAccessToken } from '#modules/testing/actions/dtos/testing_auth_session'
import type { TestingUserAccountGateway } from '#modules/testing/actions/ports/outbound/testing_auth_fixture_gateways'
import type { TestingAuthSessionGateway } from '#modules/testing/actions/ports/outbound/testing_auth_session_gateway'

export class BootstrapTestingAuthSessionCommand {
  constructor(
    private readonly sessions: TestingAuthSessionGateway,
    private readonly users: TestingUserAccountGateway
  ) {}

  async execute(accessToken: string): Promise<VerifiedTestingAccessToken | null> {
    const verified = await this.sessions.verifyAccessToken(accessToken)
    if (!verified) return null

    await this.users.setCurrentOrganization(verified.userId, verified.organizationId)
    return verified
  }
}
