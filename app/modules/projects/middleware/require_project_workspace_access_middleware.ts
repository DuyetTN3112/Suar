import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { requireCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'
import { ProjectWorkspaceAccessReader } from '#modules/projects/actions/ports/outbound/project_workspace_access_reader'

@inject()
export default class RequireProjectWorkspaceAccessMiddleware {
  constructor(private readonly workspaceAccess: ProjectWorkspaceAccessReader) {}

  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    const user = ctx.auth.user
    if (!user) {
      throw new ForbiddenException('Bạn phải đăng nhập để truy cập không gian dự án')
    }

    const projectId =
      (ctx.params['projectId'] as string | undefined) ??
      (ctx.request.input('projectId') as string | undefined) ??
      (ctx.request.input('project_id') as string | undefined)

    // Let the target controller retain validation ownership for requests that
    // do not identify a project, such as an invalid switch payload.
    if (!projectId) {
      await next()
      return
    }

    const allowed = await this.workspaceAccess.canEnter({
      organizationId: requireCurrentOrganizationId(ctx),
      projectId,
      userId: user.id,
    })

    if (!allowed) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập không gian dự án dùng chung'
      )
    }

    await next()
  }
}
