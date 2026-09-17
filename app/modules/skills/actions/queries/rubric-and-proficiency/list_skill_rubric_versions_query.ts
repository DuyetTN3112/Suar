import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseQuery } from '#modules/skills/actions/base_query'
import type {
  SkillRubricRepository,
  SkillRubricVersionRecord,
} from '#modules/skills/actions/ports/outbound/rubric-and-proficiency/skill_rubric_repository'

export default class ListSkillRubricVersionsQuery extends BaseQuery<string, SkillRubricVersionRecord[]> {
  constructor(private readonly repository: SkillRubricRepository) {
    super()
  }

  override handle(skillId: string): Promise<SkillRubricVersionRecord[]> {
    return this.execute(skillId)
  }

  async execute(skillId: string): Promise<SkillRubricVersionRecord[]> {
    const skill = await this.repository.findSkill(skillId)
    if (skill?.is_active !== true) {
      throw new NotFoundException('Skill not found')
    }

    const versions = await this.repository.findVersionsBySkillWithLevels(skillId)
    if (versions.length === 0) {
      throw new NotFoundException('No rubric versions found for this skill')
    }
    return versions
  }
}
