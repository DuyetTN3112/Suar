import type { HttpContext } from '@adonisjs/core/http'

import { checkProjectPermission } from './project_auth_helper.js'

import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'

export default class ListProjectSkillsController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const projectId = params.projectId as string

    await checkProjectPermission(ctx, projectId, false)

    const skills = await ProjectSkillService.getProjectSkills(projectId)

    response.ok({
      data: skills.map((ps) => ({
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
      })),
    });
  }
}
