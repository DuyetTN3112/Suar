import { ProficiencyScaleRepository } from '#modules/skills/infra/repositories/proficiency_scale_repository'

export const ProficiencyScaleService = {
  /**
   * Get the current active proficiency scale with its levels sorted by ordinal.
   */
  async getActiveScale() {
    return ProficiencyScaleRepository.getActiveScaleWithLevels()
  },

  /**
   * Map a level code string (e.g. 'junior', 'senior') to its database ProficiencyLevel record.
   */
  async mapCodeToLevel(code: string) {
    const scale = await this.getActiveScale()
    if (!scale) return null
    return scale.levels.find((l) => l.code === code) ?? null
  },
}
