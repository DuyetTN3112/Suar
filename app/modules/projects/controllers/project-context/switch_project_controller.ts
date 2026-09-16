import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'
import { buildProjectContextSwitchRequest } from '#modules/projects/controllers/mappers/request/project-context/project_context_switch_request_mapper'

@inject()
export default class SwitchProjectController {
  constructor(private readonly queries: ProjectQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { request, session } = ctx
    const { projectId, currentPath } = buildProjectContextSwitchRequest(request)

    const currentOrgId = requireCurrentOrganizationId(ctx)
    const userId = actionContextFromHttp(ctx).userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const project = await this.queries
      .makeSwitchTarget(actionContextFromHttp(ctx))
      .executeAndWrap({ projectId, organizationId: currentOrgId, userId })
      .then((outcome) => outcome.getValue())

    session.put('current_project_id', projectId)
    await session.commit()

    return {
      data: {
        message: `Đã chuyển sang dự án "${project.name}"`,
        redirect: this.resolveRedirectPath(currentPath, projectId),
        project: {
          id: projectId,
          name: project.name,
        },
      },
    }
  }

  private resolveRedirectPath(currentPath: string | undefined, projectId: string): string {
    const fallback = `/projects/${encodeURIComponent(projectId)}/tasks`
    if (!currentPath || !currentPath.startsWith('/') || currentPath.startsWith('//')) {
      return fallback
    }

    const match = currentPath.match(/^\/projects\/[^/?]+(?=\/|\?|$)/)
    if (!match) {
      return fallback
    }

    return currentPath.replace(match[0], `/projects/${encodeURIComponent(projectId)}`)
  }
}
