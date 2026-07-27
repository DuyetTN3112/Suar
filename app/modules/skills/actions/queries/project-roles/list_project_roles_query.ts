import { BaseQuery } from '#modules/skills/actions/base_query'
import type {
  ProfessionalRoleRepository,
  ProjectProfessionalRoleRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'

export default class ListProjectRolesQuery extends BaseQuery<
  { readonly projectId: string },
  ProjectProfessionalRoleRecord[]
> {
  constructor(private readonly repository: ProfessionalRoleRepository) {
    super()
  }

  async handle(input: { readonly projectId: string }): Promise<ProjectProfessionalRoleRecord[]> {
    return this.repository.listProjectRolesWithSkillDetails(input.projectId)
  }

  execute(projectId: string): Promise<ProjectProfessionalRoleRecord[]> {
    return this.handle({ projectId })
  }
}
