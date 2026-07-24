import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { camelizeResponseValue } from '../mappers/response/skill-catalog/camelize_response.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SkillProjectActionFactory } from '#modules/skills/actions/ports/inbound/skill_project_action_factory'

@inject()
export default class ListProjectSkillsController {
  constructor(private readonly actions: SkillProjectActionFactory) {}

  async handle(ctx: HttpContext) {
    const skills = await this.actions
      .makeListSkills(actionContextFromHttp(ctx))
      .executeAndWrap(String(ctx.params['projectId']))
      .then((outcome) => outcome.getValue())

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
          minimum_task_requirement_level_id: ps.minimum_task_requirement_level_id,
          maximum_task_requirement_level_id: ps.maximum_task_requirement_level_id,
          is_active: ps.is_active,
          is_selectable_for_tasks: ps.is_selectable_for_tasks,
        }))
      ),
    }
  }
}
