import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type {
  ProficiencyScaleRecord,
  ProficiencyScaleRepository,
} from '#modules/skills/actions/ports/outbound/proficiency_scale_repository'

export default class GetProficiencyScaleQuery {
  constructor(private readonly repository: ProficiencyScaleRepository) {}

  async execute(proficiencyScaleId: string): Promise<ProficiencyScaleRecord> {
    const scale = await this.repository.getActiveScaleWithLevels()
    if (!scale || scale.id !== proficiencyScaleId) {
      throw new NotFoundException('Proficiency scale not found')
    }
    return scale
  }
}
