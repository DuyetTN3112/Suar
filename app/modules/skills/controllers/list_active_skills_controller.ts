import type { HttpContext } from '@adonisjs/core/http'

import SkillRepository from '#modules/skills/infra/repositories/skill_repository'

export default class ListActiveSkillsController {
  async handle({ response }: HttpContext) {
    const skills = await SkillRepository.activeSkillsWithPublishedRubrics()

    response.ok({
      data: skills.map((s) => ({
        id: s.id,
        skill_code: s.skill_code,
        skill_name: s.skill_name,
        category_code: s.category_code,
        display_type: s.display_type,
        description: s.description,
        published_rubric_version_id: s.rubric_versions[0]?.id ?? null,
      })),
    })
  }
}
