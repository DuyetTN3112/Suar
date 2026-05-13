import type { HttpContext } from '@adonisjs/core/http'

import SwitchOrganizationCommand from '#actions/organizations/commands/switch_organization_command'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#modules/errors/constants/error_constants'
import { ExecutionContext } from '#types/execution_context'

/**
 * Controller for switching between organizations
 *
 * CQRS Pattern: Uses SwitchOrganizationCommand
 */
export default class SwitchOrganizationController {
  async handle(ctx: HttpContext) {
    const { request, response, session, inertia } = ctx

    const requestData = request.only(['organization_id', 'current_path']) as {
      organization_id?: string | number
      current_path?: string
    }

    if (!requestData.organization_id) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const orgId = String(requestData.organization_id)
    const result = await new SwitchOrganizationCommand(ExecutionContext.fromHttp(ctx)).execute(
      orgId
    )
    session.put('current_organization_id', orgId)
    const successMessage = `Đã chuyển sang tổ chức "${result.organization.name}"`

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({
        success: true,
        message: successMessage,
        redirect: result.redirectPath,
        organization: result.organization,
      })
      return
    }

    session.flash('success', successMessage)
    inertia.location(result.redirectPath)
  }
}
