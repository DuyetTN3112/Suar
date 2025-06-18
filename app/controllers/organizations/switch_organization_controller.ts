import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetOrganizationBasicInfoQuery from '#actions/organizations/queries/get_organization_basic_info_query'
import SwitchOrganizationCommand from '#actions/organizations/commands/switch_organization_command'
import BusinessLogicException from '#exceptions/business_logic_exception'

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
      throw new BusinessLogicException('Thiếu ID tổ chức')
    }

    const orgId = String(requestData.organization_id)
    const organization = await GetOrganizationBasicInfoQuery.executeOrFail(orgId)

    await new SwitchOrganizationCommand(ExecutionContext.fromHttp(ctx)).execute(orgId)
    session.put('current_organization_id', orgId)

    const redirectPath = requestData.current_path ?? '/tasks'
    const successMessage = `Đã chuyển sang tổ chức "${organization.name}"`

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({
        success: true,
        message: successMessage,
        redirect: redirectPath,
        organization,
      })
      return
    }

    session.flash('success', successMessage)
    inertia.location(redirectPath)
  }
}
