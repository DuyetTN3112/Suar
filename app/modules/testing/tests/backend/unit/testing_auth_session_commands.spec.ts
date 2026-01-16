import { test } from '@japa/runner'

import { BootstrapTestingAuthSessionCommand } from '#modules/testing/actions/commands/bootstrap_testing_auth_session_command'
import type { EnsureTestingAuthFixtureCommand } from '#modules/testing/actions/commands/ensure_testing_auth_fixture_command'
import { IssueTestingAuthTokenCommand } from '#modules/testing/actions/commands/issue_testing_auth_token_command'
import { RefreshTestingAuthTokenCommand } from '#modules/testing/actions/commands/refresh_testing_auth_token_command'
import type { TestingUserAccountGateway } from '#modules/testing/actions/ports/outbound/testing_auth_fixture_gateways'
import type { TestingAuthSessionGateway } from '#modules/testing/actions/ports/outbound/testing_auth_session_gateway'

const tokenPair = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresInSeconds: 900,
  refreshExpiresInSeconds: 3_600,
  organizationId: 'organization-1',
  systemRole: 'registered_user',
}

function sessionGateway(
  overrides: Partial<TestingAuthSessionGateway>
): TestingAuthSessionGateway {
  return {
    issueForUserId: () => Promise.reject(new Error('unexpected_issue')),
    refresh: () => Promise.reject(new Error('unexpected_refresh')),
    verifyAccessToken: () => Promise.reject(new Error('unexpected_verify')),
    ...overrides,
  }
}

test.group('Unit | Testing auth session commands', () => {
  test('issue command owns fixture and token orchestration', async ({ assert }) => {
    const calls: string[] = []
    const ensureFixture = {
      execute: () => {
        calls.push('fixture')
        return Promise.resolve({
          account: {
            id: 'user-1',
            username: 'tester',
            email: 'tester@example.com',
            systemRole: 'registered_user',
            currentOrganizationId: 'organization-1',
          },
          organizationId: 'organization-1',
        })
      },
    } as unknown as EnsureTestingAuthFixtureCommand
    const sessions = sessionGateway({
      issueForUserId: (userId: string, organizationId: string | null) => {
        calls.push(`token:${userId}:${String(organizationId)}`)
        return Promise.resolve(tokenPair)
      },
    })

    const result = await new IssueTestingAuthTokenCommand(ensureFixture, sessions).execute({
      email: 'tester@example.com',
    })

    assert.deepEqual(calls, ['fixture', 'token:user-1:organization-1'])
    assert.strictEqual(result.tokenPair, tokenPair)
  })

  test('refresh command delegates the requested organization', async ({ assert }) => {
    const sessions = sessionGateway({
      refresh: (refreshToken: string, organizationId?: string) => {
        assert.equal(refreshToken, 'refresh-token')
        assert.equal(organizationId, 'organization-2')
        return Promise.resolve(tokenPair)
      },
    })

    const result = await new RefreshTestingAuthTokenCommand(sessions).execute(
      'refresh-token',
      'organization-2'
    )

    assert.strictEqual(result, tokenPair)
  })

  test('bootstrap command updates organization only after token verification', async ({ assert }) => {
    const calls: string[] = []
    const sessions = sessionGateway({
      verifyAccessToken: () => {
        calls.push('verify')
        return Promise.resolve({
          userId: 'user-1',
          email: 'tester@example.com',
          systemRole: 'registered_user',
          organizationId: 'organization-1',
        })
      },
    })
    const users: TestingUserAccountGateway = {
      ensureTestingAccountV1: () => Promise.reject(new Error('unexpected_ensure_account')),
      setCurrentOrganization: (userId: string, organizationId: string | null) => {
        calls.push(`organization:${userId}:${String(organizationId)}`)
        return Promise.resolve()
      },
      findTestingAccountV1: () => Promise.resolve(null),
    }

    const result = await new BootstrapTestingAuthSessionCommand(sessions, users).execute(
      'access-token'
    )

    assert.equal(result?.userId, 'user-1')
    assert.deepEqual(calls, ['verify', 'organization:user-1:organization-1'])
  })
})
