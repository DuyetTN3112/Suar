import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminProficiencyActionFactory } from '#modules/admin/proficiency/actions/ports/inbound/admin_proficiency_action_factory'
import { mapProficiencyScale } from '#modules/admin/proficiency/controllers/mappers/response/proficiency/proficiency_view_model_mapper'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'


@inject()
export default class ListProficiencyScalesController {
  constructor(private readonly actions: AdminProficiencyActionFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia } = ctx

    const { scale, skills } = await this.actions
      .makeListProficiencyCatalogQuery(actionContextFromHttp(ctx))
      .handle()

    return inertia.render('admin/proficiency/index', {
      scale: scale ? mapProficiencyScale(scale) : null,
      skills: skills.map((skill) => ({
        id: skill.id,
        skillName: skill.skill_name,
        skillCode: skill['skill_code'],
        categoryCode: skill.category_code,
      })),
    })
  }
}
