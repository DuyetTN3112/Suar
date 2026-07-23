import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/skills/actions/base_command'
import type { SkillProjectAccessAuthorizer } from '#modules/skills/actions/ports/outbound/skill_project_access_authorizer'
import type { SkillProjectActionContext } from '#modules/skills/actions/skill_project_action_context'

export interface AuthorizeSkillProjectAccessInput {
  context: SkillProjectActionContext
  projectId: string
  writeMode: boolean
}

export default class AuthorizeSkillProjectAccessCommand extends BaseCommand<
  AuthorizeSkillProjectAccessInput,
  string
> {
  constructor(private readonly authorizer: SkillProjectAccessAuthorizer) {
    super()
  }

  async execute(input: AuthorizeSkillProjectAccessInput): Promise<string> {
    const { userId, organizationId } = input.context
    if (!userId) {
      throw new UnauthorizedException()
    }
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    await this.authorizer.enforce({
      projectId: input.projectId,
      userId,
      organizationId,
      writeMode: input.writeMode,
    })

    return userId
  }
}
