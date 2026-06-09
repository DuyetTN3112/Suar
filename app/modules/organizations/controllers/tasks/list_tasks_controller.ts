import type { HttpContext } from '@adonisjs/core/http'

import { buildTaskRedirectRequest } from '#modules/organizations/controllers/mappers/request/tasks/task_redirect_request_mapper'

/**
 * Compatibility redirect for the retired organization task surfaces.
 * Task operations now live in the shared project workspace board.
 */
export default class ListTasksController {
  handle(ctx: HttpContext) {
    const { projectId } = buildTaskRedirectRequest(ctx.request, ctx.session.get('current_project_id'))

    if (!projectId) {
      return ctx.response.redirect('/org/projects')
    }

    return ctx.response.redirect(`/projects/${encodeURIComponent(projectId)}/tasks`)
  }
}
