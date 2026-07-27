import { BaseQuery } from '#modules/skills/actions/base_query'
import type {
  ProfessionalRoleRepository,
  ProfessionalRoleTemplateRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'

export default class ListProfessionalRoleTemplatesQuery extends BaseQuery<
  undefined,
  ProfessionalRoleTemplateRecord[]
> {
  constructor(private readonly repository: ProfessionalRoleRepository) {
    super()
  }

  handle(): Promise<ProfessionalRoleTemplateRecord[]> {
    return this.repository.listActiveTemplatesWithSkillDetails()
  }

  override executeAndWrap() {
    return super.executeAndWrap(undefined)
  }

  execute(): Promise<ProfessionalRoleTemplateRecord[]> {
    return this.handle()
  }
}
