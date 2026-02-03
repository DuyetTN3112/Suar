import type { AdminActionContext } from '#modules/admin/proficiency/actions/action_context'
import type {
  AdminSkillProjection,
  AdminSkillRubricGateway,
  AdminSkillRubricVersionProjection,
} from '#modules/admin/proficiency/actions/ports/outbound/admin_skill_rubric_gateway'
import { BaseQuery } from '#modules/admin/proficiency/actions/query/base_query'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'

export interface SkillRubricResult {
  skill: AdminSkillProjection
  version: AdminSkillRubricVersionProjection
}

export default class GetSkillRubricQuery extends BaseQuery<
  { skillId: string },
  SkillRubricResult
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly skillRubric: AdminSkillRubricGateway
  ) {
    super(execCtx)
  }

  async handle(input: { skillId: string }): Promise<SkillRubricResult> {
    const skill = await this.skillRubric.resolveSkill(input.skillId)
    if (!skill?.is_active) {
      throw new NotFoundException('Skill not found')
    }

    const version = await this.skillRubric.getPublishedVersion(skill.id)
    if (!version) {
      throw new NotFoundException('No published rubric found for this skill')
    }

    return { skill, version }
  }
}
