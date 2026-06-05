import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondByTransport } from '#modules/http/boundary/http_transport_response'
import { OrganizationSwitchCommandFactory } from '#modules/organizations/actions/ports/inbound/access/organization_switch_command_factory'
import { buildOrganizationContextSwitchRequest } from '#modules/organizations/controllers/mappers/request/access/organization_context_switch_request_mapper'

/**
 * Controller for switching between organizations
 *
 * CQRS Pattern: Uses SwitchOrganizationCommand
 */
@inject()
export default class SwitchOrganizationController {
  constructor(private readonly actions: OrganizationSwitchCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request, session, inertia } = ctx

    const { organizationId: orgId, currentPath } = buildOrganizationContextSwitchRequest(request)
    const result = await this.actions
      .make(actionContextFromHttp(ctx))
      .executeAndWrap(orgId)
      .then((outcome) => outcome.getValue())
    session.put('current_organization_id', orgId)
    session.forget('current_project_id')
    await session.commit()
    const successMessage = `Đã chuyển sang tổ chức "${result.organization.name}"`

    const safeRedirectPath = this.resolveRedirectPath(currentPath, result.redirectPath)

    return respondByTransport(ctx, {
      api: () => {
        return {
          data: {
            message: successMessage,
            redirect: safeRedirectPath,
            organization: result.organization,
          },
        }
      },
      page: () => {
        session.flash('success', successMessage)
        return inertia.location(safeRedirectPath)
      },
    })
  }

  private resolveRedirectPath(currentPath: string | undefined, fallbackPath: string): string {
    if (!currentPath || !currentPath.startsWith('/') || currentPath.startsWith('//')) {
      return fallbackPath
    }

    const currentIsAdmin = currentPath.startsWith('/org')
    const targetIsAdmin = fallbackPath === '/org'

    if (currentIsAdmin !== targetIsAdmin) {
      return fallbackPath
    }

    if (currentPath.startsWith('/organizations') || currentPath.startsWith('/projects/')) {
      return fallbackPath
    }

    return currentPath
  }
}
