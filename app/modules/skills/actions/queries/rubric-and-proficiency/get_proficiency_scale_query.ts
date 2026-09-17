import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseQuery } from '#modules/skills/actions/base_query'
import type {
  ProficiencyScaleRecord,
  ProficiencyScaleRepository,
} from '#modules/skills/actions/ports/outbound/rubric-and-proficiency/proficiency_scale_repository'

export default class GetProficiencyScaleQuery extends BaseQuery<string, ProficiencyScaleRecord> {
  constructor(private readonly repository: ProficiencyScaleRepository) {
    super()
  }

  override handle(proficiencyScaleId: string): Promise<ProficiencyScaleRecord> {
    return this.execute(proficiencyScaleId)
  }

  async execute(proficiencyScaleId: string): Promise<ProficiencyScaleRecord> {
    const scale = await this.repository.getActiveScaleWithLevels()
    if (!scale || scale.id !== proficiencyScaleId) {
      throw new NotFoundException('Proficiency scale not found')
    }
    return scale
  }
}
