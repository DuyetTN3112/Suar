import type { HttpContext } from '@adonisjs/core/http'

import { ErrorCode, HttpStatus } from '#modules/errors/public_contracts/error_constants'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'
import { classifyHttpTransport } from '#modules/http/boundary/http_transport'
import type { BootstrapTestingAuthSessionCommand } from '#modules/testing/actions/commands/testing-auth/bootstrap_testing_auth_session_command'
import type {
  EnsureTestingAuthFixtureCommand,
  EnsureTestingAuthFixtureInput,
} from '#modules/testing/actions/commands/testing-auth/ensure_testing_auth_fixture_command'
import type {
  IssueTestingAuthTokenCommand,
  IssueTestingAuthTokenResult,
} from '#modules/testing/actions/commands/testing-auth/issue_testing_auth_token_command'
import type { RefreshTestingAuthTokenCommand } from '#modules/testing/actions/commands/testing-auth/refresh_testing_auth_token_command'
import type { TestingSessionTokenPair } from '#modules/testing/actions/dtos/testing_auth_session'

const VALID_TESTING_SYSTEM_ROLES = new Set(['registered_user', 'system_admin', 'superadmin'])

type TestingAuthInput = EnsureTestingAuthFixtureInput

export interface TestingWebSessionAuthenticator {
  login(ctx: HttpContext, userId: string): Promise<void>
}

