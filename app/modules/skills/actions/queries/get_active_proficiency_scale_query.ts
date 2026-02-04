import type {
  ProficiencyScaleRecord,
  ProficiencyScaleRepository,
} from '#modules/skills/actions/ports/outbound/proficiency_scale_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'

export default class GetActiveProficiencyScaleQuery {
  constructor(private readonly repository: ProficiencyScaleRepository) {}

  execute(transaction?: SkillTransaction): Promise<ProficiencyScaleRecord | null> {
    return this.repository.getActiveScaleWithLevels(transaction)
  }
}
