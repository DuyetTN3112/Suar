import type {
  SkillRubricRepository,
  SkillRubricVersionRecord,
} from '#modules/skills/actions/ports/outbound/skill_rubric_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'

export default class GetPublishedSkillRubricVersionQuery {
  constructor(private readonly repository: SkillRubricRepository) {}

  execute(
    skillId: string,
    transaction?: SkillTransaction
  ): Promise<SkillRubricVersionRecord | null> {
    return this.repository.findPublishedBySkill(skillId, transaction)
  }
}
