import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { camelizeResponseValue } from './mappers/response/camelize_response.js'
import { SkillProjectAccessGuard } from './project_access_guard.js'

import ListProjectSkillsQuery from '#modules/skills/actions/queries/list_project_skills_query'

@inject()
export default class ListProjectSkillsController {
  constructor(
    private readonly projectAccess: SkillProjectAccessGuard,
    private readonly listProjectSkills: ListProjectSkillsQuery
  ) {}

  async handle(ctx: HttpContext) {
    const { params } = ctx
    const projectId = params['projectId'] as string

    await this.projectAccess.requireUserId(ctx, projectId, false)

    const skills = await this.listProjectSkills.execute(projectId)

    return {
      data: camelizeResponseValue(
        skills.map((ps) => ({
          id: ps.id,
          project_id: ps.project_id,
          skill: {
            id: ps.skill.id,
            skill_code: ps.skill.skill_code,
            skill_name: ps.skill.skill_name,
            category_code: ps.skill.category_code,
            display_type: ps.skill.display_type,
          },
          display_name_override: ps.display_name_override,
          description_override: ps.description_override,
          rubric_version_id: ps.rubric_version_id,
          is_active: ps.is_active,
          is_selectable_for_tasks: ps.is_selectable_for_tasks,
        }))
      ),
    }
  }
}
