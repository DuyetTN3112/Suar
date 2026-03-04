import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import AuthorizeSkillProjectAccessCommand from '#modules/skills/actions/commands/authorize_skill_project_access_command'

@inject()
export class SkillProjectAccessGuard {
  constructor(private readonly authorizeProjectAccess: AuthorizeSkillProjectAccessCommand) {}

  async requireUserId(
    ctx: HttpContext,
    projectId: string,
    writeMode = false
  ): Promise<string> {
    const { session, auth } = ctx
    const userId = auth.user?.id
    if (!userId) {
      throw new UnauthorizedException()
    }

    const organizationId = session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    await this.authorizeProjectAccess.execute({
      projectId,
      userId,
      organizationId,
      writeMode,
    })

    return userId
  }
}
