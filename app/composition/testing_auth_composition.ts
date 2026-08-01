import type { HttpContext } from '@adonisjs/core/http'

import {
  issueSessionTokenCommand,
  refreshSessionTokenCommand,
  verifySessionAccessTokenQuery,
} from '#composition/auth_application_composition'
import { TestingOAuthIdentityGateway } from '#modules/auth/infra/adapters/testing_oauth_identity_gateway'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { TestingOrganizationGateway } from '#modules/organizations/directory/infra/adapters/testing_organization_gateway'
import { BootstrapTestingAuthSessionCommand } from '#modules/testing/actions/commands/bootstrap_testing_auth_session_command'
import { EnsureTestingAuthFixtureCommand } from '#modules/testing/actions/commands/ensure_testing_auth_fixture_command'
import { IssueTestingAuthTokenCommand } from '#modules/testing/actions/commands/issue_testing_auth_token_command'
import { RefreshTestingAuthTokenCommand } from '#modules/testing/actions/commands/refresh_testing_auth_token_command'
import type { TestingAuthSessionGateway } from '#modules/testing/actions/ports/outbound/testing_auth_session_gateway'
import TestingAuthController from '#modules/testing/controllers/testing_auth_controller'
import { NodeTestingIdentityGenerator } from '#modules/testing/infra/adapters/node_testing_identity_generator'
import { TestingUserAccountGateway } from '#modules/users/infra/adapters/testing_user_account_gateway'

const userGateway = new TestingUserAccountGateway()
const ensureTestingAuthFixture = new EnsureTestingAuthFixtureCommand(
  {
    user: userGateway,
    oauth: new TestingOAuthIdentityGateway(),
    organization: new TestingOrganizationGateway(),
  },
  new NodeTestingIdentityGenerator()
)
const tokenGateway: TestingAuthSessionGateway = {
  async issueForUserId(userId, organizationId) {
    const user = await userGateway.findAuthUserModel(userId)
    if (!user) {
      throw new InvariantViolationException('Testing auth user could not be loaded')
    }
    return issueSessionTokenCommand.execute(user, organizationId)
  },

  refresh(refreshToken, requestedOrganizationId) {
    return refreshSessionTokenCommand.execute(refreshToken, requestedOrganizationId)
  },

  async verifyAccessToken(accessToken) {
    const verified = await verifySessionAccessTokenQuery.execute(accessToken)
    if (!verified) {
      return null
    }
    return {
      userId: verified.userId,
      email: verified.email,
      systemRole: verified.systemRole,
      organizationId: verified.organizationId,
    }
  },
}

const controller = new TestingAuthController(
  ensureTestingAuthFixture,
  new IssueTestingAuthTokenCommand(ensureTestingAuthFixture, tokenGateway),
  new RefreshTestingAuthTokenCommand(tokenGateway),
  new BootstrapTestingAuthSessionCommand(tokenGateway, userGateway),
  {
    async login(ctx: HttpContext, userId: string) {
      const user = await userGateway.findAuthUserModel(userId)
      if (!user) {
        throw new InvariantViolationException('Testing auth user could not be loaded')
      }
      await ctx.auth.use('web').login(user, true)
    },
  }
)

export const testingAuthHandlers = {
  login: (ctx: HttpContext) => controller.login(ctx),
  tokenLogin: (ctx: HttpContext) => controller.tokenLogin(ctx),
  tokenRefresh: (ctx: HttpContext) => controller.tokenRefresh(ctx),
  bootstrapSession: (ctx: HttpContext) => controller.bootstrapSession(ctx),
}
