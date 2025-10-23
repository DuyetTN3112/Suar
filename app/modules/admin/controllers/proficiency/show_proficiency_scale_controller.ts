import type { HttpContext } from '@adonisjs/core/http'

import { mapProficiencyScale } from '#modules/admin/controllers/proficiency/support/proficiency_view_model'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'

export default class ShowProficiencyScaleController {
  async handle(ctx: HttpContext) {
    const { inertia, params } = ctx

    const scale = await skillPublicApi.getActiveScale()

    if (!scale || scale.id !== params['proficiencyScaleId']) {
      throw new NotFoundException('Proficiency scale not found')
    }

    return inertia.render('admin/proficiency/show', {
      scale: mapProficiencyScale(scale),
    })
  }
}
