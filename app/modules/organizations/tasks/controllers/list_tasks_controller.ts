import type { HttpContext } from '@adonisjs/core/http'

/**
 * Compatibility redirect for the retired organization task surfaces.
 * Task operations now live in the shared project workspace board.
 */
export default class ListTasksController {
  handle(ctx: HttpContext) {
    const requestedProjectId: unknown = ctx.request.input('project_id')
    const projectId =
      (typeof requestedProjectId === 'string' && requestedProjectId.length > 0
        ? requestedProjectId
        : (ctx.session.get('current_project_id') as string | undefined)) ?? null

    if (!projectId) {
      return ctx.response.redirect('/org/projects')
    }

    return ctx.response.redirect(`/projects/${encodeURIComponent(projectId)}/tasks`)
  }
}
