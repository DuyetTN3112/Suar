import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminProficiencyActionFactory } from '#modules/admin/proficiency/actions/ports/inbound/admin_proficiency_action_factory'
import { mapProficiencyScale } from '#modules/admin/proficiency/controllers/mappers/response/proficiency/proficiency_view_model_mapper'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'


@inject()
export default class ShowProficiencyScaleController {
  constructor(private readonly actions: AdminProficiencyActionFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, params } = ctx

    const scale = await this.actions
      .makeGetProficiencyScaleQuery(actionContextFromHttp(ctx))
      .handle({ proficiencyScaleId: String(params['proficiencyScaleId']) })

    return inertia.render('admin/proficiency/show', {
      scale: mapProficiencyScale(scale),
    })
  }
}
