import { BaseQuery } from '#modules/skills/actions/base_query'
import type {
  SkillRubricRepository,
  SkillRubricVersionRecord,
} from '#modules/skills/actions/ports/outbound/rubric-and-proficiency/skill_rubric_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'

export default class GetPublishedSkillRubricVersionQuery extends BaseQuery<string, SkillRubricVersionRecord | null> {
  constructor(private readonly repository: SkillRubricRepository) {
    super()
  }

  override handle(skillId: string): Promise<SkillRubricVersionRecord | null> {
    return this.execute(skillId)
  }

  execute(
    skillId: string,
    transaction?: SkillTransaction
  ): Promise<SkillRubricVersionRecord | null> {
    return this.repository.findPublishedBySkill(skillId, transaction)
  }
}
