import { BaseCommand } from '#modules/testing/actions/base_command'
import {
  type EnsureTestingAuthFixtureCommand,
  type EnsureTestingAuthFixtureInput,
  type TestingAuthFixtureResult,
} from '#modules/testing/actions/commands/testing-auth/ensure_testing_auth_fixture_command'
import type { TestingSessionTokenPair } from '#modules/testing/actions/dtos/testing_auth_session'
import type { TestingAuthSessionGateway } from '#modules/testing/actions/ports/outbound/testing_auth_session_gateway'

export interface IssueTestingAuthTokenResult {
  fixture: TestingAuthFixtureResult
  tokenPair: TestingSessionTokenPair
}

export class IssueTestingAuthTokenCommand extends BaseCommand<
  [input: EnsureTestingAuthFixtureInput],
  IssueTestingAuthTokenResult
> {
  constructor(
    private readonly ensureFixture: EnsureTestingAuthFixtureCommand,
    private readonly sessions: TestingAuthSessionGateway
  ) {
    super()
  }

  async execute(input: EnsureTestingAuthFixtureInput): Promise<IssueTestingAuthTokenResult> {
    const fixture = await this.ensureFixture.execute(input)
    const tokenPair = await this.sessions.issueForUserId(
      fixture.account.id,
      fixture.organizationId
    )
    return { fixture, tokenPair }
  }
}

export default IssueTestingAuthTokenCommand
