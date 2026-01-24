import type {
  SkillProjectAccessAuthorizer,
  SkillProjectAccessInput,
} from '#modules/skills/actions/ports/outbound/skill_project_access_authorizer'

export default class AuthorizeSkillProjectAccessCommand {
  constructor(private readonly authorizer: SkillProjectAccessAuthorizer) {}

  execute(input: SkillProjectAccessInput): Promise<void> {
    return this.authorizer.enforce(input)
  }
}
