import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import { throwHttpBoundaryError } from '#modules/http/boundary/http_boundary_errors'
import ListTaskRequirementVersionsQuery from '#modules/tasks/actions/queries/list_task_requirement_versions_query'

@inject()
export default class ListTaskRequirementVersionsController {
  constructor(
    private readonly listTaskRequirementVersions: ListTaskRequirementVersionsQuery
  ) {}

  async handle({ params }: HttpContext) {
    const taskId = String(params['taskId'])

    try {
      const versions = await this.listTaskRequirementVersions.execute(taskId)

      return {
        data: camelizeResponseValue(
          versions.map(({ version, diff }) => {
            return {
              id: version.id,
              task_id: version.task_id,
              version_number: version.version_number,
              reason: version.reason,
              created_by: version.created_by,
              created_at: version.created_at,
              professional_role_snapshot: version.professional_role_snapshot,
              items_count: version.items.length,
              diff: {
                added_skill_ids: diff.addedSkills,
                removed_skill_ids: diff.removedSkills,
                modified_skill_ids: diff.modifiedSkills,
              },
            }
          })
        ),
      }
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }
}