function readStringInput(ctx: HttpContext, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value: unknown = ctx.request.input(key)
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

function emitRouteApiError(ctx: HttpContext, status: number, code: string, detail: string): void {
  emitApiError(ctx, {
    transport: classifyHttpTransport(ctx),
    status,
    code,
    detail,
    includeLegacyMeta: true,
  })
}

function respondTokenPair(ctx: HttpContext, tokenPair: TestingSessionTokenPair): void {
  ctx.response.json({
    data: {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresInSeconds,
      refreshExpiresIn: tokenPair.refreshExpiresInSeconds,
      organizationId: tokenPair.organizationId,
      systemRole: tokenPair.systemRole,
    },
  })
}

export default class TestingAuthController {
  constructor(
    private readonly ensureTestingAuthFixture: EnsureTestingAuthFixtureCommand,
    private readonly issueTestingAuthToken: IssueTestingAuthTokenCommand,
    private readonly refreshTestingAuthToken: RefreshTestingAuthTokenCommand,
    private readonly bootstrapTestingAuthSession: BootstrapTestingAuthSessionCommand,
    private readonly webAuthenticator: TestingWebSessionAuthenticator
  ) {}

  async login(ctx: HttpContext): Promise<void> {
    const input = this.readAuthInput(ctx)
    if (!input) {
      return
    }

    const fixture = await this.ensureFixture(ctx, input)
    if (!fixture) {
      return
    }

    this.setOrganizationSession(ctx, fixture.organizationId)
    await this.webAuthenticator.login(ctx, fixture.account.id)
    ctx.response.noContent()
  }

  async tokenLogin(ctx: HttpContext): Promise<void> {
    const input = this.readAuthInput(ctx)
    if (!input) {
      return
    }

    const issued = await this.issueToken(ctx, input)
    if (!issued) {
      return
    }

    this.setOrganizationSession(ctx, issued.fixture.organizationId)
    respondTokenPair(ctx, issued.tokenPair)
  }

  async tokenRefresh(ctx: HttpContext): Promise<void> {
    const refreshToken = readStringInput(ctx, ['refreshToken', 'refresh_token'])
    const requestedOrganizationId = readStringInput(ctx, ['organizationId', 'organization_id'])
    if (!refreshToken) {
      emitRouteApiError(
        ctx,
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.VALIDATION,
        'Refresh token is required'
      )
      return
    }

    try {
      const tokenPair = await this.refreshTestingAuthToken
        .executeAndWrap(refreshToken, requestedOrganizationId)
        .then((outcome) => outcome.getValue())
      respondTokenPair(ctx, tokenPair)
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error
      }
      emitRouteApiError(ctx, error.status, error.code, error.safeMessage)
    }
  }

  async bootstrapSession(ctx: HttpContext): Promise<void> {
    const authorizationHeader = ctx.request.header('authorization')
    const accessTokenFromHeader = authorizationHeader?.startsWith('Bearer ')
      ? authorizationHeader.slice('Bearer '.length).trim()
      : undefined
    const accessToken =
      accessTokenFromHeader ?? readStringInput(ctx, ['accessToken', 'access_token'])

    if (!accessToken) {
      emitRouteApiError(
        ctx,
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.VALIDATION,
        'Access token is required'
      )
      return
    }

    const verified = await this.bootstrapTestingAuthSession
      .executeAndWrap(accessToken)
      .then((outcome) => outcome.getValue())
    if (!verified) {
      emitRouteApiError(
        ctx,
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'Access token is invalid or expired'
      )
      return
    }

    this.setOrganizationSession(ctx, verified.organizationId)
    await this.webAuthenticator.login(ctx, verified.userId)
    ctx.response.json(
      wrapApiV1Data({
        organizationId: verified.organizationId,
        systemRole: verified.systemRole,
        email: verified.email,
      })
    )
  }

  private readAuthInput(ctx: HttpContext): TestingAuthInput | null {
    const email = readStringInput(ctx, ['email'])
    const provider = readStringInput(ctx, ['provider'])
    const requestedOrganizationId = readStringInput(ctx, ['organizationId', 'organization_id'])
    const requestedSystemRole = readStringInput(ctx, ['systemRole', 'system_role'])

    if (!email) {
      emitRouteApiError(
        ctx,
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.VALIDATION,
        'Email is required'
      )
      return null
    }
    if (!email.includes('@') || email.length > 255) {
      emitRouteApiError(
        ctx,
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.VALIDATION,
        'Email format is invalid'
      )
      return null
    }
    if (provider !== undefined && provider !== 'google' && provider !== 'github') {
      emitRouteApiError(
        ctx,
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.VALIDATION,
        'Provider must be google or github'
      )
      return null
    }
    if (requestedOrganizationId !== undefined && requestedOrganizationId.length > 255) {
      emitRouteApiError(
        ctx,
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.VALIDATION,
        'Organization ID is invalid'
      )
      return null
    }
    if (requestedSystemRole !== undefined && !VALID_TESTING_SYSTEM_ROLES.has(requestedSystemRole)) {
      emitRouteApiError(
        ctx,
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.VALIDATION,
        'System role is invalid'
      )
      return null
    }

    return {
      email,
      ...(provider === undefined ? {} : { provider }),
      ...(requestedOrganizationId === undefined ? {} : { requestedOrganizationId }),
      ...(requestedSystemRole === undefined ? {} : { requestedSystemRole }),
    }
  }

  private async ensureFixture(ctx: HttpContext, input: TestingAuthInput) {
    try {
      return await this.ensureTestingAuthFixture
        .executeAndWrap(input)
        .then((outcome) => outcome.getValue())
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        emitRouteApiError(ctx, error.status, error.code, error.safeMessage)
        return null
      }
      throw error
    }
  }

  private async issueToken(
    ctx: HttpContext,
    input: TestingAuthInput
  ): Promise<IssueTestingAuthTokenResult | null> {
    try {
      return await this.issueTestingAuthToken
        .executeAndWrap(input)
        .then((outcome) => outcome.getValue())
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        emitRouteApiError(ctx, error.status, error.code, error.safeMessage)
        return null
      }
      throw error
    }
  }

  private setOrganizationSession(ctx: HttpContext, organizationId: string | null): void {
    if (organizationId) {
      ctx.session.put('current_organization_id', organizationId)
      return
    }
    ctx.session.forget('current_organization_id')
  }
}
