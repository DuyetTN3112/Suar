import type { HttpContext } from '@adonisjs/core/http'

import { mapSkillRubricLevel } from '#modules/admin/controllers/proficiency/support/proficiency_view_model'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'

export default class ShowSkillRubricController {
  async handle(ctx: HttpContext) {
    const { inertia, params } = ctx

    const skillId = String(params['skillId'])

    const skill = await skillPublicApi.resolveSkill(skillId)
    if (!skill?.is_active) {
      throw new NotFoundException('Skill not found')
    }

    const version = await skillPublicApi.getPublishedSkillRubricVersion(skill.id)

    if (!version) {
      throw new NotFoundException('No published rubric found for this skill')
    }

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
