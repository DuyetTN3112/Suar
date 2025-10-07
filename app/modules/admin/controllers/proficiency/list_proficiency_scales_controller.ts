import type { HttpContext } from '@adonisjs/core/http'

import { mapProficiencyScale } from '#modules/admin/controllers/proficiency/support/proficiency_view_model'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'

export default class ListProficiencyScalesController {
  async handle(ctx: HttpContext) {
    const { inertia } = ctx

    const scale = await skillPublicApi.getActiveScale()

    return inertia.render('admin/proficiency/index', {
      scale: scale ? mapProficiencyScale(scale) : null,
    })
  }
}
