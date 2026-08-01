import type { SkillRecord } from '#modules/skills/actions/ports/outbound/skill_catalog_repository'
import type { SkillRubricRepository } from '#modules/skills/actions/ports/outbound/skill_rubric_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'

export default class ResolveSkillQuery {
  constructor(private readonly repository: SkillRubricRepository) {}

  async execute(phrase: string, transaction?: SkillTransaction): Promise<SkillRecord | null> {
    const trimmed = phrase.trim()
    if (!trimmed) return null

    let skill = await this.repository.findSkill(trimmed, transaction)
    if (skill?.is_active) return skill

    skill = await this.repository.findActiveSkillByCode(trimmed, transaction)
    if (skill) return skill

    skill = await this.repository.findActiveSkillByName(trimmed, transaction)
    if (skill) return skill

    const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')
    const alias = await this.repository.findAliasByNormalized(normalized, transaction)
    return alias?.skill.is_active ? alias.skill : null
  }
}
