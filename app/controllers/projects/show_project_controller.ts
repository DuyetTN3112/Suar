import type { HttpContext } from '@adonisjs/core/http'
import GetProjectDetailQuery from '#actions/projects/queries/get_project_detail_query.js'

/**
 * GET /projects/:id → Show project detail
 */
export default class ShowProjectController {
  async handle(ctx: HttpContext) {
    const { params, inertia, response, session } = ctx
    try {
      const query = new GetProjectDetailQuery(ctx)
      const projectId = params.id as string
      const result = await query.handle({ projectId })

      return await inertia.render('projects/show', result)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể tìm thấy dự án'
      session.flash('error', errorMessage)
      response.redirect().toRoute('projects.index')
      return
    }
  }
}
