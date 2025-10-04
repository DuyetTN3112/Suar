import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { respondByTransport } from '#modules/http/boundary/http_transport_response'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import SwitchOrganizationCommand from '#modules/organizations/actions/commands/switch_organization_command'

/**
 * Controller for switching between organizations
 *
 * CQRS Pattern: Uses SwitchOrganizationCommand
 */
export default class SwitchOrganizationController {
  async handle(ctx: HttpContext) {
    const { request, session, inertia } = ctx

    const organizationIdInput =
      (request.input('organizationId') as string | number | undefined) ??
      (request.input('organization_id') as string | number | undefined)
    const currentPath =
      (request.input('currentPath') as string | undefined) ??
      (request.input('current_path') as string | undefined)

    if (!organizationIdInput) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const orgId = String(organizationIdInput)
    const result = await new SwitchOrganizationCommand(actionContextFromHttp(ctx)).execute(
      orgId
    )
    session.put('current_organization_id', orgId)
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

    if (currentPath.startsWith('/organizations')) {
      return fallbackPath
    }

    return currentPath
  }
}
