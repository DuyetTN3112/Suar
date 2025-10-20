import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { findMatchingProficiencyLevel } from '#modules/skills/controllers/support/build_proficiency_framework_descriptor'
import { ProficiencyScaleRepository } from '#modules/skills/infra/repositories/proficiency_scale_repository'

export const ProficiencyScaleService = {
  /**
   * Get the current active proficiency scale with its levels sorted by ordinal.
   */
  async getActiveScale(trx?: TransactionClientContract) {
    return ProficiencyScaleRepository.getActiveScaleWithLevels(trx)
  },

  /**
   * Map a proficiency code string (prefer canonical L0-L14) to its database ProficiencyLevel record.
   */
  async mapCodeToLevel(code: string, trx?: TransactionClientContract) {
    const scale = await this.getActiveScale(trx)
    if (!scale) return null
    return findMatchingProficiencyLevel(scale.levels, code)
  },
}
