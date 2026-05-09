import type { AdminActionContext } from '#modules/admin/proficiency/actions/action_context'
import type {
  AdminProficiencyScaleProjection,
  AdminSkillProjection,
  AdminSkillRubricGateway,
} from '#modules/admin/proficiency/actions/ports/outbound/proficiency/admin_skill_rubric_gateway'
import { BaseQuery } from '#modules/admin/proficiency/actions/queries/proficiency/base_query'

export interface ProficiencyCatalogResult {
  scale: AdminProficiencyScaleProjection | null
  skills: AdminSkillProjection[]
}

export default class ListProficiencyCatalogQuery extends BaseQuery<
  Record<string, never>,
  ProficiencyCatalogResult
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly skillRubric: AdminSkillRubricGateway
  ) {
    super(execCtx)
  }

  async handle(): Promise<ProficiencyCatalogResult> {
    const [scale, skills] = await Promise.all([
      this.skillRubric.getActiveScale(),
      this.skillRubric.listActiveSkills(),
    ])

    return { scale, skills }
  }
}
