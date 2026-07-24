import type {
  ProficiencyScaleRecord,
  ProficiencyScaleRepository,
} from '#modules/skills/actions/ports/outbound/proficiency_scale_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'
import { BaseQuery } from '#modules/skills/actions/base_query'

export default class GetActiveProficiencyScaleQuery extends BaseQuery<undefined, ProficiencyScaleRecord | null> {
  constructor(private readonly repository: ProficiencyScaleRepository) {
    super()
  }

  override handle(_input: undefined): Promise<ProficiencyScaleRecord | null> {
    return this.execute()
  }

  override executeAndWrap(_input?: undefined) {
    return super.executeAndWrap(undefined)
  }

  execute(transaction?: SkillTransaction): Promise<ProficiencyScaleRecord | null> {
    return this.repository.getActiveScaleWithLevels(transaction)
  }
}
