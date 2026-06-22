import type { HttpContext } from '@adonisjs/core/http'

import { TaskRequirementVersionService } from '#modules/tasks/actions/services/task_requirement_version_service'

export default class ListTaskRequirementVersionsController {
  async handle({ params, response }: HttpContext) {
    const taskId = String(params.taskId)

    try {
      const versions = await TaskRequirementVersionService.listVersions(taskId)
      const diffs = await Promise.all(
        versions.map(async (version, index) => {
          const previous = versions[index - 1]
          if (!previous) {
            return {
              versionId: version.id,
              addedSkills: version.items.map((item) => item.skill_id),
              removedSkills: [],
              modifiedSkills: [],
            }
          }

          const diff = await TaskRequirementVersionService.diffVersions(previous.id, version.id)
          return { versionId: version.id, ...diff }
        })
      )
      const diffByVersion = new Map(diffs.map((diff) => [diff.versionId, diff]))

      response.ok({
        data: versions.map((version) => {
          const diff = diffByVersion.get(version.id)

          return {
            id: version.id,
            task_id: version.task_id,
            version_number: version.version_number,
            reason: version.reason,
            created_by: version.created_by,
            created_at: version.created_at.toISO(),
            professional_role_snapshot: version.professional_role_snapshot,
            items_count: version.items.length,
            diff: {
              added_skill_ids: diff?.addedSkills ?? [],
              removed_skill_ids: diff?.removedSkills ?? [],
              modified_skill_ids: diff?.modifiedSkills ?? [],
            },
          }
        }),
      }); return;
    } catch (err) {
      response.internalServerError({
        message: 'Failed to fetch requirement versions',
        error: String(err),
      }); return;
    }
  }
}
