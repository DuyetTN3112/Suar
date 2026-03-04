import type {
  ProficiencyLevelRecord,
  ProficiencyScaleRepository,
} from '#modules/skills/actions/ports/outbound/proficiency_scale_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'
import { findMatchingProficiencyLevel } from '#modules/skills/public_contracts/proficiency_level_mapping'

export default class MapProficiencyCodeToLevelQuery {
  constructor(private readonly repository: ProficiencyScaleRepository) {}

  async execute(
    code: string,
    transaction?: SkillTransaction
  ): Promise<ProficiencyLevelRecord | null> {
    const scale = await this.repository.getActiveScaleWithLevels(transaction)
    return scale ? findMatchingProficiencyLevel(scale.levels, code) : null
  }
}
