import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { ProficiencyScaleService } from '#modules/skills/actions/services/proficiency_scale_service'

export {
  buildProficiencyFrameworkDescriptor,
  findMatchingProficiencyLevel,
  isCanonicalProficiencyLevelCode,
  isSupportedProficiencyLevelCode,
  toLegacyProficiencyBandCode,
} from '#modules/skills/controllers/support/build_proficiency_framework_descriptor'
export {
  findCanonicalProficiencyLevelOption,
  getCanonicalProficiencyLevelLabel,
  getCanonicalProficiencyLevelOrder,
  getCanonicalProficiencyLevelValue,
  getCanonicalProficiencyLevelValueFromPercentage,
  getCanonicalProficiencyMidpointPercentage,
  getPreferredTaskRequirementLevelValue,
  isHighCanonicalProficiencyLevel,
  listCanonicalProficiencyLevelOptions,
} from '#modules/skills/support/proficiency_level_catalog'

export const proficiencyFrameworkPublicApi = {
  async mapCodeToLevel(code: string, trx?: TransactionClientContract) {
    return ProficiencyScaleService.mapCodeToLevel(code, trx)
  },
}
