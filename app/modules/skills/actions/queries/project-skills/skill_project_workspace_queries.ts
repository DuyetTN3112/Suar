import type AuthorizeSkillProjectAccessCommand from '#modules/skills/actions/commands/project-skills/authorize_skill_project_access_command'
import type { ProjectProfessionalRoleRecord } from '#modules/skills/actions/ports/outbound/professional_role_repository'
import type { ProjectSkillRecord } from '#modules/skills/actions/ports/outbound/project_skill_repository'
import type ListProjectRolesQuery from '#modules/skills/actions/queries/project-roles/list_project_roles_query'
import type ListProjectSkillsQuery from '#modules/skills/actions/queries/project-skills/list_project_skills_query'
import type { SkillProjectActionContext } from '#modules/skills/actions/skill_project_action_context'
import { BaseQuery } from '#modules/skills/actions/base_query'

export class ListProjectSkillsWorkspaceQuery extends BaseQuery<string, ProjectSkillRecord[]> {
  constructor(
    private readonly context: SkillProjectActionContext,
    private readonly authorize: AuthorizeSkillProjectAccessCommand,
    private readonly listProjectSkills: ListProjectSkillsQuery
  ) {
    super()
  }

  async handle(projectId: string): Promise<ProjectSkillRecord[]> {
    return this.execute(projectId)
  }

  async execute(projectId: string): Promise<ProjectSkillRecord[]> {
    await this.authorize.execute({ context: this.context, projectId, writeMode: false })
    return this.listProjectSkills.execute(projectId)
  }
}

export class ListProjectRolesWorkspaceQuery extends BaseQuery<
  string,
  ProjectProfessionalRoleRecord[]
> {
  constructor(
    private readonly context: SkillProjectActionContext,
    private readonly authorize: AuthorizeSkillProjectAccessCommand,
    private readonly listProjectRoles: ListProjectRolesQuery
  ) {
    super()
  }

  async handle(projectId: string): Promise<ProjectProfessionalRoleRecord[]> {
    return this.execute(projectId)
  }

  async execute(projectId: string): Promise<ProjectProfessionalRoleRecord[]> {
    await this.authorize.execute({ context: this.context, projectId, writeMode: false })
    return this.listProjectRoles.execute(projectId)
  }
}
