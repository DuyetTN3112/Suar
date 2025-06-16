import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ListProjectsQuery from '#actions/organization/projects/queries/list_projects_query'

/**
 * ListProjectsController
 *
 * Show org projects
 *
 * GET /org/projects
 */
export default class ListProjectsController {
  async handle({ inertia, request }: HttpContext) {
    const execCtx = ExecutionContext.fromHttp({ request } as any)

    // Parse query params
    const page = request.input('page', 1)
    const search = request.input('search')
    const status = request.input('status')

    // Execute query
    const query = new ListProjectsQuery(execCtx)
    const result = await query.handle({
      page,
      search,
      status,
    })

    return inertia.render('org/projects/index', result)
  }
}
