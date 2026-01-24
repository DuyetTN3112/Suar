import type {
  ProfessionalRoleRepository,
  ProjectProfessionalRoleRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'

export default class ListProjectRolesQuery {
  constructor(private readonly repository: ProfessionalRoleRepository) {}

  execute(projectId: string): Promise<ProjectProfessionalRoleRecord[]> {
    return this.repository.listProjectRolesWithSkillDetails(projectId)
  }
}
