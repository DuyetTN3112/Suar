import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetProjectCreatePageQuery from '#modules/projects/actions/queries/get_project_create_page_query'

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

    const pageData = await new GetProjectCreatePageQuery(actionContextFromHttp(ctx)).execute()

    return inertia.render('projects/create', pageData)
  }
}
