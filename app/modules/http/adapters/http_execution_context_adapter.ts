import { randomUUID } from 'node:crypto'

import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type {
  AuthenticatedHttpActionContext,
  HttpActionContext,
} from '#modules/http/actions/http_action_context'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'

export function resolveCurrentOrganizationId(ctx: HttpContext): string | null {
  return (
    ctx.currentOrganizationId ??
    ((ctx.session.get('current_organization_id') as string | undefined) ??
      ctx.auth.user?.current_organization_id) ??
    null
  )
}

export function requireCurrentOrganizationId(ctx: HttpContext): string {
  const organizationId = resolveCurrentOrganizationId(ctx)
  if (!organizationId) {
    throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
  }

  return organizationId
}

function resolveRequestId(ctx: HttpContext): string {
  return ctx.request.header('x-request-id') ?? ctx.request.header('x-correlation-id') ?? randomUUID()
}

function resolveTraceId(ctx: HttpContext, requestId: string): string {
  return ctx.request.header('x-trace-id') ?? requestId
}

export function actionContextFromHttp(ctx: HttpContext): AuthenticatedHttpActionContext {
  const user = ctx.auth.user
  if (!user) {
    throw new UnauthorizedException('User must be authenticated')
  }

  const requestId = resolveRequestId(ctx)
  const traceId = resolveTraceId(ctx, requestId)

  return {
    userId: user.id,
    ip: ctx.request.ip(),
    userAgent: ctx.request.header('user-agent') ?? '',
    organizationId: resolveCurrentOrganizationId(ctx),
    requestId,
    traceId,
    workflowId: null,
  }
}

export function optionalActionContextFromHttp(ctx: HttpContext): HttpActionContext {
  const requestId = resolveRequestId(ctx)
  const traceId = resolveTraceId(ctx, requestId)

  return {
    userId: ctx.auth.user?.id ?? null,
    ip: ctx.request.ip(),
    userAgent: ctx.request.header('user-agent') ?? '',
    organizationId: resolveCurrentOrganizationId(ctx),
    requestId,
    traceId,
    workflowId: null,
  }
}
