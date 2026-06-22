import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'

export async function checkProjectPermission(ctx: HttpContext, projectId: string, writeMode = false): Promise<string> {
  const { session, auth } = ctx
  const userId = auth.user?.id
  if (!userId) {
    throw new Error('Unauthenticated')
  }

  const organizationId = session.get('current_organization_id') as string | undefined
  if (!organizationId) {
    throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
  }

  await projectPublicApi.enforceUserProjectAccess({
    projectId,
    userId,
    organizationId,
    writeMode,
  })

  return userId
}
