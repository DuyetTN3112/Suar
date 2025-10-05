import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { resolveCurrentOrganizationId } from '#modules/http/public_contracts/http_execution_context'
import type { UserActorContext } from '#modules/users/application/context/user_actor_context'

export function userActorContextFromHttp(ctx: HttpContext): UserActorContext {
  const user = ctx.auth.user
  if (!user) {
    throw new UnauthorizedException('User must be authenticated')
  }

  return {
    actorUserId: user.id,
    currentOrganizationId: resolveCurrentOrganizationId(ctx),
    actorSystemRole: user.system_role,
  }
}
