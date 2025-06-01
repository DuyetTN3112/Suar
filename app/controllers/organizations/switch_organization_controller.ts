import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetOrganizationBasicInfoQuery from '#actions/organizations/queries/get_organization_basic_info_query'
import SwitchOrganizationCommand from '#actions/organizations/commands/switch_organization_command'
import loggerService from '#services/logger_service'
import { InertiaPages } from '#constants'
import { HttpStatus, ErrorMessages } from '#constants/error_constants'

/**
 * Controller for switching between organizations
 *
 * CQRS Pattern: Uses SwitchOrganizationCommand
 */
export default class SwitchOrganizationController {
  /**
   * Switch to a different organization
   */
  async handle(ctx: HttpContext) {
    const { request, response, session, inertia } = ctx

    const switchOrganization = new SwitchOrganizationCommand(ExecutionContext.fromHttp(ctx))
    try {
      const requestData = request.only(['organization_id', 'current_path']) as {
        organization_id?: string | number
        current_path?: string
      }
      const organizationId = requestData.organization_id
      const currentPath = requestData.current_path

      if (!organizationId) {
        const errorMessage = 'Thiếu ID tổ chức'

        if (request.accepts(['html', 'json']) === 'json') {
          response.status(HttpStatus.BAD_REQUEST).json({ success: false, message: errorMessage })
          return
        }

        return await inertia.render(InertiaPages.ERROR_NOT_FOUND, { message: errorMessage })
      }

      const orgId = String(organizationId)

      // Validate organization exists — delegate to Query
      const organization = await GetOrganizationBasicInfoQuery.execute(orgId)

      if (!organization) {
        const errorMessage = ErrorMessages.ORGANIZATION_NOT_FOUND

        if (request.accepts(['html', 'json']) === 'json') {
          response.status(HttpStatus.NOT_FOUND).json({ success: false, message: errorMessage })
          return
        }

        return await inertia.render(InertiaPages.ERROR_NOT_FOUND, { message: errorMessage })
      }

      // Execute command (validates membership inside)
      await switchOrganization.execute(orgId)

      // Update session
      session.forget('current_organization_id')
      await session.commit()
      session.put('current_organization_id', orgId)
      await session.commit()

      // Respond
      const redirectPath = currentPath ?? '/tasks'
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
      await inertia.location(redirectPath)
      return
    } catch (error: unknown) {
      loggerService.error('[SwitchOrganizationController.handle] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi chuyển đổi tổ chức'

      if (request.accepts(['html', 'json']) === 'json') {
        response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      return await inertia.render(InertiaPages.ERROR_SERVER_ERROR, { message: errorMessage })
    }
  }
}
