import type { HttpContext } from '@adonisjs/core/http'

import GetProjectCreatePageQuery from '#actions/projects/queries/get_project_create_page_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /projects/create → Show create project form
 */
export default class CreateProjectController {
  async handle(ctx: HttpContext) {
    const { inertia, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    const pageData = await new GetProjectCreatePageQuery(ExecutionContext.fromHttp(ctx)).execute()

    return inertia.render('projects/create', pageData)
  }
}
