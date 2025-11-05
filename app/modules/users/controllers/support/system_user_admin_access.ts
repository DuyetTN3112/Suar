import type { HttpContext } from '@adonisjs/core/http'

import { AuthorizeSystemUserAdminAccessQuery } from '#modules/authorization/public_contracts/permission_checker'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'

interface SystemUserAdminAccessContext {
  userId: string
  organizationId: string
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
