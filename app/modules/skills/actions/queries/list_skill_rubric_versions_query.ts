import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type {
  SkillRubricRepository,
  SkillRubricVersionRecord,
} from '#modules/skills/actions/ports/outbound/skill_rubric_repository'

export default class ListSkillRubricVersionsQuery {
  constructor(private readonly repository: SkillRubricRepository) {}

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
