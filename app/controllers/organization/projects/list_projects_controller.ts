import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ListProjectsQuery from '#actions/organization/projects/queries/list_projects_query'
import { PAGINATION } from '#constants/common_constants'

/**
 * ListProjectsController
 *
 * Show org projects
 *
 * GET /org/projects
 */
export default class ListProjectsController {
  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)

    const toPageNumber = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(1, Math.trunc(value))
      }
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1
      }
      return 1
    }

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    // Parse query params
    const page = toPageNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown)
    const search = toOptionalString(request.input('search') as unknown)
    const status = toOptionalString(request.input('status') as unknown)

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
