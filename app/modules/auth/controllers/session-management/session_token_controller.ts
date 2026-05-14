import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { IssueSessionTokenCommand } from '#modules/auth/actions/commands/issue_session_token_command'
import { RefreshSessionTokenCommand } from '#modules/auth/actions/commands/refresh_session_token_command'
import { ErrorCode, HttpStatus } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { emitApiError } from '#modules/http/boundary/http_api_error_emitter'
import { classifyHttpTransport } from '#modules/http/boundary/http_transport'

interface SessionTokenPair {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  refreshExpiresInSeconds: number
  organizationId: string | null
  systemRole: string
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

function respondTokenPair(ctx: HttpContext, tokenPair: SessionTokenPair): void {
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

@inject()
export default class SessionTokenController {
  constructor(
    private readonly issueSessionToken: IssueSessionTokenCommand,
    private readonly refreshSessionToken: RefreshSessionTokenCommand
  ) {}

  async issue(ctx: HttpContext): Promise<void> {
    const { auth, session } = ctx
    const user = auth.user
    if (!user) {
      emitRouteApiError(
        ctx,
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'Authentication required'
      )
      return
    }

    const currentOrganizationId =
      (session.get('current_organization_id') as string | undefined) ?? user.current_organization_id
    const tokenPair = await this.issueSessionToken
      .executeAndWrap(user, currentOrganizationId)
      .then((outcome) => outcome.getValue())
    respondTokenPair(ctx, tokenPair)
  }

  async refresh(ctx: HttpContext): Promise<void> {
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
      const tokenPair = await this.refreshSessionToken
        .executeAndWrap(
        refreshToken,
        requestedOrganizationId
        )
        .then((outcome) => outcome.getValue())
      respondTokenPair(ctx, tokenPair)
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error
      }
      emitRouteApiError(ctx, error.status, error.code, error.safeMessage)
    }
  }
}
