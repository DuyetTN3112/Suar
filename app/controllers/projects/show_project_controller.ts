import type { HttpContext } from '@adonisjs/core/http'
import GetProjectDetailQuery from '#actions/projects/queries/get_project_detail_query'

/**
 * GET /projects/:id → Show project detail
 */
export default class ShowProjectController {
  async handle(ctx: HttpContext) {
    const { params, inertia } = ctx
    const query = new GetProjectDetailQuery(ctx)
    const projectId = params.id as string
    const result = await query.handle({ projectId })

    return await inertia.render('projects/show', result)
  }
}
