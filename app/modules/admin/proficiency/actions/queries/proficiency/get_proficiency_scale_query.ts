import type { AdminActionContext } from '#modules/admin/proficiency/actions/action_context'
import type {
  AdminProficiencyScaleProjection,
  AdminSkillRubricGateway,
} from '#modules/admin/proficiency/actions/ports/outbound/proficiency/admin_skill_rubric_gateway'
import { BaseQuery } from '#modules/admin/proficiency/actions/queries/proficiency/base_query'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'

export default class GetProficiencyScaleQuery extends BaseQuery<
  { proficiencyScaleId: string },
  AdminProficiencyScaleProjection
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly skillRubric: AdminSkillRubricGateway
  ) {
    super(execCtx)
  }

  async handle(input: {
    proficiencyScaleId: string
  }): Promise<AdminProficiencyScaleProjection> {
    const scale = await this.skillRubric.getActiveScale()

    if (!scale || scale.id !== input.proficiencyScaleId) {
      throw new NotFoundException('Proficiency scale not found')
    }

    return scale
  }
}
