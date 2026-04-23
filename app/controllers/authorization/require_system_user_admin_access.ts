import type { HttpContext } from '@adonisjs/core/http'

import AuthorizeSystemUserAdminAccessQuery from '#actions/authorization/queries/authorize_system_user_admin_access_query'
import { ErrorMessages } from '#constants/error_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { DatabaseId } from '#types/database'

interface SystemUserAdminAccessContext {
  userId: DatabaseId
  organizationId: DatabaseId
}

function getRequiredContext(ctx: HttpContext): SystemUserAdminAccessContext {
  const user = ctx.auth.user
  if (!user) {
    throw new UnauthorizedException()
  }

  const organizationId = user.current_organization_id
  if (!organizationId) {
    throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
  }

  return {
    userId: user.id,
    organizationId,
  }
}

export async function requireSystemUserAdminAccess(
  ctx: HttpContext
): Promise<SystemUserAdminAccessContext> {
  const accessContext = getRequiredContext(ctx)
  await AuthorizeSystemUserAdminAccessQuery.authorize(
    accessContext.userId,
    accessContext.organizationId
  )

  return accessContext
}

export async function resolveSystemUserAdminAccess(
  ctx: HttpContext
): Promise<SystemUserAdminAccessContext | null> {
  const user = ctx.auth.user
  if (!user) {
    return null
  }

  const organizationId = user.current_organization_id
  if (!organizationId) {
    return null
  }

  const allowed = await AuthorizeSystemUserAdminAccessQuery.execute(user.id, organizationId)
  if (!allowed) {
    return null
  }

  return {
    userId: user.id,
    organizationId,
  }
}
