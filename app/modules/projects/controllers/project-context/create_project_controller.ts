import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'

/**
 * GET /projects/create → Show create project form
 */
@inject()
export default class CreateProjectController {
  constructor(private readonly queries: ProjectQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    const pageData = await this.queries
      .makeCreatePage(actionContextFromHttp(ctx))
      .executeAndWrap()
      .then((outcome) => outcome.getValue())

    return inertia.render('projects/create', pageData)
  }
}
