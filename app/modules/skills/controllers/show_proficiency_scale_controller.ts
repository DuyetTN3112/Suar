import type { HttpContext } from '@adonisjs/core/http'

import { buildProficiencyFrameworkDescriptor } from './support/build_proficiency_framework_descriptor.js'
import { camelizeResponseValue } from './support/camelize_response.js'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { ProficiencyScaleService } from '#modules/skills/actions/services/proficiency_scale_service'
import { findCanonicalProficiencyLevelOption, getCanonicalProficiencyLevelValue } from '#modules/skills/support/proficiency_level_catalog'

function mapCanonicalLevelDisplay(level: { code: string; display_name?: string | null; short_name?: string | null }) {
  const option =
    findCanonicalProficiencyLevelOption(level.code) ??
    findCanonicalProficiencyLevelOption(level.display_name) ??
    null

  return {
    code: getCanonicalProficiencyLevelValue(level.code, level.code),
    display_name: option?.shortLabel ?? level.display_name ?? level.code,
    short_name: option?.code ?? level.short_name ?? level.code,
  }
}

export default class ShowProficiencyScaleController {
  async handle({ params }: HttpContext) {
    const scale = await ProficiencyScaleService.getActiveScale()

    if (!scale || scale.id !== params['proficiencyScaleId']) {
      throw new NotFoundException('Proficiency scale not found')
    }

    return {
      data: camelizeResponseValue({
        id: scale.id,
        code: scale.code,
        name: scale.name,
        version: scale.version,
        is_active: scale.is_active,
        effective_from: scale.effective_from?.toISODate() ?? null,
        effective_to: scale.effective_to?.toISODate() ?? null,
        levels: scale.levels.map((level) => ({
          ...mapCanonicalLevelDisplay(level),
          id: level.id,
          ordinal: level.ordinal,
          normalized_value: level.normalized_value,
          generic_description: level.generic_description,
          sort_order: level.sort_order,
          expected_knowledge: level.expected_knowledge,
          expected_execution: level.expected_execution,
          autonomy_descriptor: level.autonomy_descriptor,
          complexity_descriptor: level.complexity_descriptor,
          quality_descriptor: level.quality_descriptor,
          collaboration_descriptor: level.collaboration_descriptor,
          observable_behaviors: level.observable_behaviors,
          positive_examples: level.positive_examples,
          negative_examples: level.negative_examples,
          evidence_guidance: level.evidence_guidance,
          ceiling_guidance: level.ceiling_guidance,
          framework_descriptor: buildProficiencyFrameworkDescriptor(level),
        })),
        created_at: scale.created_at.toISO(),
        updated_at: scale.updated_at.toISO(),
      }),
    }
  }
}
