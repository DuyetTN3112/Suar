import { randomUUID } from 'node:crypto'

import type { HttpContext } from '@adonisjs/core/http'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type {
  AuthenticatedHttpActionContext,
  HttpActionContext,
} from '#modules/http/public_contracts/http_action_context'

export function resolveCurrentOrganizationId(ctx: HttpContext): string | null {
  return (
    ctx.currentOrganizationId ??
    (ctx.session.get('current_organization_id') as string | undefined) ??
    ctx.auth.user?.current_organization_id ??
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
  const runtimeContext: { requestContext?: HttpContext['requestContext'] } = ctx
  return runtimeContext.requestContext?.requestId ?? randomUUID()
}

function resolveTraceId(ctx: HttpContext, requestId: string): string {
  const runtimeContext: { requestContext?: HttpContext['requestContext'] } = ctx
  return runtimeContext.requestContext?.traceId ?? requestId
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
    actorRoleSurface: ctx.currentOrganizationRole ?? null,
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
    actorRoleSurface: ctx.currentOrganizationRole ?? null,
    requestId,
    traceId,
    workflowId: null,
  }
}
