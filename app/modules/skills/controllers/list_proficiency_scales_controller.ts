import type { HttpContext } from '@adonisjs/core/http'

import { ProficiencyScaleService } from '#modules/skills/actions/services/proficiency_scale_service'

export default class ListProficiencyScalesController {
  async handle({ response }: HttpContext) {
    const scale = await ProficiencyScaleService.getActiveScale()

    if (!scale) {
      response.ok({ data: [] }); return;
    }

    response.ok({
      data: {
        id: scale.id,
        code: scale.code,
        name: scale.name,
        version: scale.version,
        is_active: scale.is_active,
        effective_from: scale.effective_from?.toISODate() ?? null,
        effective_to: scale.effective_to?.toISODate() ?? null,
        levels: scale.levels.map((level) => ({
          id: level.id,
          ordinal: level.ordinal,
          code: level.code,
          display_name: level.display_name,
          short_name: level.short_name,
          normalized_value: level.normalized_value,
          generic_description: level.generic_description,
          sort_order: level.sort_order,
        })),
        created_at: scale.created_at.toISO(),
        updated_at: scale.updated_at.toISO(),
      },
    });
  }
}
