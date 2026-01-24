import {
  type EnsureTestingAuthFixtureCommand,
  type EnsureTestingAuthFixtureInput,
  type TestingAuthFixtureResult,
} from '#modules/testing/actions/commands/ensure_testing_auth_fixture_command'
import type { TestingSessionTokenPair } from '#modules/testing/actions/dtos/testing_auth_session'
import type { TestingAuthSessionGateway } from '#modules/testing/actions/ports/outbound/testing_auth_session_gateway'

export interface IssueTestingAuthTokenResult {
  fixture: TestingAuthFixtureResult
  tokenPair: TestingSessionTokenPair
}

export class IssueTestingAuthTokenCommand {
  constructor(
    private readonly ensureFixture: EnsureTestingAuthFixtureCommand,
    private readonly sessions: TestingAuthSessionGateway
  ) {}

  async execute(input: EnsureTestingAuthFixtureInput): Promise<IssueTestingAuthTokenResult> {
    const fixture = await this.ensureFixture.execute(input)
    const tokenPair = await this.sessions.issueForUserId(
      fixture.account.id,
      fixture.organizationId
    )
    return { fixture, tokenPair }
  }
}
