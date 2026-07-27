import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type {
  SkillRubricRepository,
  SkillRubricVersionRecord,
} from '#modules/skills/actions/ports/outbound/skill_rubric_repository'
import ResolveSkillQuery from '#modules/skills/actions/queries/skill-resolution/resolve_skill_query'
import { BaseQuery } from '#modules/skills/actions/base_query'

export default class ShowPublishedSkillRubricQuery extends BaseQuery<string, SkillRubricVersionRecord> {
  private readonly resolveSkill: ResolveSkillQuery

  constructor(private readonly repository: SkillRubricRepository) {
    super()
    this.resolveSkill = new ResolveSkillQuery(repository)
  }

  override handle(skillIdOrPhrase: string): Promise<SkillRubricVersionRecord> {
    return this.execute(skillIdOrPhrase)
  }

  async execute(skillIdOrPhrase: string): Promise<SkillRubricVersionRecord> {
    const skill = await this.resolveSkill.execute(skillIdOrPhrase)
    if (skill?.is_active !== true) {
      throw new NotFoundException('Skill not found')
    }

    const version = await this.repository.findPublishedBySkill(skill.id)
    if (!version) {
      throw new NotFoundException('No published rubric found for this skill')
    }
    return version
  }
}
