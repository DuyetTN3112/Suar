import type {
  ProfessionalRoleRepository,
  ProfessionalRoleTemplateRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'

export default class ListProfessionalRoleTemplatesQuery {
  constructor(private readonly repository: ProfessionalRoleRepository) {}

  execute(): Promise<ProfessionalRoleTemplateRecord[]> {
    return this.repository.listActiveTemplatesWithSkillDetails()
  }
}
