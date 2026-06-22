import type { HttpContext } from '@adonisjs/core/http'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { SkillRubricService } from '#modules/skills/actions/services/skill_rubric_service'

export default class ShowSkillRubricController {
  async handle({ params, response }: HttpContext) {
    const skillId = String(params.skillId)

    const skill = await SkillRubricService.resolveSkill(skillId)
    if (skill?.is_active !== true) {
      throw new NotFoundException('Skill not found')
    }

    const version = await SkillRubricService.getPublishedVersion(skillId)

    if (!version) {
      throw new NotFoundException('No published rubric found for this skill')
    }

    response.ok({
      data: {
        id: version.id,
        skill_id: version.skill_id,
        version: version.version,
        status: version.status,
        effective_from: version.effective_from?.toISO() ?? null,
        effective_to: version.effective_to?.toISO() ?? null,
        created_by: version.created_by,
        change_summary: version.change_summary,
        levels: version.levels.map((lvl) => ({
          id: lvl.id,
          proficiency_level: {
            id: lvl.level.id,
            ordinal: lvl.level.ordinal,
            code: lvl.level.code,
            display_name: lvl.level.display_name,
          },
          summary: lvl.summary,
          knowledge_expectations: lvl.knowledge_expectations,
          observable_behaviors: lvl.observable_behaviors,
          independence_expectations: lvl.independence_expectations,
          complexity_expectations: lvl.complexity_expectations,
          impact_scope_expectations: lvl.impact_scope_expectations,
          positive_examples: lvl.positive_examples,
          negative_examples: lvl.negative_examples,
          evidence_guidance: lvl.evidence_guidance,
        })),
        created_at: version.created_at.toISO(),
        updated_at: version.updated_at.toISO(),
      },
    })
  }
}
