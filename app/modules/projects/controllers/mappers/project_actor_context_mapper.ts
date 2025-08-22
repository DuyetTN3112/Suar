import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ProjectActorContext } from '#modules/projects/application/context/project_actor_context'

export function projectActorContextFromHttp(ctx: HttpContext): ProjectActorContext {
  const user = ctx.auth.user
  if (!user) {
    throw new UnauthorizedException('User must be authenticated')
  }

  return {
    actorUserId: user.id,
    currentOrganizationId: (ctx.session.get('current_organization_id') as string | undefined) ?? null,
    actorSystemRole: user.system_role,
  }
}
