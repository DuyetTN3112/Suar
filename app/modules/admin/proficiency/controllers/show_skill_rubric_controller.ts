import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminProficiencyActionFactory } from '#modules/admin/proficiency/actions/ports/inbound/admin_proficiency_action_factory'
import { mapSkillRubricLevel } from '#modules/admin/proficiency/controllers/mappers/response/proficiency_view_model_mapper'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

@inject()
export default class ShowSkillRubricController {
  constructor(private readonly actions: AdminProficiencyActionFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, params } = ctx

    const skillId = String(params['skillId'])

    const { skill, version } = await this.actions
      .makeGetSkillRubricQuery(actionContextFromHttp(ctx))
      .handle({ skillId })

    return inertia.render('admin/proficiency/rubric', {
      skill: {
        id: skill.id,
        skillName: skill.skill_name,
        skillCode: skill.skill_code,
        categoryCode: skill.category_code,
        description: skill.description,
      },
      rubric: {
        id: version.id,
        version: version.version,
        status: version.status,
        effectiveFrom: version.effective_from?.toISO() ?? null,
        effectiveTo: version.effective_to?.toISO() ?? null,
        changeSummary: version.change_summary,
        levels: version.levels.map((lvl) => mapSkillRubricLevel(lvl)),
        createdAt: version.created_at.toISO(),
        updatedAt: version.updated_at.toISO(),
      },
    })
  }
}
