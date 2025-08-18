import type { HttpContext } from '@adonisjs/core/http'

import type {
  AuthenticatedHttpActionContext,
  HttpActionContext,
} from '#modules/http/actions/http_action_context'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'

export function actionContextFromHttp(ctx: HttpContext): AuthenticatedHttpActionContext {
  const user = ctx.auth.user
  if (!user) {
    throw new UnauthorizedException('User must be authenticated')
  }

  return {
    userId: user.id,
    ip: ctx.request.ip(),
    userAgent: ctx.request.header('user-agent') ?? '',
    organizationId: (ctx.session.get('current_organization_id') as string | undefined) ?? null,
  }
}

export function optionalActionContextFromHttp(ctx: HttpContext): HttpActionContext {
  return {
    userId: ctx.auth.user?.id ?? null,
    ip: ctx.request.ip(),
    userAgent: ctx.request.header('user-agent') ?? '',
    organizationId: (ctx.session.get('current_organization_id') as string | undefined) ?? null,
  }
}
